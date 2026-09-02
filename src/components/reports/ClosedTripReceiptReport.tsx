import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, RefreshCw, Search, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { inr } from "@/lib/trip-calc";
import { useReportFilters } from "@/lib/report-filters";
import { useSession } from "@/lib/session";
import { isAdminLike } from "@/lib/roles";
import { downloadCsv, toCsv } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Kind = "freight_loading" | "approval";
type Candidate = {
  closedTripId: string;
  sourceKey: string;
  tripCode: string;
  branchId: string | null;
  detail: string;
  freight: number;
  loading: number;
  amount: number;
  received: boolean;
  receivedDate: string | null;
};
const n = (v: unknown) => Number(v ?? 0) || 0;
const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
const dateInput = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const initialRange = () => {
  const now = new Date();
  return {
    month: dateInput(now).slice(0, 7),
    start: dateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: dateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

export function ClosedTripReceiptReport({ kind }: { kind: Kind }) {
  const { branchId } = useReportFilters();
  const { user } = useSession();
  const canEdit = isAdminLike(user?.role);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const defaults = initialRange();
  const [month, setMonth] = useState(defaults.month);
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const table =
    kind === "freight_loading" ? "freight_loading_receipts" : "approval_charge_receipts";

  async function load() {
    setLoading(true);
    try {
      let closedQuery = supabase
        .from("closed_trips")
        .select("id,trip_code,branch_id,snapshot")
        .gte("end_date", startDate)
        .lte("end_date", endDate)
        .order("end_date", { ascending: false });
      if (branchId !== "all") closedQuery = closedQuery.eq("branch_id", branchId);
      const [closed, saved] = await Promise.all([
        fetchAll<any>(() => closedQuery),
        fetchAll<any>(() => {
          let q = supabase.from(table as any).select("*") as any;
          if (branchId !== "all") q = q.eq("branch_id", branchId);
          return q;
        }),
      ]);
      const savedByKey = new Map(saved.map((r: any) => [`${r.closed_trip_id}:${r.source_key}`, r]));
      const candidates: Candidate[] = [];
      for (const trip of closed) {
        const snap = trip.snapshot && typeof trip.snapshot === "object" ? trip.snapshot : {};
        if (kind === "freight_loading") {
          const lines = Array.isArray(snap.manifest_lines) ? snap.manifest_lines : [];
          lines.forEach((line: any, index: number) => {
            const freight = n(line.freight),
              loading = n(line.loading);
            if (freight <= 0 && loading <= 0) return;
            const manifest = line.manifest ?? {};
            const sourceKey = String(manifest.id ?? index);
            const old = savedByKey.get(`${trip.id}:${sourceKey}`);
            candidates.push({
              closedTripId: trip.id,
              sourceKey,
              tripCode: trip.trip_code,
              branchId: trip.branch_id,
              detail: String(manifest.manifest_number ?? `Manifest ${index + 1}`),
              freight,
              loading,
              amount: freight + loading,
              received: Boolean(old?.is_received),
              receivedDate: old?.received_date ?? null,
            });
          });
        } else {
          const incomes = Array.isArray(snap.other_income) ? snap.other_income : [];
          incomes.forEach((income: any, index: number) => {
            if (norm(income.income_name) !== "approval charge" || n(income.amount) <= 0) return;
            const sourceKey = String(income.id ?? index);
            const old = savedByKey.get(`${trip.id}:${sourceKey}`);
            candidates.push({
              closedTripId: trip.id,
              sourceKey,
              tripCode: trip.trip_code,
              branchId: trip.branch_id,
              detail: income.note || "Approval Charge",
              freight: 0,
              loading: 0,
              amount: n(income.amount),
              received: Boolean(old?.is_received),
              receivedDate: old?.received_date ?? null,
            });
          });
        }
      }
      setRows(candidates);
    } catch (error) {
      toast.error(
        `Could not load receipts: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [kind, branchId, startDate, endDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = useMemo(
    () =>
      rows.filter((r) => `${r.tripCode} ${r.detail}`.toLowerCase().includes(search.toLowerCase())),
    [rows, search],
  );

  async function setReceived(row: Candidate, received: boolean) {
    if (!canEdit) return;
    const today = new Date().toISOString().slice(0, 10);
    const base = {
      closed_trip_id: row.closedTripId,
      source_key: row.sourceKey,
      trip_code: row.tripCode,
      branch_id: row.branchId,
      is_received: received,
      received_date: received ? today : null,
    };
    const payload =
      kind === "freight_loading"
        ? {
            ...base,
            manifest_number: row.detail,
            freight_amount: row.freight,
            loading_amount: row.loading,
          }
        : { ...base, income_name: "Approval Charge", amount: row.amount };
    const { error } = await supabase
      .from(table as any)
      .upsert(payload as any, { onConflict: "closed_trip_id,source_key" });
    if (error) return toast.error(error.message);
    toast.success(received ? "Marked received" : "Marked not received");
    await load();
  }

  function changeMonth(value: string) {
    setMonth(value);
    if (!value) return;
    const [year, monthNumber] = value.split("-").map(Number);
    setStartDate(`${value}-01`);
    setEndDate(dateInput(new Date(year, monthNumber, 0)));
  }

  function exportRows() {
    const data = visible.map((row) => ({
      Trip: row.tripCode,
      [kind === "freight_loading" ? "Manifest" : "Income"]: row.detail,
      ...(kind === "freight_loading" ? { Freight: row.freight, Loading: row.loading } : {}),
      Total: row.amount,
      Status: row.received ? "Received" : "Not received",
      "Received Date": row.receivedDate ?? "",
    }));
    const columns = [
      "Trip",
      kind === "freight_loading" ? "Manifest" : "Income",
      ...(kind === "freight_loading" ? ["Freight", "Loading"] : []),
      "Total",
      "Status",
      "Received Date",
    ];
    downloadCsv(toCsv(data, columns), `${kind}-${startDate}-to-${endDate}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-3">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="h-9 pl-9"
            placeholder="Search trip or manifest…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          aria-label="Month"
          className="h-9 w-40"
          type="month"
          value={month}
          onChange={(event) => changeMonth(event.target.value)}
        />
        <Input
          aria-label="Start date"
          className="h-9 w-40"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
        <Input
          aria-label="End date"
          className="h-9 w-40"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
        <Button className="h-9 gap-2" variant="outline" onClick={exportRows}>
          <Download className="size-4" /> Export
        </Button>
        <Button className="ml-auto h-9" variant="ghost" onClick={load}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3 text-left">Trip</th>
              <th className="px-4 py-3 text-left">
                {kind === "freight_loading" ? "Manifest" : "Income"}
              </th>
              {kind === "freight_loading" && (
                <>
                  <th className="px-4 py-3 text-right">Freight</th>
                  <th className="px-4 py-3 text-right">Loading</th>
                </>
              )}
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground">
                  {loading ? "Loading…" : "No closed-trip charges found."}
                </td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={`${row.closedTripId}:${row.sourceKey}`}>
                  <td className="px-4 py-3 font-medium">{row.tripCode}</td>
                  <td className="px-4 py-3">{row.detail}</td>
                  {kind === "freight_loading" && (
                    <>
                      <td className="px-4 py-3 text-right">{inr(row.freight)}</td>
                      <td className="px-4 py-3 text-right">{inr(row.loading)}</td>
                    </>
                  )}
                  <td className="px-4 py-3 text-right font-semibold">{inr(row.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    {row.received ? (
                      <span className="text-emerald-600">Received {row.receivedDate}</span>
                    ) : (
                      <span className="text-amber-600">Not received</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant={row.received ? "outline" : "default"}
                        onClick={() => setReceived(row, !row.received)}
                      >
                        {row.received ? (
                          <>
                            <Undo2 className="mr-1 size-3" />
                            Undo
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-1 size-3" />
                            Received
                          </>
                        )}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState, Fragment } from "react";
import { ChevronDown, ChevronRight, Download, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/trip-calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv, toCsv } from "@/lib/csv";

interface ApprovalRow {
  transporter_id: string;
  transporter_name: string;
  total_advance: number;
  total_balance: number;
  trip_count: number;
}

interface ApprovalLog {
  id: string;
  trip_id: string;
  created_at: string;
  advance: number;
  balance: number;
}

function formatDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function currentMonthRange() {
  const now = new Date();
  return {
    start: formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function nextDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return formatDateInput(d);
}

export function ApprovalChargeAdvanceReport() {
  const defaults = currentMonthRange();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<ApprovalLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  function range() {
    return { start: startDate, endExclusive: nextDate(endDate) };
  }

  async function loadData() {
    setLoading(true);
    try {
      const { start, endExclusive } = range();
      const transporters = await fetchAll<Record<string, unknown>>(() =>
        supabase.from("transporters").select("id,transporter_name").order("transporter_name"),
      );
      const logs = await fetchAll<Record<string, unknown>>(() =>
        supabase
          .from("approval_charge_advances" as never)
          .select("transporter_id,advance,balance,created_at")
          .gte("created_at", start)
          .lt("created_at", endExclusive),
      );

      const agg: Record<string, { advance: number; balance: number; trips: number }> = {};
      transporters.forEach((t: Record<string, unknown>) => {
        agg[String(t.id)] = { advance: 0, balance: 0, trips: 0 };
      });
      logs.forEach((l: Record<string, unknown>) => {
        if (!l.transporter_id || !agg[l.transporter_id]) return;
        agg[l.transporter_id].advance += Number(l.advance ?? 0);
        agg[l.transporter_id].balance += Number(l.balance ?? 0);
        agg[l.transporter_id].trips += 1;
      });

      setRows(
        transporters.map((t: Record<string, unknown>) => ({
          transporter_id: String(t.id),
          transporter_name: String(t.transporter_name ?? "—"),
          total_advance: agg[String(t.id)].advance,
          total_balance: agg[String(t.id)].balance,
          trip_count: agg[String(t.id)].trips,
        })),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to load approval advance report: " + message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(transporterId: string) {
    setLoadingHistory(true);
    setSelectedId(transporterId);
    try {
      const { start, endExclusive } = range();
      const { data, error } = await supabase
        .from("approval_charge_advances" as never)
        .select("*")
        .eq("transporter_id", transporterId)
        .gte("created_at", start)
        .lt("created_at", endExclusive)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setHistory((data as unknown as ApprovalLog[]) ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      toast.error("Failed to load history: " + message);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter((r) => (r.transporter_name ?? "").toLowerCase().includes(s));
  }, [rows, search]);
  const visible = filtered.filter((r) => r.trip_count > 0);

  function handleExport() {
    const csv = toCsv(
      visible.map((r) => ({
        Transporter: r.transporter_name,
        Trips: r.trip_count,
        "Advance (₹)": r.total_advance,
        "Balance (₹)": r.total_balance,
      })),
      ["Transporter", "Trips", "Advance (₹)", "Balance (₹)"],
    );
    downloadCsv(csv, `approval_charge_advance_${startDate}_to_${endDate}.csv`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search transporter…"
            className="h-9 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          className="h-9 w-40"
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setSelectedId(null);
          }}
        />
        <Input
          className="h-9 w-40"
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setSelectedId(null);
          }}
        />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9 gap-2">
            <Download className="size-4" /> Export
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            disabled={loading}
            className="h-9 w-9"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Transporter</th>
                <th className="px-4 py-3 text-right">Trips</th>
                <th className="px-4 py-3 text-right">Advance</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 size-6 animate-spin opacity-20" />
                    Loading…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No approval advance entries found for this period.
                  </td>
                </tr>
              ) : (
                <>
                  {visible.map((row) => {
                    const isExpanded = selectedId === row.transporter_id;
                    return (
                      <Fragment key={row.transporter_id}>
                        <tr className="transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{row.transporter_name}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {row.trip_count}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-600 font-medium">
                            {row.total_advance > 0 ? inr(row.total_advance) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                            {row.total_balance > 0 ? inr(row.total_balance) : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 text-xs"
                              onClick={() =>
                                isExpanded ? setSelectedId(null) : loadHistory(row.transporter_id)
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown className="size-3" />
                              ) : (
                                <ChevronRight className="size-3" />
                              )}
                              {isExpanded ? "Hide" : "History"}
                            </Button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-muted/10 border-b border-border">
                            <td colSpan={5} className="p-0">
                              <div className="max-h-[300px] overflow-y-auto p-4">
                                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                  Trip History
                                </h4>
                                {loadingHistory ? (
                                  <div className="py-4 text-center text-muted-foreground">
                                    Loading…
                                  </div>
                                ) : history.length === 0 ? (
                                  <div className="py-4 text-center text-muted-foreground">
                                    No entries in this period.
                                  </div>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-muted-foreground border-b border-border">
                                        <th className="pb-2 text-left font-semibold">Saved Date</th>
                                        <th className="pb-2 text-left font-semibold">Trip ID</th>
                                        <th className="pb-2 text-right font-semibold">Advance</th>
                                        <th className="pb-2 text-right font-semibold">Balance</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                      {history.map((h) => (
                                        <tr key={h.id}>
                                          <td className="py-2">
                                            {String(h.created_at).slice(0, 10)}
                                          </td>
                                          <td className="py-2 font-medium">{h.trip_id}</td>
                                          <td className="py-2 text-right text-blue-600">
                                            {Number(h.advance) > 0 ? inr(Number(h.advance)) : "—"}
                                          </td>
                                          <td className="py-2 text-right text-emerald-600">
                                            {Number(h.balance) > 0 ? inr(Number(h.balance)) : "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  <tr className="bg-muted/50 font-bold border-t-2 border-border">
                    <td className="px-4 py-3">GRAND TOTAL</td>
                    <td className="px-4 py-3 text-right">
                      {visible.reduce((acc, r) => acc + r.trip_count, 0)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-700">
                      {inr(visible.reduce((acc, r) => acc + r.total_advance, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700">
                      {inr(visible.reduce((acc, r) => acc + r.total_balance, 0))}
                    </td>
                    <td className="px-4 py-3 text-center">—</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

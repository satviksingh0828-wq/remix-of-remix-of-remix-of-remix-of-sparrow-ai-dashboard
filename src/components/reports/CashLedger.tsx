import { useEffect, useMemo, useState } from "react";
import { Download, FileDown, Plus, RefreshCw, Wallet } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { inr } from "@/lib/trip-calc";
import { useSession } from "@/lib/session";
import { isAdminLike } from "@/lib/roles";
import { useBranches } from "@/lib/use-branches";
import { openBrandedTablePdf } from "@/lib/branded-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CashRow = {
  id: string;
  date: string;
  branchId: string | null;
  type: "cash_in" | "cash_out";
  source: string;
  narration: string;
  amount: number;
};

const today = new Date().toISOString().slice(0, 10);
const monthNow = today.slice(0, 7);
const money = (value: unknown) => Number(value ?? 0) || 0;

function monthRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  return { start: `${month}-01`, end: next };
}

export function CashLedger() {
  const { user } = useSession();
  const branches = useBranches();
  const canEnterCash = isAdminLike(user?.role);
  const [month, setMonth] = useState(monthNow);
  const [branchId, setBranchId] = useState("all");
  const [rows, setRows] = useState<CashRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryBranchId, setEntryBranchId] = useState("");
  const [entryDate, setEntryDate] = useState(today);
  const [entryType, setEntryType] = useState<"refill" | "withdrawal">("refill");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNote, setEntryNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadLedger() {
    setLoading(true);
    try {
      const { start, end } = monthRange(month);
      const scope = <T extends { eq: (column: string, value: string) => T }>(query: T) =>
        branchId === "all" ? query : query.eq("branch_id", branchId);
      const [
        manual,
        incomes,
        expenditures,
        closedTrips,
        fastagRecharges,
        freightReceipts,
        approvalReceipts,
        hirePayments,
      ] = await Promise.all([
        fetchAll<any>(() =>
          scope(
            supabase
              .from("cash_ledger_entries" as any)
              .select("*")
              .gte("entry_date", start)
              .lt("entry_date", end)
              .order("entry_date", { ascending: false }) as any,
          ),
        ),
        fetchAll<any>(() =>
          scope(
            supabase
              .from("incomes")
              .select("id,branch_id,income_name,amount,note,received_date")
              .eq("is_received", true)
              .gte("received_date", start)
              .lt("received_date", end)
              .order("received_date", { ascending: false }),
          ),
        ),
        fetchAll<any>(() =>
          scope(
            supabase
              .from("expenditures")
              .select("id,branch_id,expenditure_name,amount,note,paid_date,is_fastag_recharge")
              .eq("is_paid", true)
              .eq("is_fastag_recharge", false)
              .gte("paid_date", start)
              .lt("paid_date", end)
              .order("paid_date", { ascending: false }),
          ),
        ),
        fetchAll<any>(() =>
          scope(
            supabase
              .from("closed_trips")
              .select("id,trip_code,branch_id,end_date,snapshot")
              .gte("end_date", start)
              .lt("end_date", end),
          ),
        ),
        fetchAll<any>(() =>
          supabase
            .from("fastag_transactions")
            .select(
              "id,vehicle_id,amount,transaction_date,note,vehicles(branch_id,registration_number)",
            )
            .eq("transaction_type", "recharge")
            .gte("transaction_date", start)
            .lt("transaction_date", end),
        ),
        fetchAll<any>(() =>
          scope(
            supabase
              .from("freight_loading_receipts" as any)
              .select("*")
              .eq("is_received", true)
              .gte("received_date", start)
              .lt("received_date", end) as any,
          ),
        ),
        fetchAll<any>(() =>
          scope(
            supabase
              .from("approval_charge_receipts" as any)
              .select("*")
              .eq("is_received", true)
              .gte("received_date", start)
              .lt("received_date", end) as any,
          ),
        ),
        fetchAll<any>(
          () =>
            supabase
              .from("approval_charge_advances" as any)
              .select("id,trip_code,advance,updated_at")
              .gt("advance", 0)
              .gte("updated_at", start)
              .lt("updated_at", end) as any,
        ),
      ]);
      const normal = (value: unknown) =>
        String(value ?? "")
          .trim()
          .toLowerCase();
      const ledgerRows: CashRow[] = [
        ...manual.map((e) => ({
          id: `manual-${e.id}`,
          date: e.entry_date,
          branchId: e.branch_id,
          type: e.entry_type === "refill" ? ("cash_in" as const) : ("cash_out" as const),
          source:
            e.entry_type === "refill" ? ("Cash refill" as const) : ("Cash withdrawal" as const),
          narration:
            e.note || (e.entry_type === "refill" ? "Cash refill receipt" : "Cash withdrawal"),
          amount: money(e.amount),
        })),
        ...incomes.map((e) => ({
          id: `income-${e.id}`,
          date: e.received_date,
          branchId: e.branch_id,
          type: "cash_in" as const,
          source: String(e.income_name || "Income"),
          narration: `${e.income_name}${e.note ? ` — ${e.note}` : ""}`,
          amount: money(e.amount),
        })),
        ...expenditures
          .filter((e) => normal(e.expenditure_name) !== "toll charges")
          .map((e) => ({
            id: `expense-${e.id}`,
            date: e.paid_date,
            branchId: e.branch_id,
            type: "cash_out" as const,
            source: String(e.expenditure_name || "Expenditure"),
            narration: `${e.expenditure_name}${e.note ? ` — ${e.note}` : ""}`,
            amount: money(e.amount),
          })),
        ...closedTrips.flatMap((trip) => {
          const snap = trip.snapshot && typeof trip.snapshot === "object" ? trip.snapshot : {};
          const income = Array.isArray(snap.other_income) ? snap.other_income : [];
          const expenses = Array.isArray(snap.expenses) ? snap.expenses : [];
          return [
            ...income
              .filter(
                (e: any) => money(e.amount) > 0 && normal(e.income_name) !== "approval charge",
              )
              .map((e: any, i: number) => ({
                id: `closed-income-${trip.id}-${e.id ?? i}`,
                date: trip.end_date,
                branchId: trip.branch_id,
                type: "cash_in" as const,
                source: String(e.income_name || "Trip income"),
                narration: `${trip.trip_code}: ${e.income_name}${e.note ? ` — ${e.note}` : ""}`,
                amount: money(e.amount),
              })),
            ...expenses
              .filter(
                (e: any) =>
                  money(e.amount) > 0 &&
                  !["toll charges", "hire charges"].includes(normal(e.expense_name)),
              )
              .map((e: any, i: number) => ({
                id: `closed-expense-${trip.id}-${e.id ?? i}`,
                date: trip.end_date,
                branchId: trip.branch_id,
                type: "cash_out" as const,
                source: String(e.expense_name || "Trip expense"),
                narration: `${trip.trip_code}: ${e.expense_name}${e.note ? ` — ${e.note}` : ""}`,
                amount: money(e.amount),
              })),
          ];
        }),
        ...fastagRecharges
          .filter((e: any) => branchId === "all" || e.vehicles?.branch_id === branchId)
          .map((e: any) => ({
            id: `fastag-${e.id}`,
            date: e.transaction_date,
            branchId: e.vehicles?.branch_id ?? null,
            type: "cash_out" as const,
            source: "Fastag Balance" as const,
            narration: `Fastag Balance recharge: ${e.vehicles?.registration_number ?? "Vehicle"}${e.note ? ` — ${e.note}` : ""}`,
            amount: money(e.amount),
          })),
        ...freightReceipts.map((e) => ({
          id: `freight-${e.id}`,
          date: e.received_date,
          branchId: e.branch_id,
          type: "cash_in" as const,
          source: "Freight/Loading" as const,
          narration: `${e.trip_code}: ${e.manifest_number || "Manifest"} (Freight ${money(e.freight_amount).toLocaleString("en-IN")}, Loading ${money(e.loading_amount).toLocaleString("en-IN")})`,
          amount: money(e.freight_amount) + money(e.loading_amount),
        })),
        ...approvalReceipts.map((e) => ({
          id: `approval-${e.id}`,
          date: e.received_date,
          branchId: e.branch_id,
          type: "cash_in" as const,
          source: "Approval Charge" as const,
          narration: `${e.trip_code}: Approval Charge`,
          amount: money(e.amount),
        })),
        ...hirePayments.map((e) => ({
          id: `hire-${e.id}`,
          date: String(e.updated_at).slice(0, 10),
          branchId: null,
          type: "cash_out" as const,
          source: "Hire Charges" as const,
          narration: `${e.trip_code || "Trip"}: paid Hire Charges`,
          amount: money(e.advance),
        })),
      ];
      setRows(
        ledgerRows.sort((a, b) => b.date.localeCompare(a.date) || a.source.localeCompare(b.source)),
      );
    } catch (error) {
      toast.error(
        `Could not load cash ledger: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLedger();
  }, [month, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          cashIn: sum.cashIn + (row.type === "cash_in" ? row.amount : 0),
          cashOut: sum.cashOut + (row.type === "cash_out" ? row.amount : 0),
        }),
        { cashIn: 0, cashOut: 0 },
      ),
    [rows],
  );
  const reportRows = useMemo(() => {
    let balance = 0;
    return [...rows]
      .reverse()
      .map((row) => {
        balance += row.type === "cash_in" ? row.amount : -row.amount;
        return { ...row, balance };
      })
      .reverse();
  }, [rows]);

  async function saveEntry() {
    if (!canEnterCash) return;
    if (!entryBranchId || !entryDate || !(money(entryAmount) > 0))
      return toast.error("Select a branch, date, and valid amount");
    setSaving(true);
    try {
      const { error } = await supabase.from("cash_ledger_entries" as any).insert({
        branch_id: entryBranchId,
        entry_date: entryDate,
        entry_type: entryType,
        amount: money(entryAmount),
        note: entryNote.trim() || null,
      });
      if (error) throw error;
      toast.success(entryType === "refill" ? "Cash refill receipt saved" : "Cash withdrawal saved");
      setEntryOpen(false);
      setEntryAmount("");
      setEntryNote("");
      loadLedger();
    } catch (error) {
      toast.error(
        `Could not save cash entry: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setSaving(false);
    }
  }

  function exportExcel() {
    const data = [...reportRows].reverse().map((row) => ({
      Date: row.date,
      Branch: branches.find((branch) => branch.id === row.branchId)?.branch_name ?? "—",
      "Income / Expense Name": row.source,
      Narration: row.narration,
      "Cash In": row.type === "cash_in" ? row.amount : 0,
      "Cash Out": row.type === "cash_out" ? row.amount : 0,
      Balance: row.balance,
    }));
    data.push({
      Date: "",
      Branch: "",
      "Income / Expense Name": "TOTAL",
      Narration: "",
      "Cash In": totals.cashIn,
      "Cash Out": totals.cashOut,
      Balance: totals.cashIn - totals.cashOut,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "Cash Ledger");
    XLSX.writeFile(
      workbook,
      `cash-ledger-${month}${branchId === "all" ? "-all-branches" : ""}.xlsx`,
    );
  }

  async function exportPdf() {
    const rs = (value: number) =>
      `Rs. ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    await openBrandedTablePdf({
      title: "Cash Ledger",
      subtitle: `Month: ${month} | Branch: ${branchId === "all" ? "All branches" : (branches.find((branch) => branch.id === branchId)?.branch_name ?? "-")}`,
      filename: `cash-ledger-${month}.pdf`,
      columns: [
        "Date",
        "Branch",
        "Income / Expense Name",
        "Narration",
        "Cash In",
        "Cash Out",
        "Balance",
      ],
      rows: [...reportRows]
        .reverse()
        .map((row) => [
          row.date,
          branches.find((branch) => branch.id === row.branchId)?.branch_name ?? "-",
          row.source,
          row.narration.replaceAll("—", "-"),
          row.type === "cash_in" ? rs(row.amount) : "-",
          row.type === "cash_out" ? rs(row.amount) : "-",
          rs(row.balance),
        ]),
      summary: [
        ["Cash In", rs(totals.cashIn)],
        ["Cash Out", rs(totals.cashOut)],
        ["Closing", rs(totals.cashIn - totals.cashOut)],
      ],
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Month</span>
          <Input
            className="h-9 w-40"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Branch</span>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="h-9 w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.branch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <div className="ml-auto flex flex-wrap gap-2">
          {canEnterCash && (
            <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 gap-2">
                  <Plus className="size-4" />
                  Cash entry
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add cash refill or withdrawal</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select value={entryBranchId} onValueChange={setEntryBranchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.branch_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Entry type</Label>
                    <Select
                      value={entryType}
                      onValueChange={(value) => setEntryType(value as "refill" | "withdrawal")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refill">Cash refill (cash in)</SelectItem>
                        <SelectItem value="withdrawal">Cash withdrawal (cash out)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={entryDate}
                        onChange={(event) => setEntryDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={entryAmount}
                        onChange={(event) => setEntryAmount(event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Note / receipt reference</Label>
                    <Input
                      value={entryNote}
                      onChange={(event) => setEntryNote(event.target.value)}
                      placeholder="Optional note"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEntryOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveEntry} disabled={saving}>
                    {saving ? "Saving…" : "Save cash entry"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={exportExcel}>
            <FileDown className="size-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2" onClick={exportPdf}>
            <Download className="size-4" />
            PDF
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={loadLedger}
            disabled={loading}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Summary label="Cash received" value={totals.cashIn} tone="text-emerald-600" />
        <Summary label="Cash paid" value={totals.cashOut} tone="text-red-600" />
        <Summary
          label="Monthly closing cash"
          value={totals.cashIn - totals.cashOut}
          tone="text-foreground"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        This monthly ledger includes received income and paid expenditure from closed trips, with
        every income and expense shown by its saved name. Manual cash refills and withdrawals are
        recorded as separate receipt entries.
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Income / Expense name</th>
                <th className="px-4 py-3">Narration</th>
                <th className="px-4 py-3 text-right">Cash in</th>
                <th className="px-4 py-3 text-right">Cash out</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto size-5 animate-spin" />
                  </td>
                </tr>
              ) : reportRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Wallet className="mx-auto mb-2 size-5 opacity-50" />
                    No cash movement for this month.
                  </td>
                </tr>
              ) : (
                reportRows.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3">
                      {branches.find((branch) => branch.id === row.branchId)?.branch_name ?? "—"}
                    </td>
                    <td className="px-4 py-3">{row.source}</td>
                    <td className="px-4 py-3">{row.narration}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600">
                      {row.type === "cash_in" ? inr(row.amount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {row.type === "cash_out" ? inr(row.amount) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{inr(row.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone}`}>{inr(value)}</p>
    </div>
  );
}

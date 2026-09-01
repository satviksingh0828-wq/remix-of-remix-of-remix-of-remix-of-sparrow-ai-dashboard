import { useEffect, useMemo, useState } from "react";
import { Download, FileDown, Plus, RefreshCw, Wallet } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { inr } from "@/lib/trip-calc";
import { useSession } from "@/lib/session";
import { isAdminLike } from "@/lib/roles";
import { useBranches } from "@/lib/use-branches";
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
  source:
    | "Cash refill"
    | "Cash withdrawal"
    | "Income"
    | "Expenditure"
    | "Trip income"
    | "Trip expense";
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
      const [manual, incomes, expenditures, openTrips, closedTrips] = await Promise.all([
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
              .select("id,branch_id,expenditure_name,amount,note,paid_date")
              .eq("is_paid", true)
              .gte("paid_date", start)
              .lt("paid_date", end)
              .order("paid_date", { ascending: false }),
          ),
        ),
        fetchAll<any>(() =>
          scope(
            supabase
              .from("trips")
              .select("id,trip_code,branch_id,start_date")
              .gte("start_date", start)
              .lt("start_date", end),
          ),
        ),
        fetchAll<any>(() =>
          scope(
            supabase
              .from("closed_trips")
              .select("id,trip_code,branch_id,end_date,total_income,total_expense")
              .gte("end_date", start)
              .lt("end_date", end),
          ),
        ),
      ]);

      const openIds = openTrips.map((trip) => trip.id);
      const [openIncome, openExpenses] = await Promise.all([
        openIds.length
          ? fetchAll<any>(() =>
              supabase
                .from("trip_other_income")
                .select("trip_id,income_name,amount,note")
                .in("trip_id", openIds),
            )
          : Promise.resolve([]),
        openIds.length
          ? fetchAll<any>(() =>
              supabase
                .from("trip_expenses")
                .select("trip_id,expense_name,amount,note")
                .in("trip_id", openIds),
            )
          : Promise.resolve([]),
      ]);
      const openTripById = new Map(openTrips.map((trip) => [trip.id, trip]));
      const ledgerRows: CashRow[] = [
        ...manual.map((entry) => ({
          id: `manual-${entry.id}`,
          date: entry.entry_date,
          branchId: entry.branch_id,
          type: entry.entry_type === "refill" ? "cash_in" : "cash_out",
          source: entry.entry_type === "refill" ? "Cash refill" : "Cash withdrawal",
          narration:
            entry.note ||
            (entry.entry_type === "refill" ? "Cash refill receipt" : "Cash withdrawal"),
          amount: money(entry.amount),
        })),
        ...incomes.map((income) => ({
          id: `income-${income.id}`,
          date: income.received_date,
          branchId: income.branch_id,
          type: "cash_in" as const,
          source: "Income" as const,
          narration: `${income.income_name}${income.note ? ` — ${income.note}` : ""}`,
          amount: money(income.amount),
        })),
        ...expenditures.map((expense) => ({
          id: `expense-${expense.id}`,
          date: expense.paid_date,
          branchId: expense.branch_id,
          type: "cash_out" as const,
          source: "Expenditure" as const,
          narration: `${expense.expenditure_name}${expense.note ? ` — ${expense.note}` : ""}`,
          amount: money(expense.amount),
        })),
        ...openIncome.map((income) => {
          const trip = openTripById.get(income.trip_id);
          return {
            id: `open-income-${income.trip_id}-${income.income_name}-${income.amount}`,
            date: trip?.start_date ?? start,
            branchId: trip?.branch_id ?? null,
            type: "cash_in" as const,
            source: "Trip income" as const,
            narration: `${trip?.trip_code ?? "Trip"}: ${income.income_name}${income.note ? ` — ${income.note}` : ""}`,
            amount: money(income.amount),
          };
        }),
        ...openExpenses.map((expense) => {
          const trip = openTripById.get(expense.trip_id);
          return {
            id: `open-expense-${expense.trip_id}-${expense.expense_name}-${expense.amount}`,
            date: trip?.start_date ?? start,
            branchId: trip?.branch_id ?? null,
            type: "cash_out" as const,
            source: "Trip expense" as const,
            narration: `${trip?.trip_code ?? "Trip"}: ${expense.expense_name}${expense.note ? ` — ${expense.note}` : ""}`,
            amount: money(expense.amount),
          };
        }),
        ...closedTrips.flatMap((trip) => [
          ...(money(trip.total_income) > 0
            ? [
                {
                  id: `closed-income-${trip.id}`,
                  date: trip.end_date,
                  branchId: trip.branch_id,
                  type: "cash_in" as const,
                  source: "Trip income" as const,
                  narration: `${trip.trip_code}: closed trip income`,
                  amount: money(trip.total_income),
                },
              ]
            : []),
          ...(money(trip.total_expense) > 0
            ? [
                {
                  id: `closed-expense-${trip.id}`,
                  date: trip.end_date,
                  branchId: trip.branch_id,
                  type: "cash_out" as const,
                  source: "Trip expense" as const,
                  narration: `${trip.trip_code}: closed trip expense`,
                  amount: money(trip.total_expense),
                },
              ]
            : []),
        ]),
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
      Source: row.source,
      Narration: row.narration,
      "Cash In": row.type === "cash_in" ? row.amount : 0,
      "Cash Out": row.type === "cash_out" ? row.amount : 0,
      Balance: row.balance,
    }));
    data.push({
      Date: "",
      Branch: "",
      Source: "TOTAL",
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

  function exportPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("Cash Ledger", 36, 38);
    doc.setFontSize(9);
    doc.text(
      `Month: ${month}   |   Branch: ${branchId === "all" ? "All branches" : (branches.find((branch) => branch.id === branchId)?.branch_name ?? "—")}`,
      36,
      54,
    );
    doc.text(
      `Cash In: ${inr(totals.cashIn)}   Cash Out: ${inr(totals.cashOut)}   Closing: ${inr(totals.cashIn - totals.cashOut)}`,
      36,
      68,
    );
    autoTable(doc, {
      startY: 80,
      head: [["Date", "Branch", "Source", "Narration", "Cash In", "Cash Out", "Balance"]],
      body: [...reportRows]
        .reverse()
        .map((row) => [
          row.date,
          branches.find((branch) => branch.id === row.branchId)?.branch_name ?? "—",
          row.source,
          row.narration,
          row.type === "cash_in" ? inr(row.amount) : "—",
          row.type === "cash_out" ? inr(row.amount) : "—",
          inr(row.balance),
        ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [155, 28, 28] },
      margin: { left: 28, right: 28 },
    });
    doc.save(`cash-ledger-${month}.pdf`);
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
        This monthly ledger automatically includes received Income, paid Expenditure, and
        open/closed trip income and expenses. Manual cash refills and withdrawals are recorded as
        separate receipt entries.
      </p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Source</th>
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

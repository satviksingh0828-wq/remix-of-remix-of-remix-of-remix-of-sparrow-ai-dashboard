/**
 * YearlyExpenseScheduler — Fixed yearly expense management tab.
 *
 * Features:
 * - User creates a named yearly fixed expense with a total amount + start date
 * - End date auto-sets to exactly 1 year after start date (editable)
 * - User chooses whether to include the start month in the 12 installments
 * - System divides total into 12 equal monthly installments (last absorbs rounding)
 * - Each installment creates an unpaid expenditure (is_yearly_fixed=true)
 * - Installments hidden from basic users in the Expenditure tab (admin-only)
 * - Mark paid from this tab; also payable from the Expenditure tab
 */

import { useEffect, useState } from "react";
import {
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  IndianRupee,
  Loader2,
  Plus,
  RepeatIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAll } from "@/lib/fetch-all";
import { inr } from "@/lib/trip-calc";
import { useBranches } from "@/lib/use-branches";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────────

type YearlyFixedRow = {
  id: string;
  expense_name: string;
  total_amount: number;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  include_start_month: boolean;
  note: string | null;
  branch_id: string | null;
  branch_label: string;
  status: string;
  created_at: string;
  installments: YearlyInstallmentRow[];
  expanded: boolean;
};

type YearlyInstallmentRow = {
  id: string;
  yearly_fixed_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  is_paid: boolean;
  paid_date: string | null;
  expenditure_id: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Add months to a YYYY-MM-DD string, returns first day of that month. */
function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD → 1 year later */
function addOneYear(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1); // last day of the month before, or same day -1
  return d.toISOString().slice(0, 10);
}

type MonthInstallment = {
  installment_number: number;
  due_date: string;          // YYYY-MM-01
  amount: number;
};

/**
 * Generate 12 monthly installments.
 *
 * include_start_month=true  → installments on start_month, +1, +2, … +11
 * include_start_month=false → installments on start_month+1, +2, … +12
 */
function genInstallments(
  startDate: string,
  totalAmount: number,
  includeStart: boolean,
): MonthInstallment[] {
  if (!startDate || totalAmount <= 0) return [];

  const base = includeStart ? 0 : 1;
  const monthly = Math.floor((totalAmount * 100) / 12) / 100;
  const lastAmount = parseFloat((totalAmount - monthly * 11).toFixed(2));

  return Array.from({ length: 12 }, (_, i) => ({
    installment_number: i + 1,
    due_date: addMonths(startDate, base + i),
    amount: i < 11 ? monthly : lastAmount,
  }));
}

/** Format YYYY-MM-DD → "Jan 2025" */
function fmtMonth(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

// ── Main component ─────────────────────────────────────────────────────────────

export function YearlyExpenseScheduler() {
  const branches = useBranches();

  const [schedules, setSchedules] = useState<YearlyFixedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [includeStart, setIncludeStart] = useState(true);
  const [note, setNote] = useState("");
  const [branchId, setBranchId] = useState<string>("");

  // ── Derived preview ───────────────────────────────────────────────────────
  const totalAmt = parseFloat(totalAmount) || 0;
  const preview = genInstallments(startDate, totalAmt, includeStart);

  // Auto-set end date when start date changes
  function handleStartDateChange(val: string) {
    setStartDate(val);
    if (val) setEndDate(addOneYear(val));
  }

  // ── Load ─────────────────────────────────────────────────────────────────

  async function load() {
    setLoading(true);
    try {
      const schData = await fetchAll<Record<string, unknown>>(() =>
        supabase
          .from("yearly_fixed_expenses")
          .select("*")
          .order("created_at", { ascending: false }),
      );

      const scheduleIds = schData.map((s) => s.id as string);
      let instData: Record<string, unknown>[] = [];
      if (scheduleIds.length > 0) {
        instData = await fetchAll<Record<string, unknown>>(() =>
          supabase
            .from("expenditures")
            .select("id,yearly_fixed_id,yearly_fixed_inst_no,entry_date,amount,is_paid,paid_date")
            .in("yearly_fixed_id", scheduleIds)
            .eq("is_yearly_fixed", true)
            .order("yearly_fixed_inst_no"),
        );
      }

      const branchMap = new Map(branches.map((b) => [b.id, b.name]));

      setSchedules(
        schData.map((s) => ({
          id: s.id as string,
          expense_name: s.expense_name as string,
          total_amount: Number(s.total_amount),
          monthly_amount: Number(s.monthly_amount),
          start_date: s.start_date as string,
          end_date: s.end_date as string,
          include_start_month: Boolean(s.include_start_month),
          note: (s.note as string) ?? null,
          branch_id: (s.branch_id as string) ?? null,
          branch_label: s.branch_id ? (branchMap.get(s.branch_id as string) ?? "Unknown branch") : "All branches",
          status: s.status as string,
          created_at: s.created_at as string,
          expanded: false,
          installments: instData
            .filter((i) => i.yearly_fixed_id === s.id)
            .map((i) => ({
              id: i.id as string,
              yearly_fixed_id: i.yearly_fixed_id as string,
              installment_number: Number(i.yearly_fixed_inst_no),
              due_date: i.entry_date as string,
              amount: Number(i.amount),
              is_paid: Boolean(i.is_paid),
              paid_date: (i.paid_date as string) ?? null,
              expenditure_id: i.id as string,
            })),
        })),
      );
    } catch {
      toast.error("Could not load yearly expense data");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length]);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!expenseName.trim()) { toast.error("Enter an expense name"); return; }
    if (!totalAmt || totalAmt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!startDate) { toast.error("Choose a start date"); return; }
    if (preview.length === 0) { toast.error("Could not generate installments"); return; }

    setSaving(true);
    try {
      const monthlyAmt = Math.floor((totalAmt * 100) / 12) / 100;

      // Create the parent yearly_fixed_expenses record
      const { data: schData, error: schErr } = await supabase
        .from("yearly_fixed_expenses")
        .insert({
          expense_name: expenseName.trim(),
          total_amount: totalAmt,
          monthly_amount: monthlyAmt,
          start_date: startDate,
          end_date: endDate || addOneYear(startDate),
          include_start_month: includeStart,
          note: note.trim() || null,
          branch_id: branchId || null,
          status: "active",
        })
        .select("id")
        .single();

      if (schErr || !schData) throw schErr ?? new Error("Schedule insert failed");

      const scheduleId = schData.id;

      // Create 12 expenditure entries (unpaid, admin-only via is_yearly_fixed)
      for (const inst of preview) {
        const expName = `${expenseName.trim()} — ${fmtMonth(inst.due_date)} (${scheduleId.slice(0, 6)})`;
        const { error: expErr } = await supabase
          .from("expenditures")
          .insert({
            expenditure_name: expName,
            amount: String(inst.amount),
            entry_date: inst.due_date,
            note: note.trim() || null,
            branch_id: branchId || null,
            is_paid: false,
            is_emi: false,
            is_yearly_fixed: true,
            yearly_fixed_id: scheduleId,
            yearly_fixed_inst_no: inst.installment_number,
          });

        if (expErr) throw expErr;
      }

      toast.success(`Yearly expense created — 12 monthly entries added`);

      // Reset form
      setShowForm(false);
      setExpenseName("");
      setTotalAmount("");
      setStartDate("");
      setEndDate("");
      setIncludeStart(true);
      setNote("");
      setBranchId("");

      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save yearly expense");
    }
    setSaving(false);
  }

  // ── Mark Paid ─────────────────────────────────────────────────────────────

  async function handleMarkPaid(inst: YearlyInstallmentRow) {
    setMarkingPaid(inst.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await supabase
        .from("expenditures")
        .update({ is_paid: true, paid_date: today })
        .eq("id", inst.expenditure_id!);

      toast.success(`Month ${inst.installment_number} marked as paid`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark as paid");
    }
    setMarkingPaid(null);
  }

  function toggleExpand(id: string) {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, expanded: !s.expanded } : s)),
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div />
        <Button
          onClick={() => setShowForm((v) => !v)}
          size="sm"
          variant={showForm ? "outline" : "default"}
        >
          {showForm ? "Cancel" : <><Plus className="size-4" /> New Yearly Expense</>}
        </Button>
      </div>

      {/* ── Create Form ───────────────────────────────────────────────────── */}
      {showForm && (
        <div className="surface-card space-y-6 p-6">
          <h3 className="text-sm font-semibold tracking-tight flex items-center gap-2">
            <IndianRupee className="size-4 text-primary" />
            Create Fixed Yearly Expense
          </h3>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Name */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">Expense Name *</Label>
              <Input
                placeholder="e.g. Office Rent, Insurance Premium, Software License…"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
              />
            </div>

            {/* Total Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Total Yearly Amount (₹) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
              {totalAmt > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  ≈ {inr(Math.floor((totalAmt * 100) / 12) / 100)} / month
                </p>
              )}
            </div>

            {/* Branch */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Branch (optional)</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="All branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Start Date *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">End Date (auto)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Auto-set to 1 year after start date</p>
            </div>

            {/* Note */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-muted-foreground">Note (optional)</Label>
              <Input
                placeholder="Vendor name, policy number, etc."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* Include start month toggle */}
          {startDate && totalAmt > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Include start month in the 12 installments?
              </Label>
              <div className="flex gap-3">
                {([true, false] as const).map((val) => (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => setIncludeStart(val)}
                    className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                      includeStart === val
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {val ? "Yes — include start month" : "No — start from next month"}
                    <p className="mt-0.5 text-[11px] font-normal opacity-70">
                      {val
                        ? `Month 1 = ${fmtMonth(startDate)}`
                        : `Month 1 = ${fmtMonth(addMonths(startDate, 1))}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 rounded-xl bg-muted/40 px-4 py-3 text-sm flex-wrap">
                <span className="font-medium">12 monthly installments</span>
                <span className="text-muted-foreground">·</span>
                <span>Total: <strong>{inr(totalAmt)}</strong></span>
                <span className="text-muted-foreground">·</span>
                <span>Monthly: <strong>{inr(preview[0]?.amount ?? 0)}</strong>
                  {preview[11]?.amount !== preview[0]?.amount && (
                    <span className="text-muted-foreground"> (last: {inr(preview[11]?.amount ?? 0)})</span>
                  )}
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Month</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((inst) => (
                      <tr key={inst.installment_number} className="border-t border-border hover:bg-muted/20">
                        <td className="px-3 py-2 text-muted-foreground">{inst.installment_number}</td>
                        <td className="px-3 py-2">{fmtMonth(inst.due_date)}</td>
                        <td className="px-3 py-2 text-right font-medium">{inr(inst.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <CalendarRange className="size-4" />}
              Save Yearly Expense
            </Button>
          </div>
        </div>
      )}

      {/* ── Existing schedules ─────────────────────────────────────────────── */}
      {schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-16 text-center">
          <RepeatIcon className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No yearly expenses yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Create your first yearly expense using the button above
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((sched) => {
            const paid = sched.installments.filter((i) => i.is_paid).length;
            const total = sched.installments.length;
            const paidAmt = sched.installments.filter((i) => i.is_paid).reduce((s, i) => s + i.amount, 0);
            const pendingAmt = sched.installments.filter((i) => !i.is_paid).reduce((s, i) => s + i.amount, 0);
            const nextDue = sched.installments.find((i) => !i.is_paid);

            return (
              <div key={sched.id} className="surface-card overflow-hidden">
                {/* Schedule header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(sched.id)}
                  className="flex w-full items-center gap-4 p-5 text-left hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{sched.expense_name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          sched.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {sched.status}
                      </span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {sched.branch_label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Total: <strong className="text-foreground">{inr(sched.total_amount)}</strong></span>
                      <span>Monthly: <strong className="text-foreground">{inr(sched.monthly_amount)}</strong></span>
                      <span>{fmtMonth(sched.start_date)} → {fmtMonth(sched.end_date)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-3 inline mr-0.5" />{paid}/{total} paid
                      </span>
                      {nextDue && (
                        <span className="text-amber-600 dark:text-amber-400">
                          <Clock className="size-3 inline mr-0.5" />Next: {fmtMonth(nextDue.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Pending</p>
                    <p className="font-bold text-sm text-amber-600 dark:text-amber-400">{inr(pendingAmt)}</p>
                  </div>
                  {sched.expanded
                    ? <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  }
                </button>

                {/* Progress bar */}
                <div className="h-1 bg-muted">
                  <div
                    className="h-1 bg-emerald-500 transition-all"
                    style={{ width: total > 0 ? `${(paid / total) * 100}%` : "0%" }}
                  />
                </div>

                {/* Installments table */}
                {sched.expanded && (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">#</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Month</th>
                          <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Amount</th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sched.installments.map((inst) => (
                          <tr
                            key={inst.id}
                            className={`border-t border-border ${inst.is_paid ? "opacity-60" : ""}`}
                          >
                            <td className="px-4 py-2.5 text-muted-foreground">{inst.installment_number}</td>
                            <td className="px-4 py-2.5">{fmtMonth(inst.due_date)}</td>
                            <td className="px-4 py-2.5 text-right font-medium">{inr(inst.amount)}</td>
                            <td className="px-4 py-2.5">
                              {inst.is_paid ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                  <CheckCircle2 className="size-3.5" /> Paid {inst.paid_date ?? ""}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                  <Clock className="size-3.5" /> Pending
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {!inst.is_paid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  disabled={markingPaid === inst.id}
                                  onClick={() => handleMarkPaid(inst)}
                                >
                                  {markingPaid === inst.id ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="size-3 text-emerald-600" />
                                  )}
                                  Mark Paid
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/30 font-medium">
                          <td colSpan={2} className="px-4 py-2.5 text-xs text-muted-foreground">Totals</td>
                          <td className="px-4 py-2.5 text-right text-xs">
                            {inr(sched.installments.reduce((s, i) => s + i.amount, 0))}
                          </td>
                          <td colSpan={2} className="px-4 py-2.5 text-xs">
                            <span className="text-emerald-600 dark:text-emerald-400 mr-3">
                              Paid: {inr(paidAmt)}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400">
                              Pending: {inr(pendingAmt)}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

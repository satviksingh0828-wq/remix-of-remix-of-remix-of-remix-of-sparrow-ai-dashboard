import { useMemo, useState } from 'react';
import { BookOpen, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEmployees,
  useLoans,
  useAdvances,
  useAllLoanInstallments,
  useAllAdvanceInstallments,
  useAllPayrolls,
} from '@/lib/hooks';
import { fullName, effectivePaymentStatus } from '@/lib/types';
import type { Loan, Advance, LoanInstallment, AdvanceInstallment, Payroll } from '@/lib/types';
import { cn } from '@/lib/utils';
import { exportLedger } from '@/lib/excel-io';
import { exportLedgerPdf } from '@/lib/pdf-export';
import { useAppSettings } from '@/lib/hooks';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function money(n: number) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format balance with bracketed DR/CR notation, e.g. ₹5,000.00 (DR) */
function balanceLabel(bal: number): string {
  if (Math.abs(bal) < 0.01) return `${money(0)} (Nil)`;
  const tag = bal > 0 ? '(DR)' : '(CR)';
  return `${money(Math.abs(bal))} ${tag}`;
}

function monthLabel(periodEnd: string) {
  const d = new Date(periodEnd);
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// ── Ledger entry type ──────────────────────────────────────────────────────
interface LedgerEntry {
  date: string;
  narration: string;
  tag: 'loan' | 'advance' | 'salary-cr' | 'salary-dr' | 'recovery' | 'salary-pending';
  dr: number;
  cr: number;
  balance: number; // running; positive = DR, negative = CR
  /** Non-zero for pending/partial payrolls — does NOT affect running balance */
  amountDue?: number;
}

// ── Build entries for a single employee ───────────────────────────────────
function buildLedger(
  loans: Loan[],
  advances: Advance[],
  loanInsts: LoanInstallment[],
  advInsts: AdvanceInstallment[],
  payrolls: Payroll[],
): LedgerEntry[] {
  const raw: Omit<LedgerEntry, 'balance'>[] = [];

  // Loans disbursed
  for (const l of loans) {
    raw.push({
      date: l.start_date,
      narration: `Loan Disbursed — ₹${(+l.principal).toLocaleString('en-IN')} (${l.months} mo @ ₹${(+l.emi).toLocaleString('en-IN')}/mo)`,
      tag: 'loan',
      dr: Number(l.principal),
      cr: 0,
    });
  }

  // Advances disbursed
  for (const a of advances) {
    raw.push({
      date: a.start_date,
      narration: `Advance Disbursed — ₹${(+a.principal).toLocaleString('en-IN')} (${a.months} mo @ ₹${(+a.emi).toLocaleString('en-IN')}/mo)`,
      tag: 'advance',
      dr: Number(a.principal),
      cr: 0,
    });
  }

  // Loan installments — direct payment / partial payment cash portion
  for (const inst of loanInsts) {
    if (inst.status === 'paid_manual') {
      raw.push({
        date: inst.due_date,
        narration: `Loan EMI #${inst.emi_number} — Direct Cash Payment`,
        tag: 'recovery',
        dr: 0,
        cr: Number(inst.amount),
      });
    } else if (inst.status === 'paid_payroll' && Number(inst.paid_amount || 0) > 0) {
      // Partial manual portion — the payroll deduction covers the remainder, recorded in the payroll block
      raw.push({
        date: inst.due_date,
        narration: `Loan EMI #${inst.emi_number} — Partial Cash Payment (balance via payroll)`,
        tag: 'recovery',
        dr: 0,
        cr: Number(inst.paid_amount),
      });
    }
  }

  // Advance installments — direct payment / partial payment cash portion
  for (const inst of advInsts) {
    if (inst.status === 'paid_manual') {
      raw.push({
        date: inst.due_date,
        narration: `Advance EMI #${inst.emi_number} — Direct Cash Payment`,
        tag: 'recovery',
        dr: 0,
        cr: Number(inst.amount),
      });
    } else if (inst.status === 'paid_payroll' && Number(inst.paid_amount || 0) > 0) {
      raw.push({
        date: inst.due_date,
        narration: `Advance EMI #${inst.emi_number} — Partial Cash Payment (balance via payroll)`,
        tag: 'recovery',
        dr: 0,
        cr: Number(inst.paid_amount),
      });
    }
  }

  // Payroll entries — double entry per payslip
  for (const p of payrolls) {
    const ps    = effectivePaymentStatus(p);
    const label = monthLabel(p.period_end);
    const gross = Number(p.gross) || 0;
    const net   = Number(p.net)   || 0;
    const pf    = Number(p.pf_deduction)      || 0;
    const tax   = Number(p.tax_deduction)     || 0;
    const loan  = Number(p.loan_deduction)    || 0;
    const adv   = Number(p.advance_deduction) || 0;
    const loss  = Number(p.loss_deduction)    || 0;
    const unpaid = Number(p.unpaid_leave_deduction) || 0;
    const payout = Number(p.paid_leave_payout_amount) || 0;

    // CR entries appear at generation time (always)
    raw.push({
      date: p.period_end,
      narration: `Salary ${label} — Gross Earnings (${p.present_days ?? '?'}/${p.working_days ?? '?'} days)`,
      tag: 'salary-cr',
      dr: 0,
      cr: gross + payout,
    });

    // Deduction DRs at generation time (always)
    if (pf     > 0) raw.push({ date: p.period_end, narration: `Salary ${label} — PF Contribution`,                    tag: 'salary-dr', dr: pf,     cr: 0 });
    if (tax    > 0) raw.push({ date: p.period_end, narration: `Salary ${label} — Income Tax`,                         tag: 'salary-dr', dr: tax,    cr: 0 });
    if (unpaid > 0) raw.push({ date: p.period_end, narration: `Salary ${label} — Unpaid Leave Deduction`,             tag: 'salary-dr', dr: unpaid, cr: 0 });
    if (loan   > 0) raw.push({ date: p.period_end, narration: `Salary ${label} — Loan EMI Recovery (via Payroll)`,    tag: 'salary-dr', dr: loan,   cr: 0 });
    if (adv    > 0) raw.push({ date: p.period_end, narration: `Salary ${label} — Advance EMI Recovery (via Payroll)`, tag: 'salary-dr', dr: adv,    cr: 0 });
    if (loss   > 0) raw.push({ date: p.period_end, narration: `Salary ${label} — Loss / Damage Deduction`,            tag: 'salary-dr', dr: loss,   cr: 0 });

    // Net salary bank/cash entry — ONLY when actually paid
    if (ps === 'paid') {
      const payAmt = p.payment_amount != null ? Number(p.payment_amount) : net;
      // If there's payment history, add one DR entry per payment
      if (p.payment_history && p.payment_history.length > 0) {
        for (const entry of p.payment_history) {
          raw.push({
            date: entry.date,
            narration: `Salary ${label} — Net Salary Paid (Cash/Bank)`,
            tag: 'salary-dr',
            dr: entry.amount,
            cr: 0,
          });
        }
      } else {
        const payDate = p.payment_date ?? p.period_end;
        raw.push({ date: payDate, narration: `Salary ${label} — Net Salary Paid (Cash/Bank)`, tag: 'salary-dr', dr: payAmt, cr: 0 });
      }
    } else if (ps === 'partial_paid') {
      const payAmt = p.payment_amount != null ? Number(p.payment_amount) : 0;
      const outstanding = Math.max(0, net - payAmt);
      // Show each historical payment as individual DR entries
      if (p.payment_history && p.payment_history.length > 0) {
        for (const entry of p.payment_history) {
          raw.push({
            date: entry.date,
            narration: `Salary ${label} — Partial Net Salary Paid (Cash/Bank)`,
            tag: 'salary-dr',
            dr: entry.amount,
            cr: 0,
          });
        }
      } else {
        const payDate = p.payment_date ?? p.period_end;
        raw.push({ date: payDate, narration: `Salary ${label} — Partial Net Salary Paid (Cash/Bank)`, tag: 'salary-dr', dr: payAmt, cr: 0 });
      }
      // Outstanding — shown as a pending entry (does NOT affect balance)
      if (outstanding > 0.01) {
        raw.push({
          date: p.period_end,
          narration: `Salary ${label} — Outstanding Balance (Pending Payment)`,
          tag: 'salary-pending' as const,
          dr: 0,
          cr: 0,
          amountDue: outstanding,
        });
      }
    } else {
      // generated — not yet paid; show full net as pending
      raw.push({
        date: p.period_end,
        narration: `Salary ${label} — Net Salary Due (Payment Pending)`,
        tag: 'salary-pending' as const,
        dr: 0,
        cr: 0,
        amountDue: net,
      });
    }
  }

  // Sort chronologically; within same date: CR before DR for clarity
  const order = (e: Omit<LedgerEntry, 'balance'>) =>
    `${e.date}${e.tag === 'salary-cr' ? '0' : e.tag === 'salary-dr' ? '1' : e.tag === 'salary-pending' ? '3' : '2'}`;
  raw.sort((a, b) => order(a).localeCompare(order(b)));

  // Compute running balance (positive = DR balance, negative = CR balance)
  // salary-pending entries do NOT affect the running balance
  let bal = 0;
  return raw.map(e => {
    if (e.tag !== 'salary-pending') bal = bal + e.dr - e.cr;
    return { ...e, balance: bal };
  });
}

// ── Filter helper ──────────────────────────────────────────────────────────
function entryInPeriod(date: string, year: number, month: number | 'all') {
  const d = new Date(date);
  if (d.getFullYear() !== year) return false;
  if (month !== 'all' && d.getMonth() !== month) return false;
  return true;
}

// ── Main component ─────────────────────────────────────────────────────────
export function PayrollLedger() {
  const now = new Date();

  const { data: employees, isLoading: el } = useEmployees();
  const { data: loans = [],     isLoading: ll } = useLoans();
  const { data: advances = [],  isLoading: al } = useAdvances();
  const { data: loanInsts = [],  isLoading: li } = useAllLoanInstallments();
  const { data: advInsts = [],   isLoading: ai } = useAllAdvanceInstallments();
  const { data: payrolls = [],   isLoading: pl } = useAllPayrolls();

  const [empId,       setEmpId]       = useState('');
  const [filterYear,  setFilterYear]  = useState(now.getFullYear());
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');

  const employee = useMemo(() => (employees ?? []).find(e => e.id === empId), [employees, empId]);
  const loading  = el || ll || al || li || ai || pl;

  // Build full ledger (all time — needed for correct running balance)
  const allEntries = useMemo(() => {
    if (!empId) return [];
    const empLoans    = loans.filter(l => l.employee_id === empId);
    const empAdvances = advances.filter(a => a.employee_id === empId);
    const loanIds     = new Set(empLoans.map(l => l.id));
    const advIds      = new Set(empAdvances.map(a => a.id));
    return buildLedger(
      empLoans, empAdvances,
      loanInsts.filter(i => loanIds.has(i.loan_id)),
      advInsts.filter(i => advIds.has(i.advance_id)),
      payrolls.filter(p => p.employee_id === empId),
    );
  }, [empId, loans, advances, loanInsts, advInsts, payrolls]);

  // Period-filtered view (balance column stays from full history)
  const entries = useMemo(
    () => allEntries.filter(e => entryInPeriod(e.date, filterYear, filterMonth)),
    [allEntries, filterYear, filterMonth],
  );

  // Opening balance = balance of last entry BEFORE the filter period.
  const openingBalance = useMemo(() => {
    const cutoff = filterMonth === 'all'
      ? `${filterYear}-01-01`
      : `${filterYear}-${String((filterMonth as number) + 1).padStart(2, '0')}-01`;
    const before = allEntries.filter(e => !entryInPeriod(e.date, filterYear, filterMonth) && e.date < cutoff);
    return before.length ? before[before.length - 1].balance : 0;
  }, [allEntries, filterYear, filterMonth]);

  // Totals of the filtered view
  const totals = useMemo(() => {
    const lastBal = entries.length ? entries[entries.length - 1].balance : openingBalance;
    return {
      dr:  entries.reduce((s, e) => s + e.dr, 0),
      cr:  entries.reduce((s, e) => s + e.cr, 0),
      bal: lastBal,
    };
  }, [entries, openingBalance]);

  // All-time totals for the summary cards
  const lifetimeBal = allEntries.length ? allEntries[allEntries.length - 1].balance : 0;

  const periodLabel = filterMonth === 'all'
    ? String(filterYear)
    : `${MONTHS[filterMonth]}-${filterYear}`;

  const tagBg = (tag: LedgerEntry['tag']) => {
    if (tag === 'salary-cr')      return 'bg-emerald-50/60 dark:bg-emerald-950/20';
    if (tag === 'salary-dr')      return 'bg-slate-50/60 dark:bg-slate-900/20';
    if (tag === 'loan')           return 'bg-amber-50/60 dark:bg-amber-950/20';
    if (tag === 'advance')        return 'bg-blue-50/60 dark:bg-blue-950/20';
    if (tag === 'recovery')       return 'bg-purple-50/60 dark:bg-purple-950/20';
    if (tag === 'salary-pending') return 'bg-orange-50/60 dark:bg-orange-950/20';
    return '';
  };

  const balColor = (bal: number) =>
    bal > 0.01 ? 'text-red-600 dark:text-red-400'
    : bal < -0.01 ? 'text-emerald-700 dark:text-emerald-400'
    : 'text-muted-foreground';

  const { data: settings } = useAppSettings();

  const handleExport = () => {
    if (!employee || entries.length === 0) return;
    exportLedger(entries, fullName(employee), periodLabel);
  };

  const handleExportPdf = () => {
    if (!employee || entries.length === 0) return;
    exportLedgerPdf({
      entries,
      employeeName: fullName(employee),
      periodLabel,
      openingBalance,
      totals,
      settings,
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <BookOpen className="h-5 w-5" /> Employee Ledger
          </h1>
          <p className="text-sm text-muted-foreground">
            Double-entry ledger per employee — loans, advances, and payroll in one view.
            <span className="ml-2 font-medium text-emerald-700 dark:text-emerald-400">CR = earned / recovered</span>
            <span className="mx-1">·</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">DR = disbursed / paid out</span>
            <span className="mx-1">·</span>
            <span className="text-xs text-muted-foreground">Bank entry appears only after payroll is marked as paid</span>
          </p>
        </div>
        {empId && entries.length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-1 h-4 w-4" />Export Excel
            </Button>
            <Button variant="outline" onClick={handleExportPdf}>
              <Download className="mr-1 h-4 w-4" />Export PDF
            </Button>
          </div>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56 space-y-1">
          <Label className="text-xs">Employee</Label>
          <Select value={empId} onValueChange={setEmpId} disabled={el}>
            <SelectTrigger>
              <SelectValue placeholder={el ? 'Loading…' : 'Select employee'} />
            </SelectTrigger>
            <SelectContent>
              {(employees ?? []).map(e => (
                <SelectItem key={e.id} value={e.id}>{fullName(e)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-28 space-y-1">
          <Label className="text-xs">Year</Label>
          <Input
            type="number"
            value={filterYear}
            onChange={e => setFilterYear(Number(e.target.value) || filterYear)}
          />
        </div>

        <div className="w-40 space-y-1">
          <Label className="text-xs">Month</Label>
          <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!empId ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          Select an employee to view their ledger
        </div>
      ) : loading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-3 sm:grid-cols-4">
            <SCard label={`DR — ${periodLabel}`}  v={money(totals.dr)} color="text-slate-800 dark:text-slate-200" />
            <SCard label={`CR — ${periodLabel}`}  v={money(totals.cr)} color="text-emerald-700 dark:text-emerald-400" />
            <SCard
              label="Closing Balance (period)"
              v={balanceLabel(totals.bal)}
              color={balColor(totals.bal)}
            />
            <SCard
              label="Lifetime Balance"
              v={balanceLabel(lifetimeBal)}
              color={balColor(lifetimeBal)}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-xs">
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">■ Loan disbursed</Badge>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">■ Advance disbursed</Badge>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">■ Salary CR (gross)</Badge>
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">■ Salary DR (paid/deductions)</Badge>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">■ Direct cash recovery</Badge>
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300">■ Amount due (pending)</Badge>
          </div>

          {/* Ledger table */}
          {entries.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              No transactions for {fullName(employee!)} in {periodLabel}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Narration</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">DR (₹)</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">CR (₹)</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Amount Due (₹)</th>
                    <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {/* Opening balance row when filter is active */}
                  {(filterMonth !== 'all' || filterYear !== new Date().getFullYear()) && (
                    <tr className="bg-muted/40 italic">
                      <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">—</td>
                      <td className="px-3 py-1.5 text-muted-foreground">Opening Balance (brought forward)</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {openingBalance > 0.01 ? money(openingBalance) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                        {openingBalance < -0.01 ? money(Math.abs(openingBalance)) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        <span className="text-muted-foreground/40">—</span>
                      </td>
                      <td className={cn('whitespace-nowrap px-3 py-1.5 text-right tabular-nums font-semibold', balColor(openingBalance))}>
                        {balanceLabel(openingBalance)}
                      </td>
                    </tr>
                  )}
                  {entries.map((e, i) => (
                    <tr key={i} className={cn('transition-colors', tagBg(e.tag))}>
                      <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                        {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-1.5">
                        {e.narration}
                        {e.tag === 'salary-pending' && (
                          <span className="ml-1.5 inline-flex items-center rounded bg-orange-100 dark:bg-orange-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:text-orange-300">PENDING</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                        {e.dr > 0 ? money(e.dr) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                        {e.cr > 0 ? money(e.cr) : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                        {(e.amountDue ?? 0) > 0
                          ? money(e.amountDue!)
                          : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className={cn('whitespace-nowrap px-3 py-1.5 text-right tabular-nums font-semibold', balColor(e.balance))}>
                        {balanceLabel(e.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals footer */}
                <tfoot className="border-t-2 bg-muted/60 font-semibold">
                  <tr>
                    <td className="px-3 py-2.5 text-xs font-bold" colSpan={2}>TOTAL — {periodLabel}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{money(totals.dr)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{money(totals.cr)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-orange-600 dark:text-orange-400">
                      {money(entries.reduce((s, e) => s + (e.amountDue ?? 0), 0))}
                    </td>
                    <td className={cn('px-3 py-2.5 text-right tabular-nums', balColor(totals.bal))}>
                      {balanceLabel(totals.bal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SCard({ label, v, color }: { label: string; v: string; color?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-base font-bold', color)}>{v}</div>
    </div>
  );
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn('rounded px-2 py-0.5 font-medium', className)}>{children}</span>;
}

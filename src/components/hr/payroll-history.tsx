import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { History, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useEmployees, useDepartments, useAllPositions, useAllPayrolls, useAppSettings,
  useLoans, useAdvances, useLossDeductions, useAllLoanInstallments, useAllAdvanceInstallments,
} from '@/lib/hooks';
import { fullName } from '@/lib/types';
import { exportPayrollPdf } from '@/lib/payroll-pdf';
import { exportPayrollHistory } from '@/lib/excel-io';

function money(n: number) {
  return '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PayrollHistory() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | 'all'>(now.getMonth());
  const [selEmp, setSelEmp] = useState<string>('');

  const { data: payrolls, isLoading } = useAllPayrolls();
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: positions } = useAllPositions();
  const { data: settings } = useAppSettings();
  const { data: allLoans } = useLoans();
  const { data: allAdvances } = useAdvances();
  const { data: allDeductions } = useLossDeductions();
  const { data: allLoanInst } = useAllLoanInstallments();
  const { data: allAdvInst } = useAllAdvanceInstallments();

  const inRange = (dateStr: string) => {
    const d = new Date(dateStr);
    if (d.getFullYear() !== year) return false;
    if (month !== 'all' && d.getMonth() !== month) return false;
    return true;
  };

  const rows = useMemo(() => {
    const empMap = new Map((employees ?? []).map(e => [e.id, e] as const));
    const filtered = (payrolls ?? []).filter(p => inRange(p.period_start));
    const totals = new Map<string, number>();
    filtered.forEach(p => totals.set(p.employee_id, (totals.get(p.employee_id) ?? 0) + Number(p.net)));
    return Array.from(totals.entries()).map(([id, total]) => ({
      employee: empMap.get(id),
      total,
    })).filter(r => r.employee).sort((a, b) => fullName(a.employee!).localeCompare(fullName(b.employee!)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payrolls, employees, year, month]);

  const selEmpPayrolls = useMemo(() => (payrolls ?? []).filter(p => p.employee_id === selEmp).sort((a, b) => b.period_start.localeCompare(a.period_start)), [payrolls, selEmp]);
  const selEmpObj = (employees ?? []).find(e => e.id === selEmp) ?? null;
  const selDept = selEmpObj && departments ? departments.find(d => d.id === selEmpObj.department_id) ?? null : null;
  const selPos = selEmpObj && positions ? positions.find(p => p.id === selEmpObj.position_id) ?? null : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl"><History className="h-5 w-5" /> Payroll history</h1>
        <Button
          variant="outline"
          disabled={!payrolls?.length}
          onClick={() => {
            const empMap = new Map((employees ?? []).map(e => [e.id, e] as const));
            const filtered = (payrolls ?? []).filter(p => {
              const d = new Date(p.period_start);
              if (d.getFullYear() !== year) return false;
              if (month !== 'all' && d.getMonth() !== month) return false;
              return true;
            }).sort((a, b) => a.period_start.localeCompare(b.period_start));
            const label = month === 'all' ? String(year) : `${year}-${String(month + 1).padStart(2, '0')}`;
            exportPayrollHistory(filtered, empMap, label);
          }}
        >
          <Download className="mr-1 h-4 w-4" />Export Excel
        </Button>
      </div>
      <div className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Year</Label>
          <Input type="number" value={year} onChange={e => setYear(Number(e.target.value) || year)} />
        </div>
        <div className="space-y-2">
          <Label>Month</Label>
          <Select value={String(month)} onValueChange={v => setMonth(v === 'all' ? 'all' : Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3 text-sm font-semibold">Employees paid in period ({rows.length})</div>
          {rows.length === 0 ? <div className="p-4 text-sm text-muted-foreground">No payrolls in this period.</div> : (
            <div className="divide-y">
              {rows.map(r => (
                <button key={r.employee!.id} onClick={() => setSelEmp(r.employee!.id)} className={'flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-accent ' + (selEmp === r.employee!.id ? 'bg-accent/60' : '')}>
                  <div>
                    <div className="font-medium">{fullName(r.employee!)}</div>
                    <div className="text-xs text-muted-foreground">
                      <Link to="/employees/$id" params={{ id: r.employee!.id }} className="underline">view profile</Link>
                    </div>
                  </div>
                  <div className="text-right"><div className="font-semibold">{money(r.total)}</div><div className="text-xs text-muted-foreground">total paid</div></div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selEmpObj && (
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <div className="mb-3 text-base font-semibold">{fullName(selEmpObj)} — all payrolls</div>
          {selEmpPayrolls.length === 0 ? <div className="text-sm text-muted-foreground">None.</div> : (
            <div className="divide-y">
              {selEmpPayrolls.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div>
                    <div className="font-medium">{new Date(p.period_start).toLocaleDateString('en-IN')} — {new Date(p.period_end).toLocaleDateString('en-IN')}</div>
                    <div className="text-xs text-muted-foreground">{p.period_type === 'half_month' ? 'Half month' : 'Month'} · Gross {money(p.gross)} · Net {money(p.net)}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    const empLoans    = (allLoans    ?? []).filter(l => l.employee_id === selEmpObj.id && l.status === 'active');
                    const empAdvances = (allAdvances ?? []).filter(a => a.employee_id === selEmpObj.id && a.status === 'active');
                    exportPayrollPdf({
                      payroll: p,
                      employee: selEmpObj,
                      department: selDept,
                      position: selPos,
                      settings,
                      loans: empLoans,
                      advances: empAdvances,
                      lossDeductions: (allDeductions ?? []).filter(d => d.payroll_id === p.id),
                      loanInstallments: (allLoanInst ?? []).filter(i => empLoans.some(l => l.id === i.loan_id)),
                      advanceInstallments: (allAdvInst ?? []).filter(i => empAdvances.some(a => a.id === i.advance_id)),
                    });
                  }}><Download className="mr-1 h-3 w-3" />PDF</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
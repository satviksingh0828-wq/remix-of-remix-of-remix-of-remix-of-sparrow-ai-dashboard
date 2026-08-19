import { Link } from '@tanstack/react-router';
import { ArrowLeft, Pencil, Users, Clock, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDepartment, useDepartments, usePositions, useEmployees } from '@/lib/hooks';
import { computeSalary, dailyHours, fullName } from '@/lib/types';
import { useBranches, branchName } from '@/lib/use-branches';

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

export function DepartmentProfile({ id }: { id: string }) {
  const { data: dept, isLoading, error } = useDepartment(id);
  const { data: allDepts = [] } = useDepartments();
  const { data: positions = [] } = usePositions(id);
  const { data: allEmployees = [] } = useEmployees();
  const branches = useBranches();

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /></div>;
  if (error || !dept) return <div className="text-sm text-muted-foreground">Department not found. <Link to="/employees/departments" className="underline">Back</Link></div>;

  const employees = allEmployees.filter(e => e.department_id === id);
  const active = employees.filter(e => e.status === 'active');
  const parent = allDepts.find(d => d.id === dept.reports_to_department_id);

  const workingDaysCount = dept.working_days_of_week.length;
  const totalMonthlyHours = active.reduce((sum, e) => sum + dailyHours(e) * workingDaysCount * 4, 0);
  const totalCost = active.reduce((sum, e) => sum + computeSalary(e).net, 0);

  const posName = (pid: string | null) => positions.find(p => p.id === pid)?.name ?? '—';

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/employees/departments" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Link to="/employees/departments/$id/edit" params={{ id: dept.id }}>
          <Button size="sm" className="min-h-[44px] sm:min-h-0"><Pencil className="mr-1 h-4 w-4" />Edit</Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <h1 className="text-2xl font-bold">{dept.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dept.address}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {dept.working_days_of_week.map(d => (
            <span key={d} className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{d}</span>
          ))}
        </div>
        {parent && <p className="mt-3 text-xs text-muted-foreground">Reports to: <b className="text-foreground">{parent.name}</b></p>}
        <p className="mt-2 text-xs text-muted-foreground">Branch: <b className="text-foreground">{branchName(branches, dept.branch_id) || '—'}</b></p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Users className="h-4 w-4" />} label="Total employees" value={employees.length} />
        <Stat icon={<Users className="h-4 w-4" />} label="Active" value={active.length} />
        <Stat icon={<Clock className="h-4 w-4" />} label="Monthly hrs" value={totalMonthlyHours.toFixed(0)} />
        <Stat icon={<IndianRupee className="h-4 w-4" />} label="Monthly cost" value={`₹${totalCost.toLocaleString('en-IN')}`} />
      </div>

      <section className="rounded-lg border bg-card">
        <h2 className="border-b p-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Positions</h2>
        {positions.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No positions.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Position</TableHead>
                <TableHead>Head</TableHead>
                <TableHead>Reports to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.is_head ? <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Head</span> : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{posName(p.reports_to_position_id)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        <h2 className="border-b p-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Employees</h2>
        {employees.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No employees in this department.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Net salary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <Link to="/employees/$id" params={{ id: e.id }} className="hover:underline">{fullName(e)}</Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{posName(e.position_id)}</TableCell>
                  <TableCell>{e.status}</TableCell>
                  <TableCell className="text-right">₹{computeSalary(e).net.toLocaleString('en-IN')}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-semibold">Total monthly cost</TableCell>
                <TableCell className="text-right font-semibold">₹{totalCost.toLocaleString('en-IN')}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

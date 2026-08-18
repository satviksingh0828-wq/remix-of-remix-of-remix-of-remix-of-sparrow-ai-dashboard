import { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Check, X, CircleSlash, Download, Lock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useEmployees, useDepartments, useAttendanceByDate, useUpsertAttendance, useHolidays, useAllPayrolls } from '@/lib/hooks';
import { fullName, type AttendanceStatus } from '@/lib/types';
import { ymd, isWorkingDay, parseYmd } from '@/lib/attendance-utils';
import { exportAttendanceForDate } from '@/lib/excel-io';

export function MarkAttendance() {
  const [date, setDate] = useState<Date>(new Date());
  const [search, setSearch] = useState('');
  const [overrideConfirmed, setOverrideConfirmed] = useState<Set<string>>(new Set());
  const dateStr = ymd(date);
  const { data: employees, isLoading: le } = useEmployees();
  const { data: departments } = useDepartments();
  const { data: holidays } = useHolidays();
  const { data: records, isLoading: lr } = useAttendanceByDate(dateStr);
  const { data: allPayrolls } = useAllPayrolls();
  const upsert = useUpsertAttendance();
  const popRef = useRef<HTMLButtonElement>(null);

  // Reset override confirmation when date changes
  const [lastDate, setLastDate] = useState(dateStr);
  if (lastDate !== dateStr) {
    setLastDate(dateStr);
    setOverrideConfirmed(new Set());
  }

  const deptById = useMemo(() => new Map((departments ?? []).map(d => [d.id, d] as const)), [departments]);
  const holidayList = holidays ?? [];
  const holidayOnDate = holidayList.find(h => h.date === dateStr);

  const statusByEmp = useMemo(() => {
    const m = new Map<string, AttendanceStatus>();
    (records ?? []).forEach(r => m.set(r.employee_id, r.status));
    return m;
  }, [records]);

  /**
   * Build a set of employee IDs that have a payroll covering the selected date.
   * Attendance for these employees is locked unless the user explicitly overrides.
   */
  const lockedEmployeeIds = useMemo(() => {
    const locked = new Set<string>();
    for (const p of (allPayrolls ?? [])) {
      if (p.period_start <= dateStr && p.period_end >= dateStr) {
        locked.add(p.employee_id);
      }
    }
    return locked;
  }, [allPayrolls, dateStr]);

  const lockedCount = useMemo(() => {
    const active = (employees ?? []).filter(e => e.status === 'active' && e.joining_date && parseYmd(e.joining_date) <= date);
    return active.filter(e => lockedEmployeeIds.has(e.id) && !overrideConfirmed.has(e.id)).length;
  }, [employees, lockedEmployeeIds, overrideConfirmed, date]);

  // Filter: active + name match + joined on/before selected date
  const filtered = (employees ?? []).filter(e => {
    if (e.status !== 'active') return false;
    if (!fullName(e).toLowerCase().includes(search.toLowerCase())) return false;
    if (!e.joining_date) return true;
    return parseYmd(e.joining_date) <= date;
  });

  const isLocked = (empId: string) => lockedEmployeeIds.has(empId) && !overrideConfirmed.has(empId);

  const confirmOverride = (empId: string) => {
    if (confirm('⚠️ A payroll has already been generated for this period. Changing attendance now will NOT automatically update the payroll — you must delete and re-generate it. Proceed anyway?')) {
      setOverrideConfirmed(prev => new Set([...prev, empId]));
    }
  };

  const mark = async (employee_id: string, status: AttendanceStatus) => {
    if (isLocked(employee_id)) {
      confirmOverride(employee_id);
      return;
    }
    try {
      await upsert.mutateAsync([{ employee_id, date: dateStr, status }]);
    } catch {
      toast.error('Failed to save attendance');
    }
  };

  const markAll = async (status: AttendanceStatus) => {
    const unlocked = filtered.filter(e => !isLocked(e.id));
    const rows = unlocked.map(e => ({ employee_id: e.id, date: dateStr, status }));
    if (!rows.length) {
      toast.info('All employees on this date have payrolls generated — unlock individually if needed.');
      return;
    }
    try {
      await upsert.mutateAsync(rows);
      toast.success(`Marked ${rows.length} employees as ${status.replace('_', ' ')}`);
    } catch {
      toast.error('Failed');
    }
  };

  const doExport = () => {
    exportAttendanceForDate(dateStr, filtered, records ?? [], deptById);
    toast.success('Attendance exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Mark attendance</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={doExport} disabled={!filtered.length}>
            <Download className="mr-2 h-4 w-4" /> Export Excel
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button ref={popRef} variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={date} onSelect={d => d && setDate(d)} initialFocus className={cn('p-3 pointer-events-auto')} />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {holidayOnDate && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Holiday: <span className="font-semibold">{holidayOnDate.name}</span>
        </div>
      )}

      {lockedCount > 0 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900 flex items-start gap-2">
          <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold">{lockedCount} employee{lockedCount > 1 ? 's' : ''} locked</span> — payroll has already been generated for a period covering this date.
            Click <b>🔓</b> beside an employee to unlock and edit (you will need to re-generate their payroll after).
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search employees" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={() => markAll('present')}>Mark all present</Button>
          <Button size="sm" variant="outline" onClick={() => markAll('absent')}>Mark all absent</Button>
        </div>
      </div>

      {le || lr ? (
        <Skeleton className="h-96 w-full" />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
          No employees eligible on this date (only employees whose joining date is on or before the selected date are shown).
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {filtered.map(e => {
            const dept = e.department_id ? deptById.get(e.department_id) : null;
            const working = isWorkingDay(date, dept, holidayList);
            const cur = statusByEmp.get(e.id);
            const locked = isLocked(e.id);
            return (
              <div key={e.id} className={cn('flex flex-wrap items-center gap-3 p-3', locked && 'bg-orange-50/50')}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    {locked && <Lock className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />}
                    {fullName(e)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dept?.name ?? 'No department'} {!working && '· Non-working day'}
                    {locked && ' · Payroll generated — click 🔓 to unlock'}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {locked ? (
                    <button
                      onClick={() => confirmOverride(e.id)}
                      className="flex h-10 min-w-[52px] items-center justify-center gap-1 rounded-md border border-orange-300 bg-orange-100 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-200"
                      title="Payroll generated for this period — click to unlock"
                    >
                      🔓 Unlock
                    </button>
                  ) : working ? (
                    <>
                      <StatusBtn active={cur === 'present'} onClick={() => mark(e.id, 'present')} color="green" icon={<Check className="h-4 w-4" />} label="P" />
                      <StatusBtn active={cur === 'half_day'} onClick={() => mark(e.id, 'half_day')} color="amber" icon={<CircleSlash className="h-4 w-4" />} label="½" />
                      <StatusBtn active={cur === 'absent'} onClick={() => mark(e.id, 'absent')} color="red" icon={<X className="h-4 w-4" />} label="A" />
                    </>
                  ) : (
                    <>
                      <StatusBtn active={cur === 'extra_work'}      onClick={() => mark(e.id, 'extra_work')}      color="blue"   icon={<Star className="h-4 w-4" />} label="EW" />
                      <StatusBtn active={cur === 'half_extra_work'} onClick={() => mark(e.id, 'half_extra_work')} color="purple" icon={<Star className="h-4 w-4" />} label="½EW" />
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBtn({ active, onClick, color, icon, label }: { active: boolean; onClick: () => void; color: 'green' | 'amber' | 'red' | 'blue' | 'purple'; icon: React.ReactNode; label: string }) {
  const colors: Record<string, string> = {
    green:  active ? 'bg-emerald-600 text-white border-emerald-600' : 'hover:bg-emerald-50 hover:border-emerald-300',
    amber:  active ? 'bg-amber-500 text-white border-amber-500'     : 'hover:bg-amber-50 hover:border-amber-300',
    red:    active ? 'bg-red-600 text-white border-red-600'         : 'hover:bg-red-50 hover:border-red-300',
    blue:   active ? 'bg-blue-600 text-white border-blue-600'       : 'hover:bg-blue-50 hover:border-blue-300',
    purple: active ? 'bg-purple-600 text-white border-purple-600'   : 'hover:bg-purple-50 hover:border-purple-300',
  };
  return (
    <button onClick={onClick} className={cn('flex h-10 min-w-[52px] items-center justify-center gap-1 rounded-md border text-sm font-medium transition-colors', colors[color])}>
      {icon}<span>{label}</span>
    </button>
  );
}

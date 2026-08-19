import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DAYS_OF_WEEK, type Department, type Position } from '@/lib/types';
import { useDepartments, useSaveDepartment, usePositions } from '@/lib/hooks';
import { useBranches } from '@/lib/use-branches';

type PositionRow = {
  tempId: string;
  name: string;
  is_head: boolean;
  reports_to_temp: string | null;
};

function tid() { return Math.random().toString(36).slice(2, 10); }

/**
 * Detect if assigning `selectedParentId` as the parent of `currentId` would create a cycle.
 * Walks up the reports_to chain from selectedParentId; if it reaches currentId → cycle.
 */
function wouldCreateCycle(depts: Department[], currentId: string, selectedParentId: string): boolean {
  const visited = new Set<string>();
  let cur: string | null = selectedParentId;
  while (cur) {
    if (cur === currentId) return true;         // cycle detected
    if (visited.has(cur)) return false;         // existing cycle in data — stop to avoid infinite loop
    visited.add(cur);
    const dept = depts.find(d => d.id === cur);
    cur = dept?.reports_to_department_id ?? null;
  }
  return false;
}

export function DepartmentForm({ department, existingPositions }: { department?: Department; existingPositions?: Position[] }) {
  const navigate = useNavigate();
  const { data: departments = [] } = useDepartments();
  const branches = useBranches();
  const save = useSaveDepartment();

  const initialPositions: PositionRow[] = existingPositions?.length
    ? existingPositions.map(p => ({ tempId: p.id, name: p.name, is_head: p.is_head, reports_to_temp: p.reports_to_position_id }))
    : [{ tempId: tid(), name: '', is_head: true, reports_to_temp: null }];

  const [name, setName] = useState(department?.name ?? '');
  const [address, setAddress] = useState(department?.address ?? '');
  const [days, setDays] = useState<string[]>(department?.working_days_of_week ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [reportsTo, setReportsTo] = useState<string>(department?.reports_to_department_id ?? '');
  const [branchId, setBranchId] = useState<string>(department?.branch_id ?? '');
  const [positions, setPositions] = useState<PositionRow[]>(initialPositions);

  function toggleDay(d: string) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  }

  function updatePos(idx: number, patch: Partial<PositionRow>) {
    setPositions(prev => prev.map((p, i) => i === idx ? { ...p, ...patch } : p));
  }

  function addPos() {
    setPositions(prev => [...prev, { tempId: tid(), name: '', is_head: false, reports_to_temp: null }]);
  }

  function removePos(idx: number) {
    setPositions(prev => prev.filter((_, i) => i !== idx));
  }

  function handleReportsToChange(selectedId: string) {
    // Guard: prevent circular department hierarchy
    if (selectedId && department?.id) {
      if (wouldCreateCycle(departments, department.id, selectedId)) {
        toast.error('Cannot set this parent — it would create a circular department hierarchy. Department A cannot report to Department B if B already reports (directly or indirectly) to A.');
        return;
      }
    }
    setReportsTo(selectedId === 'none' ? '' : selectedId);
  }

  async function submit() {
    if (!name.trim()) return toast.error('Department name is required');
    if (!address.trim()) return toast.error('Address is required');
    if (days.length === 0) return toast.error('Select at least one working day');
    if (positions.length === 0) return toast.error('Add at least one position');
    if (positions.some(p => !p.name.trim())) return toast.error('All positions need a name');
    if (!positions.some(p => p.is_head)) return toast.error('At least one head position is required');

    // Final cycle check before saving (e.g. if departments list was stale)
    if (reportsTo && department?.id) {
      if (wouldCreateCycle(departments, department.id, reportsTo)) {
        return toast.error('Circular hierarchy detected — cannot save. Please change the "Reports to" selection.');
      }
    }

    const reportsToMap: Record<string, string | null> = {};
    positions.forEach(p => { reportsToMap[p.tempId] = p.reports_to_temp; });

    try {
      const deptId = await save.mutateAsync({
        id: department?.id,
        payload: {
          department: {
            name: name.trim(),
            address: address.trim(),
            working_days_of_week: days,
            reports_to_department_id: reportsTo || null,
            branch_id: branchId || null,
            latitude: department?.latitude ?? null,
            longitude: department?.longitude ?? null,
            device_id: department?.device_id ?? null,
            device_password: department?.device_password ?? null,
          },
          positions: positions.map(p => ({
            tempId: p.tempId,
            department_id: department?.id ?? '',
            name: p.name.trim(),
            is_head: p.is_head,
            reports_to_position_id: null,
          })),
          reportsToMap,
        },
      });
      toast.success(department ? 'Department updated' : 'Department added');
      navigate({ to: '/employees/departments/$id', params: { id: deptId } });
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save');
    }
  }

  // Exclude current department AND any departments that would create a cycle
  const parentOptions = departments.filter(d => {
    if (d.id === department?.id) return false; // can't report to itself
    if (department?.id && wouldCreateCycle(departments, department.id, d.id)) return false; // would create cycle
    return true;
  });

  const inputCls = 'min-h-[44px] sm:min-h-0';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-bold sm:text-2xl">{department ? 'Edit department' : 'Add department'}</h1>

      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Department name *</Label>
            <Input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Reports to (optional)</Label>
            <Select value={reportsTo || 'none'} onValueChange={handleReportsToChange}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {parentOptions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {parentOptions.length < departments.length - 1 && (
              <p className="text-xs text-muted-foreground">Some departments are hidden to prevent circular hierarchy.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Branch (optional)</Label>
            <Select value={branchId || 'none'} onValueChange={v => setBranchId(v === 'none' ? '' : v)}>
              <SelectTrigger className={inputCls}><SelectValue placeholder="No branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No branch</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.branch_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Address *</Label>
            <Textarea rows={2} value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Working days of week *</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(d => {
                const on = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`min-h-[40px] rounded-md border px-3 text-sm font-medium ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground'}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Positions</h2>
          <Button size="sm" variant="outline" onClick={addPos}><Plus className="mr-1 h-4 w-4" />Add position</Button>
        </div>
        <p className="text-xs text-muted-foreground">Tick <b>Head</b> for at least one position. Reporting can only point to another position within this department.</p>
        <div className="space-y-3">
          {positions.map((p, i) => (
            <div key={p.tempId} className="grid grid-cols-1 gap-3 rounded-md border bg-background p-3 sm:grid-cols-12 sm:items-end">
              <div className="space-y-1 sm:col-span-5">
                <Label className="text-xs">Position name *</Label>
                <Input className={inputCls} value={p.name} onChange={e => updatePos(i, { name: e.target.value })} />
              </div>
              <div className="space-y-1 sm:col-span-5">
                <Label className="text-xs">Reports to</Label>
                <Select
                  value={p.reports_to_temp ?? 'none'}
                  onValueChange={v => updatePos(i, { reports_to_temp: v === 'none' ? null : v })}
                >
                  <SelectTrigger className={inputCls}><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {positions.filter(o => o.tempId !== p.tempId && o.name.trim()).map(o => (
                      <SelectItem key={o.tempId} value={o.tempId}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-1">
                <Checkbox checked={p.is_head} onCheckedChange={c => updatePos(i, { is_head: c === true })} />
                Head
              </label>
              <div className="sm:col-span-1 flex sm:justify-end">
                <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-destructive" onClick={() => removePos(i)} disabled={positions.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" className="min-h-[44px]" onClick={() => navigate({ to: '/employees/departments' })} disabled={save.isPending}>Cancel</Button>
        <Button className="min-h-[44px]" onClick={submit} disabled={save.isPending}>
          {save.isPending ? 'Saving...' : department ? 'Save changes' : 'Add department'}
        </Button>
      </div>
    </div>
  );
}

export function DepartmentFormLoader({ department }: { department: Department }) {
  const { data, isLoading } = usePositions(department.id);
  if (isLoading) return <div className="text-sm text-muted-foreground">Loading...</div>;
  return <DepartmentForm department={department} existingPositions={data ?? []} />;
}

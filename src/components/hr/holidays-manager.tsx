import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Trash2, Plus, Download, Upload, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday, useBulkCreateHolidays, useDepartments } from '@/lib/hooks';
import type { Holiday } from '@/lib/types';
import { ymd } from '@/lib/attendance-utils';
import { exportHolidays, parseHolidays, readWorkbookFromFile, sheetToRows } from '@/lib/excel-io';

export function HolidaysManager() {
  const { data, isLoading } = useHolidays();
  const { data: departments = [] } = useDepartments();
  const create = useCreateHoliday();
  const update = useUpdateHoliday();
  const del = useDeleteHoliday();
  const bulk = useBulkCreateHolidays();

  // Add-form state
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exemptDeptIds, setExemptDeptIds] = useState<string[]>([]);

  // Which holiday row has its exemption panel open
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleDeptAdd = (id: string) =>
    setExemptDeptIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !name.trim()) { toast.error('Date and name required'); return; }
    try {
      await create.mutateAsync({
        date: ymd(date),
        name: name.trim(),
        description: description.trim() || null,
        exempt_department_ids: exemptDeptIds.length > 0 ? exemptDeptIds : null,
      });
      toast.success('Holiday added');
      setName(''); setDescription(''); setExemptDeptIds([]);
    } catch {
      toast.error('Failed to add — date may already exist');
    }
  };

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const wb = await readWorkbookFromFile(file);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = parseHolidays(sheetToRows(ws));
      if (!rows.length) { toast.error('No valid rows found'); return; }
      const n = await bulk.mutateAsync(rows);
      toast.success(`Imported ${n} holidays`);
    } catch (err) {
      toast.error((err as Error).message || 'Import failed');
    }
  };

  const deptById = new Map(departments.map(d => [d.id, d]));

  const saveExemptions = async (holiday: Holiday, ids: string[]) => {
    try {
      await update.mutateAsync({
        id: holiday.id,
        values: { exempt_department_ids: ids.length > 0 ? ids : null },
      });
      toast.success('Exemptions saved');
    } catch {
      toast.error('Failed to save exemptions');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-bold sm:text-2xl">Holidays</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => data && exportHolidays(data)} disabled={!data?.length}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <label>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImport} />
            <Button variant="outline" asChild><span><Upload className="mr-2 h-4 w-4" /> Import</span></Button>
          </label>
        </div>
      </div>

      {/* ── Add holiday form ── */}
      <form onSubmit={submit} className="rounded-lg border bg-card p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto]">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn('p-3 pointer-events-auto')} />
            </PopoverContent>
          </Popover>
          <Input placeholder="Holiday name (e.g. Diwali)" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <Button type="submit" disabled={create.isPending}><Plus className="mr-1 h-4 w-4" />Add</Button>
        </div>

        {departments.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              Exempt departments for this holiday (it becomes a normal working day for them):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {departments.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => toggleDeptAdd(d.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                    exemptDeptIds.includes(d.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {d.name}
                </button>
              ))}
            </div>
            {exemptDeptIds.length > 0 && (
              <p className="text-xs text-blue-700 dark:text-blue-400">
                {exemptDeptIds.length} dept{exemptDeptIds.length > 1 ? 's' : ''} exempted — this will be a normal working day for them.
              </p>
            )}
          </div>
        )}
      </form>

      {/* ── Holiday list ── */}
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.length ? (
        <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">No holidays yet.</div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {data.map(h => (
            <HolidayRow
              key={h.id}
              holiday={h}
              departments={departments}
              deptById={deptById}
              expanded={expandedId === h.id}
              onToggle={() => setExpandedId(prev => prev === h.id ? null : h.id)}
              onSave={ids => saveExemptions(h, ids)}
              onDelete={() => del.mutate(h.id)}
              saving={update.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HolidayRow({
  holiday, departments, deptById, expanded, onToggle, onSave, onDelete, saving,
}: {
  holiday: Holiday;
  departments: { id: string; name: string }[];
  deptById: Map<string, { name: string }>;
  expanded: boolean;
  onToggle: () => void;
  onSave: (ids: string[]) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [localIds, setLocalIds] = useState<string[]>(holiday.exempt_department_ids ?? []);

  // Sync if the holiday's exemptions change externally (e.g. after save)
  const savedIds = holiday.exempt_department_ids ?? [];

  const toggle = (id: string) =>
    setLocalIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  const exemptNames = savedIds.map(id => deptById.get(id)?.name).filter(Boolean) as string[];

  return (
    <div>
      <div className="flex items-center gap-3 p-3">
        <div className="w-24 shrink-0 text-sm font-medium">
          {format(new Date(holiday.date), 'dd MMM yyyy')}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{holiday.name}</div>
          {holiday.description && <div className="text-xs text-muted-foreground">{holiday.description}</div>}
          {exemptNames.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span className="text-xs text-muted-foreground">Working day for:</span>
              {exemptNames.map(n => (
                <Badge key={n} variant="secondary" className="text-xs px-1.5 py-0">{n}</Badge>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          title="Set department exemptions"
          className="text-xs gap-1 text-muted-foreground"
        >
          <Building2 className="h-3.5 w-3.5" />
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>

      {expanded && departments.length > 0 && (
        <div className="border-t bg-muted/30 px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Departments exempt from <span className="text-foreground font-semibold">{holiday.name}</span> (it becomes a working day for them):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {departments.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => toggle(d.id)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
                  localIds.includes(d.id)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-muted',
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={saving}
              onClick={() => { onSave(localIds); onToggle(); }}
            >
              {saving ? 'Saving…' : 'Save exemptions'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onToggle}>Cancel</Button>
            {localIds.length > 0 && (
              <span className="text-xs text-blue-700 dark:text-blue-400 ml-1">
                {localIds.length} dept{localIds.length > 1 ? 's' : ''} will treat this as a working day
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

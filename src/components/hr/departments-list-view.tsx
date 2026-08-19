import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Pencil, Trash2, Search, Building2, Download, Upload, Cpu, KeyRound, Copy, Check, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useDepartments, useDeleteDepartment, useEmployees, useAllPositions, useBulkCreateDepartments, useAppSettings } from '@/lib/hooks';
import { downloadDepartmentTemplate, exportDepartments, parseDepartments, readWorkbookFromFile, sheetToRows } from '@/lib/excel-io';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={e => { e.preventDefault(); handle(); }}
      className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export function DepartmentsListView() {
  const { data, isLoading } = useDepartments();
  const { data: employees = [] } = useEmployees();
  const { data: positions = [] } = useAllPositions();
  const { data: settings } = useAppSettings();
  const del = useDeleteDepartment();
  const bulk = useBulkCreateDepartments();
  const [q, setQ] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const moduleEnabled = settings?.attendance_module_enabled ?? false;

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const wb = await readWorkbookFromFile(file);
      const departmentsSheet = wb.Sheets['Departments'] ?? wb.Sheets[wb.SheetNames[0]];
      const positionsSheet = wb.Sheets['Positions'];
      const rows = parseDepartments(
        sheetToRows(departmentsSheet),
        positionsSheet ? sheetToRows(positionsSheet) : [],
      );
      if (!rows.length) { toast.error('No valid rows found'); return; }
      const n = await bulk.mutateAsync(rows);
      toast.success(`Imported ${n} departments`);
    } catch (err) {
      toast.error((err as Error).message || 'Import failed');
    }
  };

  const rows = useMemo(() => {
    const list = data ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter(d => !needle || d.name.toLowerCase().includes(needle) || d.address.toLowerCase().includes(needle));
  }, [data, q]);

  const empCount = (id: string) => employees.filter(e => e.department_id === id).length;
  const posCount = (id: string) => positions.filter(p => p.department_id === id).length;

  async function handleDelete(id: string) {
    try {
      await del.mutateAsync(id);
      toast.success('Department removed');
      setConfirmId(null);
    } catch {
      toast.error('Failed to remove');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Departments</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadDepartmentTemplate}>
            <FileSpreadsheet className="mr-1 h-4 w-4" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => data && exportDepartments(data, positions)} disabled={!data?.length}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <label>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImport} />
            <Button variant="outline" size="sm" asChild><span><Upload className="mr-1 h-4 w-4" /> Import</span></Button>
          </label>
          <Link to="/employees/departments/new">
            <Button size="sm" className="min-h-[44px] sm:min-h-0">
              <Plus className="mr-1 h-4 w-4" /> Add department
            </Button>
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9 min-h-[44px] sm:min-h-0" placeholder="Search by name or address" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border bg-card py-16 text-center">
          <Building2 className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">{data?.length === 0 ? 'No departments yet' : 'No matches'}</p>
          {data?.length === 0 && (
            <Link to="/employees/departments/new" className="mt-2">
              <Button variant="outline" size="sm">Add your first department</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map(d => (
            <div key={d.id} className="group rounded-lg border bg-card p-4 hover:border-primary/40 transition-colors">
              <Link to="/employees/departments/$id" params={{ id: d.id }} className="block">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold group-hover:underline">{d.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{d.address}</p>
                  </div>
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {d.working_days_of_week.map(day => (
                    <span key={day} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{day}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                  <span><b className="text-foreground">{empCount(d.id)}</b> employees</span>
                  <span><b className="text-foreground">{posCount(d.id)}</b> positions</span>
                </div>
                {moduleEnabled && (d.device_id || d.device_password) && (
                  <div className="mt-3 rounded-md border border-dashed border-primary/30 bg-primary/5 px-3 py-2 space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-primary uppercase tracking-wide">
                      <Cpu className="h-3 w-3" /> Device Credentials
                    </div>
                    {d.device_id && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground w-16 shrink-0">Device ID</span>
                        <span className="font-mono text-[11px] text-foreground truncate">{d.device_id}</span>
                        <CopyButton text={d.device_id} />
                      </div>
                    )}
                    {d.device_password && (
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-muted-foreground w-16 shrink-0">
                          <KeyRound className="inline h-3 w-3 mr-0.5" />Password
                        </span>
                        <span className="font-mono text-[11px] text-foreground truncate">{d.device_password}</span>
                        <CopyButton text={d.device_password} />
                      </div>
                    )}
                  </div>
                )}
              </Link>
              <div className="mt-3 flex justify-end gap-1 border-t pt-2">
                <Link to="/employees/departments/$id/edit" params={{ id: d.id }}>
                  <Button variant="ghost" size="icon" className="h-9 w-9"><Pencil className="h-4 w-4" /></Button>
                </Link>
                {confirmId === d.id ? (
                  <>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(d.id)} disabled={del.isPending}>Confirm</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Cancel</Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => setConfirmId(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

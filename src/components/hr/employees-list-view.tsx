import { useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Plus, Pencil, Trash2, Search, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useEmployees, useDeleteEmployee, useDepartments, useBulkCreateEmployees } from '@/lib/hooks';
import { fullName } from '@/lib/types';
import { cn } from '@/lib/utils';
import { exportEmployees, parseEmployees, readWorkbookFromFile, sheetToRows } from '@/lib/excel-io';

export function EmployeesListView() {
  const { data, isLoading } = useEmployees();
  const { data: departments = [] } = useDepartments();
  const del = useDeleteEmployee();
  const bulk = useBulkCreateEmployees();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const deptById = useMemo(() => new Map(departments.map(d => [d.id, d] as const)), [departments]);

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const wb = await readWorkbookFromFile(file);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = parseEmployees(sheetToRows(ws), departments);
      if (!rows.length) { toast.error('No valid rows found'); return; }
      const n = await bulk.mutateAsync(rows);
      toast.success(`Imported ${n} employees`);
    } catch (err) {
      toast.error((err as Error).message || 'Import failed');
    }
  };

  const rows = useMemo(() => {
    const list = data ?? [];
    const needle = q.trim().toLowerCase();
    return list.filter(e => {
      if (status !== 'all' && e.status !== status) return false;
      if (!needle) return true;
      return (
        e.first_name.toLowerCase().includes(needle) ||
        (e.middle_name?.toLowerCase().includes(needle) ?? false) ||
        e.last_name.toLowerCase().includes(needle) ||
        e.mobile.toLowerCase().includes(needle)
      );
    });
  }, [data, q, status]);

  async function handleDelete(id: string) {
    try {
      await del.mutateAsync(id);
      toast.success('Employee removed');
      setConfirmId(null);
    } catch {
      toast.error('Failed to remove');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Employees</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => data && exportEmployees(data, deptById)} disabled={!data?.length}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <label>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImport} />
            <Button variant="outline" size="sm" asChild><span><Upload className="mr-1 h-4 w-4" /> Import</span></Button>
          </label>
          <Link to="/employees/new">
            <Button size="sm" className="min-h-[44px] sm:min-h-0">
              <Plus className="mr-1 h-4 w-4" /> Add employee
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 min-h-[44px] sm:min-h-0"
            placeholder="Search by name or mobile"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={v => setStatus(v as typeof status)}>
          <SelectTrigger className="min-h-[44px] sm:min-h-0 sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border bg-card py-16 text-center">
          <p className="text-muted-foreground">
            {data?.length === 0 ? 'No employees yet' : 'No matches for the current filters'}
          </p>
          {data?.length === 0 && (
            <Link to="/employees/new" className="mt-2">
              <Button variant="outline" size="sm">Add your first employee</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Mobile</TableHead>
                <TableHead className="hidden md:table-cell">Joining</TableHead>
                <TableHead className="hidden md:table-cell">Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">
                    <Link to="/employees/$id" params={{ id: e.id }} className="hover:underline">
                      {fullName(e)}
                    </Link>
                    <div className="text-xs text-muted-foreground sm:hidden">{e.mobile}</div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{e.mobile}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{e.joining_date}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {e.work_start_time.slice(0, 5)} – {e.work_end_time.slice(0, 5)}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      e.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {e.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Link to="/employees/$id/edit" params={{ id: e.id }}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      {confirmId === e.id ? (
                        <>
                          <Button size="sm" variant="destructive" className="h-10 sm:h-8" onClick={() => handleDelete(e.id)} disabled={del.isPending}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="ghost" className="h-10 sm:h-8" onClick={() => setConfirmId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive" onClick={() => setConfirmId(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

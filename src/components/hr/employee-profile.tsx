import { Link } from '@tanstack/react-router';
import { Pencil, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmployee, useDepartments, useAllPositions } from '@/lib/hooks';
import { computeSalary, fullName } from '@/lib/types';
import { cn } from '@/lib/utils';
import { employeeDocumentsApi, type EmployeeDocumentRecord } from '@/lib/employee-documents';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
      <span className="text-sm sm:text-right">{value ?? '—'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4 sm:p-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function EmployeeProfile({ id }: { id: string }) {
  const { data: e, isLoading, error } = useEmployee(id);
  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = useAllPositions();
  const [documents, setDocuments] = useState<EmployeeDocumentRecord[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  useEffect(() => {
    if (!e) return;
    setDocumentsLoading(true);
    employeeDocumentsApi.list(e.id)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setDocumentsLoading(false));
  }, [e]);

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>;
  if (error || !e) return <div className="text-sm text-muted-foreground">Employee not found. <Link to="/employees" className="underline">Back to list</Link></div>;

  const salary = computeSalary(e);
  const dept = departments.find(d => d.id === e.department_id);
  const position = positions.find(p => p.id === e.position_id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <Link to="/employees/$id/edit" params={{ id: e.id }}>
          <Button size="sm" className="min-h-[44px] sm:min-h-0"><Pencil className="mr-1 h-4 w-4" />Edit</Button>
        </Link>
      </div>

      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{fullName(e)}</h1>
          <span className={cn(
            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
            e.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
          )}>{e.status}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{e.mobile}</p>
      </div>

      <Section title="Personal">
        <Row label="Full name" value={fullName(e)} />
        <Row label="Mobile" value={e.mobile} />
        <Row label="Address" value={e.address} />
        <Row label="Date of birth" value={e.dob} />
        <Row label="Gender" value={e.gender} />
      </Section>

      <Section title="Salary & working hours">
        <Row label="Joining date" value={e.joining_date} />
        <Row label="Working hours" value={`${e.work_start_time.slice(0, 5)} – ${e.work_end_time.slice(0, 5)}`} />
        <Row label="Basic" value={`₹${Number(e.basic_salary).toLocaleString('en-IN')}`} />
        <Row label="HRA" value={`₹${Number(e.hra).toLocaleString('en-IN')}`} />
        <Row label="Travel" value={`₹${Number(e.travel_allowance).toLocaleString('en-IN')}`} />
        <Row label="Special" value={`₹${Number(e.special_allowance).toLocaleString('en-IN')}`} />
        <Row label="Other" value={`₹${Number(e.other_allowance).toLocaleString('en-IN')}`} />
        <Row label="PF deduction" value={`−₹${Number(e.pf_deduction).toLocaleString('en-IN')}`} />
        <Row label="Tax deduction" value={`−₹${Number(e.tax_deduction).toLocaleString('en-IN')}`} />
        <div className="mt-2 border-t pt-2">
          <Row label="Gross" value={`₹${salary.gross.toLocaleString('en-IN')}`} />
          <Row label="Deductions" value={`−₹${salary.deductions.toLocaleString('en-IN')}`} />
          <div className="mt-1 flex justify-between text-base font-semibold">
            <span>Net</span><span>₹{salary.net.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </Section>

      <Section title="Department & role">
        <Row label="Department" value={dept ? <Link to="/employees/departments/$id" params={{ id: dept.id }} className="hover:underline">{dept.name}</Link> : '—'} />
        <Row label="Position" value={position ? `${position.name}${position.is_head ? ' (Head)' : ''}` : '—'} />
      </Section>

      <Section title="Other details">
        <Row label="Bank account number" value={e.bank_account_number} />
        <Row label="Bank branch name" value={e.bank_branch_name} />
        <Row label="Bank branch address" value={e.bank_branch_address} />
        <Row label="Bank IFSC code" value={e.bank_ifsc_code} />
        <Row label="Aadhaar number" value={e.aadhaar_number} />
        <Row label="PAN number" value={e.pan_number} />
        <Row
          label="Qualifications"
          value={e.qualifications?.length ? e.qualifications.join(', ') : '—'}
        />
        <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4">
          <span className="text-xs text-muted-foreground sm:text-sm">Documents</span>
          <div className="flex flex-col gap-1 text-sm sm:text-right">
            {documentsLoading && <span className="text-muted-foreground">Loading…</span>}
            {!documentsLoading && !documents.length && <span>—</span>}
            {documents.map(doc => (
              <button
                key={doc.id}
                type="button"
                className="text-primary underline-offset-2 hover:underline"
                onClick={async () => {
                  try {
                    const file = await employeeDocumentsApi.get(doc.id);
                    const link = document.createElement('a');
                    link.href = file.data_url;
                    link.download = file.original_name;
                    link.target = '_blank';
                    link.click();
                  } catch {
                    // The document remains listed if the file is unavailable.
                  }
                }}
              >
                {doc.original_name}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Status & emergency">
        <Row label="Status" value={e.status} />
        <Row label="Emergency contact" value={e.emergency_contact} />
        {e.status === 'inactive' && (
          <>
            <Row label="Reason" value={e.inactive_reason} />
            <Row label="Date of leaving" value={e.date_of_leaving} />
          </>
        )}
      </Section>
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { PayrollPending } from '@/components/hr/payroll-pending';

export const Route = createFileRoute('/payroll/pending')({
  component: PayrollPending,
});

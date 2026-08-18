import { createFileRoute } from '@tanstack/react-router';
import { PayrollHistory } from '@/components/hr/payroll-history';

export const Route = createFileRoute('/payroll/history')({
  component: PayrollHistory,
});
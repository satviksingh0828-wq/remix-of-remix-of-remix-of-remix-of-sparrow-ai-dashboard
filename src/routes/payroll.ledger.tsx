import { createFileRoute } from '@tanstack/react-router';
import { PayrollLedger } from '@/components/hr/payroll-ledger';

export const Route = createFileRoute('/payroll/ledger')({
  component: PayrollLedger,
});

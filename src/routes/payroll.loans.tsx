import { createFileRoute } from '@tanstack/react-router';
import { LoansView } from '@/components/hr/loans-view';

export const Route = createFileRoute('/payroll/loans')({
  component: () => <LoansView mode="loan" />,
});
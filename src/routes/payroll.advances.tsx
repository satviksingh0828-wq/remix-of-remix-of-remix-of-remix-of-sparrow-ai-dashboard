import { createFileRoute } from '@tanstack/react-router';
import { LoansView } from '@/components/hr/loans-view';

export const Route = createFileRoute('/payroll/advances')({
  component: () => <LoansView mode="advance" />,
});
import { createFileRoute } from '@tanstack/react-router';
import { LossDeductionsView } from '@/components/hr/loss-deductions-view';

export const Route = createFileRoute('/payroll/deductions')({
  component: LossDeductionsView,
});
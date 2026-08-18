import { createFileRoute } from '@tanstack/react-router';
import { PayrollGenerate } from '@/components/hr/payroll-generate';

export const Route = createFileRoute('/payroll/generate')({
  component: PayrollGenerate,
});
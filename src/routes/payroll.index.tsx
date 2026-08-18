import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/payroll/')({
  beforeLoad: () => { throw redirect({ to: '/payroll/generate' }); },
});
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { HrShell } from '@/components/hr/HrShell';
import { RequireHrAccess } from '@/components/HrAccess';

export const Route = createFileRoute('/payroll')({
  component: () => (
    <RequireHrAccess>
      <HrShell area="payroll">
        <Outlet />
      </HrShell>
    </RequireHrAccess>
  ),
});
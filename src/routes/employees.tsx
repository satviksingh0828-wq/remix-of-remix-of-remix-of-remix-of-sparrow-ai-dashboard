import { createFileRoute, Outlet } from '@tanstack/react-router';
import { HrShell } from '@/components/hr/HrShell';
import { RequireHrAccess } from '@/components/HrAccess';

export const Route = createFileRoute('/employees')({
  component: () => (
    <RequireHrAccess>
      <HrShell area="master">
        <Outlet />
      </HrShell>
    </RequireHrAccess>
  ),
});

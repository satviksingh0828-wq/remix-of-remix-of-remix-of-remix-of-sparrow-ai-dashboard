import { createFileRoute, Outlet } from '@tanstack/react-router';
import { HrShell } from '@/components/hr/HrShell';
import { RequireHrAccess } from '@/components/HrAccess';

export const Route = createFileRoute('/attendance')({
  component: () => (
    <RequireHrAccess>
      <HrShell area="attendance">
        <Outlet />
      </HrShell>
    </RequireHrAccess>
  ),
});
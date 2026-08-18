import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/attendance/history')({
  component: () => <Outlet />,
});
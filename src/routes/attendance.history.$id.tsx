import { createFileRoute } from '@tanstack/react-router';
import { EmployeeAttendanceDetail } from '@/components/hr/attendance-history';

export const Route = createFileRoute('/attendance/history/$id')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <EmployeeAttendanceDetail id={id} />;
}
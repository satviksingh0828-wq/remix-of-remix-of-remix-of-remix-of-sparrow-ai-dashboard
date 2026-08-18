import { createFileRoute } from '@tanstack/react-router';
import { EmployeeProfile } from '@/components/hr/employee-profile';

export const Route = createFileRoute('/employees/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <EmployeeProfile id={id} />;
}

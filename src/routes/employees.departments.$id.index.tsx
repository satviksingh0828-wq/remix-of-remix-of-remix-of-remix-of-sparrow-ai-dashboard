import { createFileRoute } from '@tanstack/react-router';
import { DepartmentProfile } from '@/components/hr/department-profile';

export const Route = createFileRoute('/employees/departments/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <DepartmentProfile id={id} />;
}

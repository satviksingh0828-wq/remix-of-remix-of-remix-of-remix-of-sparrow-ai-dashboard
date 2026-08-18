import { createFileRoute } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { DepartmentFormLoader } from '@/components/hr/department-form';
import { useDepartment } from '@/lib/hooks';

export const Route = createFileRoute('/employees/departments/$id/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data, isLoading } = useDepartment(id);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <div className="text-sm text-muted-foreground">Department not found.</div>;
  return <DepartmentFormLoader department={data} />;
}

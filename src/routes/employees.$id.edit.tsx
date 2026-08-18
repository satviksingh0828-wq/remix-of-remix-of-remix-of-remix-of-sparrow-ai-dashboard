import { createFileRoute } from '@tanstack/react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeForm } from '@/components/hr/employee-form';
import { useEmployee } from '@/lib/hooks';

export const Route = createFileRoute('/employees/$id/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { data, isLoading } = useEmployee(id);
  if (isLoading) return <Skeleton className="h-96 w-full" />;
  if (!data) return <div className="text-sm text-muted-foreground">Employee not found.</div>;
  return <EmployeeForm employee={data} />;
}

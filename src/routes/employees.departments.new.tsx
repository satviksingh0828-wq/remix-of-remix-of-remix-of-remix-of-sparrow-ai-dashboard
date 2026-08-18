import { createFileRoute } from '@tanstack/react-router';
import { DepartmentForm } from '@/components/hr/department-form';

export const Route = createFileRoute('/employees/departments/new')({
  component: () => <DepartmentForm />,
});

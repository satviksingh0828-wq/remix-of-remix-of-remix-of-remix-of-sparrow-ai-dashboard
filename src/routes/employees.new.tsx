import { createFileRoute } from '@tanstack/react-router';
import { EmployeeForm } from '@/components/hr/employee-form';

export const Route = createFileRoute('/employees/new')({
  component: () => <EmployeeForm />,
});

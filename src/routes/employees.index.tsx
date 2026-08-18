import { createFileRoute } from '@tanstack/react-router';
import { EmployeesListView } from '@/components/hr/employees-list-view';

export const Route = createFileRoute('/employees/')({
  component: EmployeesListView,
});

import { createFileRoute } from '@tanstack/react-router';
import { DepartmentsListView } from '@/components/hr/departments-list-view';

export const Route = createFileRoute('/employees/departments/')({
  component: DepartmentsListView,
});

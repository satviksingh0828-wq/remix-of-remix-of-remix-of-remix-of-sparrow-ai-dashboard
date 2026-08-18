import { createFileRoute } from '@tanstack/react-router';
import { MarkAttendance } from '@/components/hr/mark-attendance';

export const Route = createFileRoute('/attendance/mark')({
  component: MarkAttendance,
});
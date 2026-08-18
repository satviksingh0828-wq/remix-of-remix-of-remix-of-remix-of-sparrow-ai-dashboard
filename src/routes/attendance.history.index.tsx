import { createFileRoute } from '@tanstack/react-router';
import { AttendanceHistoryList } from '@/components/hr/attendance-history';

export const Route = createFileRoute('/attendance/history/')({
  component: AttendanceHistoryList,
});
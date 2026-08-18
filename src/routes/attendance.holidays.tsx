import { createFileRoute } from '@tanstack/react-router';
import { HolidaysManager } from '@/components/hr/holidays-manager';

export const Route = createFileRoute('/attendance/holidays')({
  component: HolidaysManager,
});
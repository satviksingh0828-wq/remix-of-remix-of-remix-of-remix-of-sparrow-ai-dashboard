import { createFileRoute } from '@tanstack/react-router';
import { IncrementAmountsView } from '@/components/hr/increment-amounts-view';
export const Route = createFileRoute('/payroll/increments')({ component: IncrementAmountsView });

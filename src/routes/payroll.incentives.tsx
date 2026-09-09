import { createFileRoute } from '@tanstack/react-router';
import { IncentiveAmountsView } from '@/components/hr/incentive-amounts-view';
export const Route = createFileRoute('/payroll/incentives')({ component: IncentiveAmountsView });

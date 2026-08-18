import { createFileRoute } from "@tanstack/react-router";
import { PayrollDashboard } from "@/components/hr/payroll-dashboard";
import { HrDashboardPage } from "@/components/hr/HrDashboardPage";

export const Route = createFileRoute("/dashboard/payroll")({
  component: () => (
    <HrDashboardPage>
      <PayrollDashboard />
    </HrDashboardPage>
  ),
});

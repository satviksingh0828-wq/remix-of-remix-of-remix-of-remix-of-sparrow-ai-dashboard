import { createFileRoute } from "@tanstack/react-router";
import { EmployeeDashboard } from "@/components/hr/employee-dashboard";
import { HrDashboardPage } from "@/components/hr/HrDashboardPage";

export const Route = createFileRoute("/dashboard/employee")({
  component: () => (
    <HrDashboardPage>
      <EmployeeDashboard />
    </HrDashboardPage>
  ),
});

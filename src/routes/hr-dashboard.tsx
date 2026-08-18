import { createFileRoute } from "@tanstack/react-router";
import { RequireHrAccess } from "@/components/HrAccess";
import { HrShell } from "@/components/hr/HrShell";
import { EmployeeDashboard } from "@/components/hr/employee-dashboard";

export const Route = createFileRoute("/hr-dashboard")({
  component: () => (
    <RequireHrAccess>
      <HrShell area="dashboard">
        <EmployeeDashboard />
      </HrShell>
    </RequireHrAccess>
  ),
});
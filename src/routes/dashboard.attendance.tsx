import { createFileRoute } from "@tanstack/react-router";
import { AttendanceDashboard } from "@/components/hr/attendance-dashboard";
import { HrDashboardPage } from "@/components/hr/HrDashboardPage";

export const Route = createFileRoute("/dashboard/attendance")({
  component: () => (
    <HrDashboardPage>
      <AttendanceDashboard />
    </HrDashboardPage>
  ),
});

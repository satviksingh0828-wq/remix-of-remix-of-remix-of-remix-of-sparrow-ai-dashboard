import { createFileRoute } from "@tanstack/react-router";
import { HrDashboardPage } from "@/components/hr/HrDashboardPage";

export const Route = createFileRoute("/dashboard/attendance")({
  component: () => <HrDashboardPage tab="attendance" />,
});

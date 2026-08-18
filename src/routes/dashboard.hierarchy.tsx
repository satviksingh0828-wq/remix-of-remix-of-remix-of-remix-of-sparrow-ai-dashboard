import { createFileRoute } from "@tanstack/react-router";
import { HrDashboardPage } from "@/components/hr/HrDashboardPage";

export const Route = createFileRoute("/dashboard/hierarchy")({
  component: () => <HrDashboardPage tab="hierarchy" />,
});

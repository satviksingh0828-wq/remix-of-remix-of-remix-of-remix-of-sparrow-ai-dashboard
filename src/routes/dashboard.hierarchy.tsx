import { createFileRoute } from "@tanstack/react-router";
import { HierarchyView } from "@/components/hr/hierarchy-view";
import { HrDashboardPage } from "@/components/hr/HrDashboardPage";

export const Route = createFileRoute("/dashboard/hierarchy")({
  component: () => (
    <HrDashboardPage>
      <HierarchyView />
    </HrDashboardPage>
  ),
});

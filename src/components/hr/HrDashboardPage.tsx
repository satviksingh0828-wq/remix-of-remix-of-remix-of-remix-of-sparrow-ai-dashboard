import { DashboardPage, type DashboardTabId } from "@/routes/dashboard.index";
import { RequireAuth } from "@/components/RequireAuth";

export function HrDashboardPage({ tab }: { tab: DashboardTabId }) {
  return (
    <RequireAuth>
      <DashboardPage initialTab={tab} />
    </RequireAuth>
  );
}

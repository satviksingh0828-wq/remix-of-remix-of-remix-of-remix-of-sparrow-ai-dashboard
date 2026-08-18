import type { ReactNode } from "react";
import { HrShell } from "@/components/hr/HrShell";
import { RequireHrAccess } from "@/components/HrAccess";

export function HrDashboardPage({ children }: { children: ReactNode }) {
  return (
    <RequireHrAccess>
      <HrShell area="dashboard">{children}</HrShell>
    </RequireHrAccess>
  );
}

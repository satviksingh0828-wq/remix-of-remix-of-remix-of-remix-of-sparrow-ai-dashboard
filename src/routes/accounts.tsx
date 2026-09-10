import { createFileRoute } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { WorkspaceModulePage } from "@/components/WorkspaceModulePage";

export const Route = createFileRoute("/accounts")({
  component: () => (
    <RequireAuth>
      <WorkspaceModulePage
        eyebrow="Workspace / Accounts"
        title="Accounts"
        description="Branch-linked bank and cash account masters with dated balance records."
        allowedRoles={["admin", "semi_admin", "viewer"]}
        tiles={[
          {
            key: "accounts-masters",
            label: "Masters",
            desc: "Bank and cash accounts",
            icon: Landmark,
            to: "/accounts/bank",
          },
        ]}
      />
    </RequireAuth>
  ),
});

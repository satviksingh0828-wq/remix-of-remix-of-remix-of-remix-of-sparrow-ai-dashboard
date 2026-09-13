import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Database, FileText, Settings2 } from "lucide-react";
import { AccountsAccessGuard } from "@/components/accounts/AccountsAccessGuard";
import { WorkspaceModulePage } from "@/components/WorkspaceModulePage";

export const Route = createFileRoute("/accounts/")({
  component: () => (
    <AccountsAccessGuard>
      <WorkspaceModulePage
        eyebrow="Workspace / Accounts"
        title="Accounts"
        description="Maintain the bank and cash account records for every branch."
        tiles={[
          {
            key: "masters",
            label: "Masters",
            desc: "Branch bank and cash account records",
            icon: Database,
            to: "/accounts/masters",
          },
          {
            key: "ledger",
            label: "Ledger",
            desc: "Create, list, view and export branch ledgers",
            icon: BookOpen,
            to: "/accounts/ledger",
          },
          {
            key: "journal",
            label: "Journal",
            desc: "Balanced journal entries and vouchers",
            icon: FileText,
            to: "/accounts/journal",
          },
          {
            key: "auto-rules",
            label: "Auto Rules",
            desc: "HRMS branch mapping and accounting automation",
            icon: Settings2,
            to: "/accounts/auto-rules",
          },
        ]}
      />
    </AccountsAccessGuard>
  ),
});

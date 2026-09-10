import { createFileRoute } from "@tanstack/react-router";
import { AccountsAccessGuard } from "@/components/accounts/AccountsAccessGuard";
import { AccountsMasterPage } from "@/components/accounts/AccountsMasterPage";

export const Route = createFileRoute("/accounts/masters/cash")({
  component: () => (
    <AccountsAccessGuard>
      <AccountsMasterPage kind="cash" />
    </AccountsAccessGuard>
  ),
});

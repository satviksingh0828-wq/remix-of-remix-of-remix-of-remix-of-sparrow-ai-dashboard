import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { AccountsMasterPage } from "@/components/accounts/AccountsMasterPage";

export const Route = createFileRoute("/accounts/cash")({
  component: () => (
    <RequireAuth>
      <AccountsMasterPage kind="cash" />
    </RequireAuth>
  ),
});

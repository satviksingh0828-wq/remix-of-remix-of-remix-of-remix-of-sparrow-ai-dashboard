import { createFileRoute, redirect } from "@tanstack/react-router";
import { AccountsRulesRoute } from "@/components/accounts/AccountsRulesPage";

export const Route = createFileRoute("/accounts/masters/rules")({
  beforeLoad: () => {
    throw redirect({ to: "/accounts/auto-rules", replace: true });
  },
  component: AccountsRulesRoute,
});

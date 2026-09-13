import { createFileRoute } from "@tanstack/react-router";
import { AccountsRulesRoute } from "@/components/accounts/AccountsRulesPage";

export const Route = createFileRoute("/accounts/auto-rules")({
  component: AccountsRulesRoute,
});

import { createFileRoute } from "@tanstack/react-router";
import { AccountsJournalRoute } from "@/components/accounts/AccountsJournalPage";

export const Route = createFileRoute("/accounts/journal")({
  component: AccountsJournalRoute,
});

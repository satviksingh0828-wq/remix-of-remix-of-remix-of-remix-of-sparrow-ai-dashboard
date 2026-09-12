import { createFileRoute } from "@tanstack/react-router";
import { AccountsLedgerRoute } from "@/components/accounts/AccountsLedgerPage";

export const Route = createFileRoute("/accounts/ledger")({
  component: AccountsLedgerRoute,
});

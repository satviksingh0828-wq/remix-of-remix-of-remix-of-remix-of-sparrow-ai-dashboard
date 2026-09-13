import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/accounts/masters/rules")({
  beforeLoad: () => {
    throw redirect({ to: "/accounts", replace: true });
  },
});

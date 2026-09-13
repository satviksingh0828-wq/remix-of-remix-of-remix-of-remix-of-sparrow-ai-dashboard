import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/accounts/auto-rules")({
  beforeLoad: () => {
    throw redirect({ to: "/accounts", replace: true });
  },
});

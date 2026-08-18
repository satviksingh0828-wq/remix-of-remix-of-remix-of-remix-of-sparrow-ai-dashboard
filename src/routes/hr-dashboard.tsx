import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/hr-dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/employee" });
  },
});

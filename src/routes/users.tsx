import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { UserList } from "@/components/users/UserList";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users — Project TMS | Sparrow AI Solutions" },
      {
        name: "description",
        content: "Manage operator accounts and branch access for Project TMS.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <UsersPage />
    </RequireAuth>
  ),
});

function UsersPage() {
  const { user } = useSession();
  const navigate = useNavigate();

  // Only admins can access this page
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate({ to: "/home", replace: true });
    }
  }, [user, navigate]);

  if (user?.role !== "admin") return null;

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">
            Workspace
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Users</span>
        </span>
      }
    >
      <UserList />
    </AppShell>
  );
}

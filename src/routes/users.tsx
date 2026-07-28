import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, ScrollText, Users } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { UserList } from "@/components/users/UserList";
import { LogsPanel } from "@/components/users/LogsPanel";
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

const TABS = [
  { id: "users", label: "Users", icon: Users },
  { id: "logs", label: "Activity Logs", icon: ScrollText },
] as const;
type TabId = (typeof TABS)[number]["id"];

function UsersPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("users");

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
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "users" ? <UserList /> : null}
      {tab === "logs" ? <LogsPanel /> : null}
    </AppShell>
  );
}

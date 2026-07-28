import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Fingerprint, ScrollText, Users } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { UserList } from "@/components/users/UserList";
import { LogsPanel } from "@/components/users/LogsPanel";
import { DevicesPanel } from "@/components/users/DevicesPanel";
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
  { id: "users",   label: "Users",               desc: "Accounts & branch access",          icon: Users },
  { id: "devices", label: "Devices",              desc: "Windows Hello / Passkey approvals", icon: Fingerprint },
  { id: "logs",    label: "Activity Logs",        desc: "Full audit trail",                  icon: ScrollText },
] as const;

type TabId = (typeof TABS)[number]["id"];

function UsersPage() {
  const { user } = useSession();
  const navigate  = useNavigate();
  const [tab, setTab] = useState<TabId>("users");

  useEffect(() => {
    if (user && user.role !== "admin") navigate({ to: "/home", replace: true });
  }, [user, navigate]);

  if (user?.role !== "admin") return null;

  const active = TABS.find(t => t.id === tab) ?? TABS[0];

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">Workspace</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Users</span>
        </span>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Users
          </p>
          <ul className="space-y-1">
            {TABS.map(t => {
              const Icon     = t.icon;
              const isActive = t.id === tab;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${
                      isActive
                        ? "bg-primary-soft text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? "text-primary" : ""}`} />
                    <span className="leading-tight">
                      <span className="block text-sm font-medium">{t.label}</span>
                      <span className="block text-[11px] opacity-70">{t.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div key={tab} className="animate-fade-in min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.desc}</p>
          </header>
          {tab === "users"   && <UserList />}
          {tab === "devices" && <DevicesPanel />}
          {tab === "logs"    && <LogsPanel />}
        </div>
      </div>
    </AppShell>
  );
}

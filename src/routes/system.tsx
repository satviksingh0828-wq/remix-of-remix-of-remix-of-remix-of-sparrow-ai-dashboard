import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  ShieldCheck,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { ErrorPanel } from "@/components/system/ErrorPanel";
import { DatabaseStats } from "@/components/system/DatabaseStats";
import { ProjectStats } from "@/components/system/ProjectStats";
import { SecurityPanel } from "@/components/system/SecurityPanel";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [
      { title: "System — Garuda Logistics Solutions" },
      { name: "description", content: "Admin system panel: error detection, database stats, and project info." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SystemPage />
    </RequireAuth>
  ),
});

const TABS = [
  {
    id:    "errors",
    label: "Error Panel",
    desc:  "Timestamp inconsistencies in closed trips",
    icon:  AlertTriangle,
  },
  {
    id:    "db",
    label: "Database Stats",
    desc:  "PostgreSQL system stats & storage",
    icon:  Database,
  },
  {
    id:    "security",
    label: "Security",
    desc:  "Passkeys, sessions & failed logins",
    icon:  ShieldCheck,
  },
  {
    id:    "project",
    label: "Project Stats",
    desc:  "Supabase project & Management API info",
    icon:  BarChart3,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function SystemPage() {
  const { user } = useSession();
  const navigate   = useNavigate();
  const [tab,     setTab]     = useState<TabId>("errors");
  const [navOpen, setNavOpen] = useState(true);

  // Admin-only guard
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
          <span className="text-foreground">System</span>
        </span>
      }
      headerEnd={
        <button
          type="button"
          onClick={() => setNavOpen(v => !v)}
          title={navOpen ? "Hide sidebar" : "Show sidebar"}
          className="hidden lg:flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {navOpen
            ? <><PanelLeftClose className="size-3.5" /><span>Hide sidebar</span></>
            : <><PanelLeftOpen  className="size-3.5" /><span>Show sidebar</span></>
          }
        </button>
      }
    >
      <div className={`grid gap-6 ${navOpen ? "lg:grid-cols-[220px_1fr]" : "grid-cols-1"}`}>
        {/* Desktop left nav */}
        {navOpen && (
          <nav className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              System
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
                      <Icon className={`size-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span className="leading-tight min-w-0">
                        <span className="block text-sm font-medium truncate">{t.label}</span>
                        <span className="block text-[11px] opacity-70 truncate">{t.desc}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* Mobile horizontal tab bar */}
        <div className="lg:hidden -mx-1">
          <div className="flex gap-1 overflow-x-auto pb-1 px-1 scrollbar-none">
            {TABS.map(t => {
              const Icon     = t.icon;
              const isActive = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content area */}
        <div key={tab} className="animate-fade-in min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.desc}</p>
          </header>

          {tab === "errors"   && <ErrorPanel />}
          {tab === "db"       && <DatabaseStats />}
          {tab === "security" && <SecurityPanel />}
          {tab === "project"  && <ProjectStats />}
        </div>
      </div>
    </AppShell>
  );
}

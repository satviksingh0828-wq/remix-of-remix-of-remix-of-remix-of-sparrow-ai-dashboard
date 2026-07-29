import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Car, ChevronRight, PanelLeftClose, PanelLeftOpen, Route as RouteIcon, TrendingUp, Users } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { ProfitLossPanel } from "@/components/dashboard/ProfitLossPanel";
import { EntityPnLPanel } from "@/components/dashboard/EntityPnLPanel";
import { TripSummaryPanel } from "@/components/dashboard/TripSummaryPanel";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Garuda Logistics Solutions | Sparrow AI Solutions" },
      { name: "description", content: "Profit & Loss overview with branch-wise breakdown and monthly trend charts." },
      { property: "og:title", content: "Dashboard — Garuda Logistics Solutions" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

const TABS = [
  { id: "pnl",          label: "Profit & Loss",  desc: "Revenue, costs & net P&L",          icon: TrendingUp },
  { id: "vehicles",     label: "Vehicles",        desc: "Vehicle-wise P&L & distribution",   icon: Car },
  { id: "drivers",      label: "Drivers",         desc: "Driver-wise P&L & performance",     icon: Users },
  { id: "transporters", label: "Transporters",    desc: "Transporter-wise P&L",              icon: BarChart3 },
  { id: "trips",        label: "Trips",           desc: "All trips — income & net",          icon: RouteIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

function DashboardPage() {
  const { user } = useSession();
  const navigate  = useNavigate();
  const [tab, setTab] = useState<TabId>("pnl");
  const [navOpen, setNavOpen] = useState(true);

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
          <span className="text-foreground">Dashboard</span>
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
        {/* ── Left nav (desktop) ── */}
        {navOpen && (
          <nav className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Dashboard
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

        {/* ── Mobile horizontal tab bar ── */}
        <div className="lg:hidden -mx-1">
          <div className="flex gap-1 overflow-x-auto pb-1 px-1 scrollbar-none">
            {TABS.map(t => {
              const Icon = t.icon;
              const isActive = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    isActive ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div key={tab} className="animate-fade-in min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.desc}</p>
          </header>
          {tab === "pnl"          && <ProfitLossPanel />}
          {tab === "vehicles"     && <EntityPnLPanel kind="vehicle" />}
          {tab === "drivers"      && <EntityPnLPanel kind="driver" />}
          {tab === "transporters" && <EntityPnLPanel kind="transporter" />}
          {tab === "trips"        && <TripSummaryPanel />}
        </div>
      </div>
    </AppShell>
  );
}

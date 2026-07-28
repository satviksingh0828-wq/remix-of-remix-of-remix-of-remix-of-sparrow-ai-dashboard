import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Car, ChevronRight, Route as RouteIcon, TrendingUp, Users } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { ProfitLossPanel } from "@/components/dashboard/ProfitLossPanel";
import { EntityPnLPanel } from "@/components/dashboard/EntityPnLPanel";
import { TripSummaryPanel } from "@/components/dashboard/TripSummaryPanel";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Project TMS | Sparrow AI Solutions" },
      { name: "description", content: "Profit & Loss overview with branch-wise breakdown and monthly trend charts." },
      { property: "og:title", content: "Dashboard — Project TMS" },
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
    >
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav className="lg:sticky lg:top-24 lg:self-start">
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

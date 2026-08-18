import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Car,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Route as RouteIcon,
  TrendingUp,
  Users,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { ProfitLossPanel } from "@/components/dashboard/ProfitLossPanel";
import { EntityPnLPanel } from "@/components/dashboard/EntityPnLPanel";
import { TripSummaryPanel } from "@/components/dashboard/TripSummaryPanel";
import { OwnVehicleTransporterComparison } from "@/components/dashboard/OwnVehicleTransporterComparison";
import { EmployeeDashboard } from "@/components/hr/employee-dashboard";
import { AttendanceDashboard } from "@/components/hr/attendance-dashboard";
import { PayrollDashboard } from "@/components/hr/payroll-dashboard";
import { HierarchyView } from "@/components/hr/hierarchy-view";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/dashboard/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Garuda Logistics Solutions | Orca Solutions" },
      {
        name: "description",
        content: "Profit & Loss overview with branch-wise breakdown and monthly trend charts.",
      },
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
  { id: "pnl", label: "Profit & Loss", desc: "Revenue, costs & net P&L", icon: TrendingUp },
  { id: "vehicles", label: "Vehicles", desc: "Vehicle-wise P&L & distribution", icon: Car },
  { id: "drivers", label: "Drivers", desc: "Driver-wise P&L & performance", icon: Users },
  { id: "transporters", label: "Transporters", desc: "Transporter-wise P&L", icon: BarChart3 },
  { id: "trips", label: "Trips", desc: "All trips — income & net", icon: RouteIcon },
  {
    id: "own-vs-transporter",
    label: "Own vs Transporter",
    desc: "Compare own vehicles and hired transporters",
    icon: Car,
  },
  {
    id: "employee",
    label: "Employee dashboard",
    desc: "Employee and department insights",
    icon: Users,
    hr: true,
  },
  {
    id: "attendance",
    label: "Attendance dashboard",
    desc: "Attendance trends and summaries",
    icon: Users,
    hr: true,
  },
  {
    id: "payroll",
    label: "Payroll dashboard",
    desc: "Salary, loans and deductions",
    icon: BarChart3,
    hr: true,
  },
  {
    id: "hierarchy",
    label: "Hierarchy",
    desc: "Department reporting structure",
    icon: Users,
    hr: true,
  },
] as const;

export type DashboardTabId = (typeof TABS)[number]["id"];

export function DashboardPage({ initialTab }: { initialTab?: DashboardTabId }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const isManager = user?.role === "viewer";
  const visibleTabs = isManager ? TABS.filter((item) => "hr" in item && item.hr) : TABS;
  const fallbackTab: DashboardTabId = isManager ? "employee" : "pnl";
  const requestedTab = initialTab ?? fallbackTab;
  const [tab, setTab] = useState<DashboardTabId>(requestedTab);
  const [navOpen, setNavOpen] = useState(true);

  useEffect(() => {
    if (user?.role === "basic") navigate({ to: "/home", replace: true });
  }, [user, navigate]);

  if (user?.role !== "admin" && user?.role !== "viewer") return null;

  const safeTab = visibleTabs.some((item) => item.id === tab) ? tab : fallbackTab;
  const active = TABS.find((t) => t.id === safeTab) ?? TABS[0];

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">
            Workspace
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Dashboard</span>
        </span>
      }
      headerEnd={
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          title={navOpen ? "Hide sidebar" : "Show sidebar"}
          className="hidden lg:flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {navOpen ? (
            <>
              <PanelLeftClose className="size-3.5" />
              <span>Hide sidebar</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="size-3.5" />
              <span>Show sidebar</span>
            </>
          )}
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
              {visibleTabs.map((t) => {
                const Icon = t.icon;
                const isActive = t.id === safeTab;
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
            {visibleTabs.map((t) => {
              const Icon = t.icon;
              const isActive = t.id === safeTab;
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

        <div key={safeTab} className="animate-fade-in min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.desc}</p>
          </header>
          {safeTab === "pnl" && <ProfitLossPanel />}
          {safeTab === "vehicles" && <EntityPnLPanel kind="vehicle" />}
          {safeTab === "drivers" && <EntityPnLPanel kind="driver" />}
          {safeTab === "transporters" && <EntityPnLPanel kind="transporter" />}
          {safeTab === "trips" && <TripSummaryPanel />}
          {safeTab === "own-vs-transporter" && <OwnVehicleTransporterComparison />}
          {safeTab === "employee" && <EmployeeDashboard />}
          {safeTab === "attendance" && <AttendanceDashboard />}
          {safeTab === "payroll" && <PayrollDashboard />}
          {safeTab === "hierarchy" && <HierarchyView />}
        </div>
      </div>
    </AppShell>
  );
}

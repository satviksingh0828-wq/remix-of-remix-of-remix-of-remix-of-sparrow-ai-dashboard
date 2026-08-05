import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart2, CalendarCheck, CalendarRange, ChevronRight, DollarSign, PanelLeftClose, PanelLeftOpen, Route as RouteIcon, TrendingDown, TrendingUp, Upload, Users } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { TabErrorBoundary } from "@/components/TabErrorBoundary";
import { Trips } from "@/components/operations/Trips";
import { FinanceList } from "@/components/operations/FinanceList";
import { FixedIncomeList } from "@/components/operations/FixedIncomeList";
import { TripAveragesPanel } from "@/components/operations/TripAveragesPanel";
import { EmiScheduler } from "@/components/operations/EmiScheduler";
import { YearlyExpenseScheduler } from "@/components/operations/YearlyExpenseScheduler";
import { DriverPayroll } from "@/components/operations/DriverPayroll";
import { TripImport } from "@/components/import/TripImport";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/operations")({
  head: () => ({
    meta: [
      { title: "Operations — Garuda Logistics Solutions | Orca Solutions" },
      {
        name: "description",
        content: "Plan and record trips with manifests, contract-based freight, other income, expenses and a profit summary.",
      },
      { property: "og:title", content: "Operations — Garuda Logistics Solutions" },
      { property: "og:description", content: "Trips, manifests, income and expenses for Garuda Logistics Solutions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <OperationsPage />
    </RequireAuth>
  ),
});

const ALL_TABS = [
  { id: "trip",              label: "Trip",                desc: "Manifests, income & expenses",    icon: RouteIcon,      adminOnly: false, dividerBefore: false },
  { id: "income",            label: "Income",              desc: "Other income, branch-wise",       icon: TrendingUp,     adminOnly: false, dividerBefore: false },
  { id: "expenditure",       label: "Expenditure",         desc: "Other spend, branch-wise",        icon: TrendingDown,   adminOnly: false, dividerBefore: false },
  { id: "driver-payroll",    label: "Driver Payroll",      desc: "Salary, advances & deductions",   icon: Users,          adminOnly: false, dividerBefore: false },
  { id: "fixed-income",      label: "Fixed Income",        desc: "Contract recurring charges",      icon: DollarSign,     adminOnly: true,  dividerBefore: false },
  { id: "trip-averages",     label: "Trip Averages",       desc: "Monthly distribution analysis",  icon: BarChart2,      adminOnly: true,  dividerBefore: false },
  { id: "emi-scheduler",     label: "EMI Scheduler",       desc: "Vehicle loan & EMI tracker",      icon: CalendarCheck,  adminOnly: true,  dividerBefore: false },
  { id: "yearly-expenses",   label: "Yearly Expenses",     desc: "Fixed yearly cost tracker",       icon: CalendarRange,  adminOnly: true,  dividerBefore: false },
  { id: "import-trips",      label: "Import Trips",        desc: "Bulk import historical trips",    icon: Upload,         adminOnly: true,  dividerBefore: true  },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

function OperationsPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const isViewer = user?.role === "viewer";

  const TABS = ALL_TABS.filter(t => isViewer ? t.id !== "import-trips" : isAdmin || !t.adminOnly);
  const [tab, setTab]     = useState<TabId>("trip");
  const [navOpen, setNavOpen] = useState(true);

  const safeTab: TabId = (TABS.find(t => t.id === tab) ? tab : "trip") as TabId;
  const active = TABS.find(t => t.id === safeTab) ?? TABS[0];

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">Workspace</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Operations</span>
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
              Operations
            </p>
            <ul className="space-y-1">
              {TABS.map(t => {
                const Icon     = t.icon;
                const isActive = t.id === safeTab;
                return (
                  <li key={t.id}>
                    {t.dividerBefore && (
                      <div className="my-2 border-t border-border" />
                    )}
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
              const isActive = t.id === safeTab;
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

        <div key={safeTab} className="animate-fade-in min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active?.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active?.desc}</p>
          </header>
          {safeTab === "trip"            && <TabErrorBoundary label="Trip"><Trips /></TabErrorBoundary>}
          {safeTab === "income"          && <TabErrorBoundary label="Income"><FinanceList kind="income" /></TabErrorBoundary>}
          {safeTab === "expenditure"     && <TabErrorBoundary label="Expenditure"><FinanceList kind="expenditure" /></TabErrorBoundary>}
          {safeTab === "driver-payroll"  && <TabErrorBoundary label="Driver Payroll"><DriverPayroll /></TabErrorBoundary>}
          {safeTab === "fixed-income"    && (isAdmin || isViewer) && <TabErrorBoundary label="Fixed Income"><FixedIncomeList /></TabErrorBoundary>}
          {safeTab === "trip-averages"   && (isAdmin || isViewer) && <TabErrorBoundary label="Trip Averages"><TripAveragesPanel /></TabErrorBoundary>}
          {safeTab === "emi-scheduler"   && (isAdmin || isViewer) && <TabErrorBoundary label="EMI Scheduler"><EmiScheduler /></TabErrorBoundary>}
          {safeTab === "yearly-expenses" && (isAdmin || isViewer) && <TabErrorBoundary label="Yearly Expenses"><YearlyExpenseScheduler /></TabErrorBoundary>}
          {safeTab === "import-trips"    && isAdmin && <TabErrorBoundary label="Import Trips"><TripImport embedded /></TabErrorBoundary>}
        </div>
      </div>
    </AppShell>
  );
}

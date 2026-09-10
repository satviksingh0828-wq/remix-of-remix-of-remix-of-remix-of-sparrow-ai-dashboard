import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  BarChart2,
  ArrowLeft,
  ArrowRight,
  Banknote,
  CalendarCheck,
  CalendarRange,
  ClipboardList,
  ChevronRight,
  Database,
  DollarSign,
  CreditCard,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Route as RouteIcon,
  Landmark,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { MobileTabDropdown } from "@/components/MobileTabDropdown";
import { TabErrorBoundary } from "@/components/TabErrorBoundary";
import { Trips } from "@/components/operations/Trips";
import { FinanceList } from "@/components/operations/FinanceList";
import { FixedIncomeList } from "@/components/operations/FixedIncomeList";
import { TripAveragesPanel } from "@/components/operations/TripAveragesPanel";
import { TripDetailsPanel } from "@/components/operations/TripDetailsPanel";
import { EmiScheduler } from "@/components/operations/EmiScheduler";
import { YearlyExpenseScheduler } from "@/components/operations/YearlyExpenseScheduler";
import { DriverPayroll } from "@/components/operations/DriverPayroll";
import { TripImport } from "@/components/import/TripImport";
import { useSession } from "@/lib/session";
import { isAdminLike } from "@/lib/roles";
import { MonthlyMIS } from "@/components/operations/MonthlyMIS";
import { FastagLedger } from "@/components/reports/FastagLedger";
import { ReportFiltersContext } from "@/lib/report-filters";

export const Route = createFileRoute("/operations")({
  head: () => ({
    meta: [
      { title: "Operations — Garuda Logistics Solutions | ORCA DEVS SURF" },
      {
        name: "description",
        content:
          "Plan and record trips with manifests, contract-based freight, other income, expenses and a profit summary.",
      },
      { property: "og:title", content: "Operations — Garuda Logistics Solutions" },
      {
        property: "og:description",
        content: "Trips, manifests, income and expenses for Garuda Logistics Solutions.",
      },
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
  {
    id: "monthly-mis",
    label: "Monthly MIS",
    desc: "Monthly branch compliance",
    icon: ClipboardList,
    adminOnly: false,
    dividerBefore: false,
  },
  {
    id: "trip",
    label: "Trip",
    desc: "Manifests, income & expenses",
    icon: RouteIcon,
    adminOnly: false,
    dividerBefore: false,
  },
  {
    id: "income",
    label: "Income",
    desc: "Other income, branch-wise",
    icon: TrendingUp,
    adminOnly: false,
    dividerBefore: false,
  },
  {
    id: "expenditure",
    label: "Expenditure",
    desc: "Other spend, branch-wise",
    icon: TrendingDown,
    adminOnly: false,
    dividerBefore: false,
  },
  {
    id: "driver-payroll",
    label: "Driver Payroll",
    desc: "Salary, advances & deductions",
    icon: Users,
    adminOnly: false,
    dividerBefore: false,
  },
  {
    id: "fixed-income",
    label: "Fixed Income",
    desc: "Contract recurring charges",
    icon: DollarSign,
    adminOnly: true,
    dividerBefore: false,
  },
  {
    id: "trip-averages",
    label: "Trip Averages",
    desc: "Monthly distribution analysis",
    icon: BarChart2,
    adminOnly: true,
    dividerBefore: false,
  },
  {
    id: "trip-details",
    label: "Booking Report",
    desc: "Your branch booking and expense report",
    icon: FileText,
    adminOnly: false,
    basicOnly: true,
    dividerBefore: false,
  },
  {
    id: "fastag-report",
    label: "Fastag Report",
    desc: "Branch vehicle balances & recharges",
    icon: CreditCard,
    adminOnly: false,
    basicOnly: true,
    dividerBefore: false,
  },
  {
    id: "emi-scheduler",
    label: "EMI Scheduler",
    desc: "Vehicle loan & EMI tracker",
    icon: CalendarCheck,
    adminOnly: true,
    dividerBefore: false,
  },
  {
    id: "yearly-expenses",
    label: "Yearly Expenses",
    desc: "Fixed yearly cost tracker",
    icon: CalendarRange,
    adminOnly: true,
    dividerBefore: false,
  },
  {
    id: "import-trips",
    label: "Import Trips",
    desc: "Bulk import historical trips",
    icon: Upload,
    adminOnly: true,
    dividerBefore: true,
  },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];
type OperationsView = "workspace" | "trips" | "masters";

function OperationsPage() {
  const { user } = useSession();
  const isAdmin = isAdminLike(user?.role);
  const isViewer = user?.role === "viewer";

  const TABS = ALL_TABS.filter((t) => {
    if ("basicOnly" in t && t.basicOnly && user?.role !== "basic") return false;
    return isViewer ? t.id !== "import-trips" && t.id !== "monthly-mis" : isAdmin || !t.adminOnly;
  });
  const [view, setView] = useState<OperationsView>("workspace");
  const [tab, setTab] = useState<TabId>("trip");
  const [navOpen, setNavOpen] = useState(true);

  const safeTab: TabId = (TABS.find((t) => t.id === tab) ? tab : "trip") as TabId;
  const active = TABS.find((t) => t.id === safeTab) ?? TABS[0];

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">
            Workspace
          </Link>
          <ChevronRight className="size-3.5" />
          <Link to="/tms" className="hover:text-foreground">
            TMS
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Operations</span>
          {view === "trips" && (
            <>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Trip workspace</span>
            </>
          )}
          {view === "masters" && (
            <>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Master</span>
            </>
          )}
        </span>
      }
      headerEnd={
        view !== "workspace" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView("workspace")}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              <span>Operation workspace</span>
            </button>
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
          </div>
        ) : null
      }
    >
      {view === "workspace" ? (
        <OperationWorkspace
          onOpenTrips={() => setView("trips")}
          onOpenMasters={() => setView("masters")}
        />
      ) : view === "masters" ? (
        <OperationMasterWorkspace />
      ) : (
        <div
          className={`grid items-start gap-6 ${navOpen ? "lg:grid-cols-[220px_1fr]" : "grid-cols-1"}`}
        >
          {/* Desktop left nav */}
          {navOpen && (
            <nav className="app-sidebar-scroll hidden lg:block lg:fixed lg:left-[max(1.5rem,calc((100vw-1280px)/2+1.5rem))] lg:top-20 lg:h-[calc(100dvh-5rem)] lg:w-[220px] lg:max-h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Operations
              </p>
              <ul className="space-y-1">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const isActive = t.id === safeTab;
                  return (
                    <li key={t.id}>
                      {t.dividerBefore && <div className="my-2 border-t border-border" />}
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

          {/* Mobile dropdown navigation */}
          <MobileTabDropdown tabs={TABS} activeId={safeTab} label="Operations" onChange={setTab} />

          <div className={`animate-fade-in min-w-0 ${navOpen ? "lg:col-start-2" : ""}`}>
            <header className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">{active?.label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{active?.desc}</p>
            </header>
            {safeTab === "trip" && (
              <TabErrorBoundary label="Trip">
                <Trips />
              </TabErrorBoundary>
            )}
            {safeTab === "income" && (
              <TabErrorBoundary label="Income">
                <FinanceList kind="income" />
              </TabErrorBoundary>
            )}
            {safeTab === "expenditure" && (
              <TabErrorBoundary label="Expenditure">
                <FinanceList kind="expenditure" />
              </TabErrorBoundary>
            )}
            {safeTab === "driver-payroll" && (
              <TabErrorBoundary label="Driver Payroll">
                <DriverPayroll />
              </TabErrorBoundary>
            )}
            {safeTab === "monthly-mis" && !isViewer && (
              <TabErrorBoundary label="Monthly MIS">
                <MonthlyMIS />
              </TabErrorBoundary>
            )}
            {safeTab === "fixed-income" && (isAdmin || isViewer) && (
              <TabErrorBoundary label="Fixed Income">
                <FixedIncomeList />
              </TabErrorBoundary>
            )}
            {safeTab === "trip-averages" && (isAdmin || isViewer) && (
              <TabErrorBoundary label="Trip Averages">
                <TripAveragesPanel />
              </TabErrorBoundary>
            )}
            {safeTab === "trip-details" && user?.role === "basic" && (
              <TabErrorBoundary label="Booking Report">
                <TripDetailsPanel />
              </TabErrorBoundary>
            )}
            {safeTab === "fastag-report" && user?.role === "basic" && (
              <TabErrorBoundary label="Fastag Report">
                <ReportFiltersContext.Provider value={{ branchId: "all", financialYear: "none" }}>
                  <FastagLedger />
                </ReportFiltersContext.Provider>
              </TabErrorBoundary>
            )}
            {safeTab === "emi-scheduler" && (isAdmin || isViewer) && (
              <TabErrorBoundary label="EMI Scheduler">
                <EmiScheduler />
              </TabErrorBoundary>
            )}
            {safeTab === "yearly-expenses" && (isAdmin || isViewer) && (
              <TabErrorBoundary label="Yearly Expenses">
                <YearlyExpenseScheduler />
              </TabErrorBoundary>
            )}
            {safeTab === "import-trips" && isAdmin && (
              <TabErrorBoundary label="Import Trips">
                <TripImport embedded />
              </TabErrorBoundary>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function OperationWorkspace({
  onOpenTrips,
  onOpenMasters,
}: {
  onOpenTrips: () => void;
  onOpenMasters: () => void;
}) {
  return (
    <div className="animate-fade-up">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
        Workspace / TMS / Operation
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Operation</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Manage trip activity and the cash and bank accounts used by operations.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenTrips}
          className="group surface-card animate-fade-up relative flex h-44 flex-col items-start p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <RouteIcon className="size-5" />
          </span>
          <span className="mt-4 block text-base font-semibold tracking-tight">Trip</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Manifests, income, expenses and trip reports
          </span>
          <ArrowRight className="absolute bottom-6 right-6 size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
        </button>

        <button
          type="button"
          onClick={onOpenMasters}
          className="group surface-card animate-fade-up relative flex h-44 flex-col items-start p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
          style={{ animationDelay: "55ms" }}
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Database className="size-5" />
          </span>
          <span className="mt-4 block text-base font-semibold tracking-tight">Master</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Cash and bank account masters
          </span>
          <ArrowRight className="absolute bottom-6 right-6 size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
        </button>
      </div>
    </div>
  );
}

function OperationMasterWorkspace() {
  return (
    <div className="animate-fade-up">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">
        Operation / Master
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Master</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Choose an account master to manage.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Link
          to="/accounts/cash"
          className="group surface-card animate-fade-up relative flex h-40 flex-col items-start p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Banknote className="size-5" />
          </span>
          <span className="mt-4 block text-base font-semibold tracking-tight">Cash</span>
          <span className="mt-1 block text-xs text-muted-foreground">Branch cash accounts</span>
          <ArrowRight className="absolute bottom-6 right-6 size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
        </Link>
        <Link
          to="/accounts/bank"
          className="group surface-card animate-fade-up relative flex h-40 flex-col items-start p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
          style={{ animationDelay: "55ms" }}
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Landmark className="size-5" />
          </span>
          <span className="mt-4 block text-base font-semibold tracking-tight">Bank</span>
          <span className="mt-1 block text-xs text-muted-foreground">Branch bank accounts</span>
          <ArrowRight className="absolute bottom-6 right-6 size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
        </Link>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Car,
  ChevronRight,
  CreditCard,
  FileBarChart,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { ProfitLossComparison } from "@/components/reports/ProfitLossComparison";
import { CoverageLedger } from "@/components/reports/CoverageLedger";
import { FastagLedger } from "@/components/reports/FastagLedger";
import { VehicleExpenseReport } from "@/components/reports/VehicleExpenseReport";
import { DriverExpenseReport } from "@/components/reports/DriverExpenseReport";
import { TransporterExpenseReport } from "@/components/reports/TransporterExpenseReport";
import { OtherExpenseReport } from "@/components/reports/OtherExpenseReport";
import { ApprovalChargeAdvanceReport } from "@/components/reports/ApprovalChargeAdvanceReport";
import { MonthlyMISReport } from "@/components/reports/MonthlyMISReport";
import { useSession } from "@/lib/session";
import { ReportFiltersContext } from "@/lib/report-filters";
import { useBranches } from "@/lib/use-branches";
import { financialYearOptions } from "@/lib/financial-year";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Garuda Logistics Solutions | Orca Solutions" },
      {
        name: "description",
        content: "Compare P&L between two periods with detailed charts and breakdowns.",
      },
      { property: "og:title", content: "Reports — Garuda Logistics Solutions" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ReportsPage />
    </RequireAuth>
  ),
});

const TABS = [
  {
    id: "monthly-mis",
    label: "Monthly MIS",
    desc: "Depot submissions & compliance",
    icon: ClipboardList,
  },
  {
    id: "pnl-compare",
    label: "P&L Comparison",
    desc: "Compare two periods side-by-side",
    icon: FileBarChart,
  },
  {
    id: "insurance",
    label: "Insurance Premium Ledger",
    desc: "Vehicle insurance expenses",
    icon: Shield,
  },
  { id: "road-tax", label: "Road Tax Ledger", desc: "Vehicle road tax expenses", icon: FileText },
  {
    id: "fastag",
    label: "Fastag Balance",
    desc: "Vehicle-wise fastag balance & recharges",
    icon: CreditCard,
  },
  {
    id: "vehicle-expenses",
    label: "Vehicle Expenses",
    desc: "Fuel, parking & distance per vehicle",
    icon: Truck,
  },
  {
    id: "driver-expenses",
    label: "Driver Expenses",
    desc: "Bata, morning & night exp per driver",
    icon: Users,
  },
  {
    id: "transporter-expenses",
    label: "TRANSPORTER Expenses",
    desc: "Hire charges & approval charge per transporter",
    icon: Car,
  },
  {
    id: "approval-advances",
    label: "Transpoter advance",
    desc: "Transporter paid amount and balance by date",
    icon: WalletCards,
  },
  {
    id: "other-expenses",
    label: "Other Expenses",
    desc: "Dala, unloading, Sunday & other trip costs",
    icon: BarChart3,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ReportsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>("pnl-compare");
  const [navOpen, setNavOpen] = useState(true);
  const [branchId, setBranchId] = useState("all");
  const [financialYear, setFinancialYear] = useState("none");
  const branches = useBranches();
  const financialYears = financialYearOptions();

  useEffect(() => {
    if (user && user.role !== "admin" && user.role !== "viewer")
      navigate({ to: "/home", replace: true });
  }, [user, navigate]);

  if (user?.role !== "admin" && user?.role !== "viewer") return null;

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">
            Workspace
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Reports</span>
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
              Reports
            </p>
            <ul className="space-y-1">
              {TABS.map((t) => {
                const Icon = t.icon;
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
            {TABS.map((t) => {
              const Icon = t.icon;
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

        <ReportFiltersContext.Provider value={{ branchId, financialYear }}>
          <div key={tab} className="animate-fade-in min-w-0">
            <header className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight">{active.label}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{active.desc}</p>
            </header>
            {tab !== "pnl-compare" && tab !== "monthly-mis" && (
              <div className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-3">
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger className="h-9 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.branch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={financialYear} onValueChange={setFinancialYear}>
                  <SelectTrigger className="h-9 w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Financial Year: None</SelectItem>
                    {financialYears.map((fy) => (
                      <SelectItem key={fy.value} value={fy.value}>
                        FY {fy.label} (Apr–Mar)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {tab === "pnl-compare" && <ProfitLossComparison />}
            {tab === "monthly-mis" && <MonthlyMISReport />}
            {tab === "insurance" && <CoverageLedger type="insurance" />}
            {tab === "road-tax" && <CoverageLedger type="road_tax" />}
            {tab === "fastag" && <FastagLedger />}
            {tab === "vehicle-expenses" && <VehicleExpenseReport />}
            {tab === "driver-expenses" && <DriverExpenseReport />}
            {tab === "transporter-expenses" && <TransporterExpenseReport />}
            {tab === "approval-advances" && <ApprovalChargeAdvanceReport />}
            {tab === "other-expenses" && <OtherExpenseReport />}
          </div>
        </ReportFiltersContext.Provider>
      </div>
    </AppShell>
  );
}

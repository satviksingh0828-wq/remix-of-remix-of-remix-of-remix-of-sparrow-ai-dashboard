import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart2, ChevronRight, DollarSign, Route as RouteIcon, TrendingDown, TrendingUp } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Trips } from "@/components/operations/Trips";
import { FinanceList } from "@/components/operations/FinanceList";
import { FixedIncomeList } from "@/components/operations/FixedIncomeList";
import { TripAveragesPanel } from "@/components/operations/TripAveragesPanel";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/operations")({
  head: () => ({
    meta: [
      { title: "Operations — Project TMS | Sparrow AI Solutions" },
      {
        name: "description",
        content: "Plan and record trips with manifests, contract-based freight, other income, expenses and a profit summary.",
      },
      { property: "og:title", content: "Operations — Project TMS" },
      { property: "og:description", content: "Trips, manifests, income and expenses for Project TMS." },
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
  { id: "trip",          label: "Trip",           desc: "Manifests, income & expenses",    icon: RouteIcon,   adminOnly: false },
  { id: "income",        label: "Income",          desc: "Other income, branch-wise",       icon: TrendingUp,  adminOnly: false },
  { id: "expenditure",   label: "Expenditure",     desc: "Other spend, branch-wise",        icon: TrendingDown,adminOnly: false },
  { id: "fixed-income",  label: "Fixed Income",    desc: "Contract recurring charges",      icon: DollarSign,  adminOnly: true  },
  { id: "trip-averages", label: "Trip Averages",   desc: "Monthly distribution analysis",   icon: BarChart2,   adminOnly: true  },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

function OperationsPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const TABS = ALL_TABS.filter(t => isAdmin || !t.adminOnly);
  const [tab, setTab] = useState<TabId>("trip");

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
    >
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Operations
          </p>
          <ul className="space-y-1">
            {TABS.map(t => {
              const Icon     = t.icon;
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

        <div key={safeTab} className="animate-fade-in min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active?.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active?.desc}</p>
          </header>
          {safeTab === "trip"          && <Trips />}
          {safeTab === "income"        && <FinanceList kind="income" />}
          {safeTab === "expenditure"   && <FinanceList kind="expenditure" />}
          {safeTab === "fixed-income"  && isAdmin && <FixedIncomeList />}
          {safeTab === "trip-averages" && isAdmin && <TripAveragesPanel />}
        </div>
      </div>
    </AppShell>
  );
}

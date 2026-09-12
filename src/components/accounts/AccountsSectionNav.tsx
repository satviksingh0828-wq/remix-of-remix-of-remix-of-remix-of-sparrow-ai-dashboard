import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, BookOpen, Landmark, List, Plus } from "lucide-react";
import { MobileTabDropdown } from "@/components/MobileTabDropdown";

export type LedgerTab = "create" | "list" | "view";
type SectionMode = "masters" | "ledger";

const masterLinks = [
  {
    label: "Bank",
    description: "Branch bank accounts",
    to: "/accounts/masters/bank",
    icon: Landmark,
  },
  {
    label: "Cash",
    description: "Branch cash accounts",
    to: "/accounts/masters/cash",
    icon: Banknote,
  },
] as const;

const ledgerLinks = [
  { key: "create", label: "Create", description: "Create ledger", icon: Plus },
  { key: "list", label: "List", description: "Browse ledgers", icon: List },
  { key: "view", label: "View", description: "View statement", icon: BookOpen },
] as const;

const masterMobileTabs = masterLinks.map((item) => ({
  id: item.to,
  label: item.label,
  desc: item.description,
  icon: item.icon,
}));

const ledgerMobileTabs = ledgerLinks.map((item) => ({
  id: item.key,
  label: item.label,
  desc: item.description,
  icon: item.icon,
}));

function activeFor(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AccountsSectionNav({
  desktop = false,
  mode,
  ledgerTab = "create",
  onLedgerTabChange,
}: {
  desktop?: boolean;
  mode: SectionMode;
  ledgerTab?: LedgerTab;
  onLedgerTabChange?: (tab: LedgerTab) => void;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const title = mode === "masters" ? "Master tabs" : "Ledger tabs";

  if (desktop) {
    return (
      <nav
        aria-label={title}
        className="app-sidebar-scroll hidden lg:fixed lg:left-[max(1.5rem,calc((100vw-1280px)/2+1.5rem))] lg:top-20 lg:block lg:h-[calc(100dvh-5rem)] lg:w-[220px] lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
      >
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
        <div className="space-y-1">
          {mode === "masters"
            ? masterLinks.map(({ label, description, to, icon: Icon }) => {
                const active = activeFor(pathname, to);
                return (
                  <Link
                    key={to}
                    to={to}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-sm font-semibold">{label}</span>
                      <span className="block truncate text-[11px] opacity-70">{description}</span>
                    </span>
                  </Link>
                );
              })
            : ledgerLinks.map(({ key, label, description, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onLedgerTabChange?.(key)}
                  aria-current={ledgerTab === key ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${ledgerTab === key ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <Icon className={`size-4 shrink-0 ${ledgerTab === key ? "text-primary" : ""}`} />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-semibold">{label}</span>
                    <span className="block truncate text-[11px] opacity-70">{description}</span>
                  </span>
                </button>
              ))}
        </div>
      </nav>
    );
  }

  const selectedMaster = masterLinks.find((item) => activeFor(pathname, item.to));
  const selectedLedger = ledgerLinks.find((item) => item.key === ledgerTab);
  if (mode === "masters") {
    return (
      <MobileTabDropdown
        tabs={masterMobileTabs}
        activeId={selectedMaster?.to ?? masterMobileTabs[0].id}
        label="Master tabs"
        onChange={(to) => window.location.assign(to)}
      />
    );
  }

  return (
    <MobileTabDropdown
      tabs={ledgerMobileTabs}
      activeId={selectedLedger?.key ?? ledgerMobileTabs[0].id}
      label="Ledger tabs"
      onChange={(tab) => onLedgerTabChange?.(tab as LedgerTab)}
    />
  );
}

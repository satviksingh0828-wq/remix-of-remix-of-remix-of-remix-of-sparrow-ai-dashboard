import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, BookOpen, Building2, Landmark, List, Plus } from "lucide-react";

type SectionMode = "masters" | "ledger";
export type LedgerTab = "create" | "list" | "view";

const topLinks = [
  {
    label: "Masters",
    description: "Bank & cash accounts",
    to: "/accounts/masters/bank",
    icon: Building2,
  },
  {
    label: "Ledger",
    description: "Create, list & view",
    to: "/accounts/ledger",
    icon: BookOpen,
  },
] as const;

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
  { key: "create", label: "Create", description: "Create a branch ledger", icon: Plus },
  { key: "list", label: "List", description: "Browse active ledgers", icon: List },
  { key: "view", label: "View", description: "View ledger statements", icon: BookOpen },
] as const;

function activeFor(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function PrimaryLink({
  label,
  description,
  to,
  Icon,
  active,
}: {
  label: string;
  description: string;
  to: string;
  Icon: typeof Building2;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        active
          ? "bg-primary-soft text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-semibold">{label}</span>
        <span className="block truncate text-[11px] opacity-70">{description}</span>
      </span>
    </Link>
  );
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
  const subLinks = mode === "masters" ? masterLinks : ledgerLinks;

  if (desktop) {
    return (
      <nav
        aria-label="Accounts modules"
        className="app-sidebar-scroll hidden lg:fixed lg:left-[max(1.5rem,calc((100vw-1280px)/2+1.5rem))] lg:top-20 lg:block lg:h-[calc(100dvh-5rem)] lg:w-[220px] lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
      >
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Modules
        </p>
        <div className="space-y-1">
          {topLinks.map(({ label, description, to, icon: Icon }) => (
            <PrimaryLink
              key={label}
              label={label}
              description={description}
              to={to}
              Icon={Icon}
              active={mode === "masters" ? label === "Masters" : label === "Ledger"}
            />
          ))}
        </div>
        <p className="mb-3 mt-7 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {mode === "masters" ? "Master tabs" : "Ledger tabs"}
        </p>
        <div className="space-y-1">
          {mode === "masters"
            ? masterLinks.map(({ label, description, to, icon: Icon }) => (
                <PrimaryLink
                  key={to}
                  label={label}
                  description={description}
                  to={to}
                  Icon={Icon}
                  active={activeFor(pathname, to)}
                />
              ))
            : ledgerLinks.map(({ key, label, description, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onLedgerTabChange?.(key)}
                  aria-current={ledgerTab === key ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    ledgerTab === key
                      ? "bg-primary-soft text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
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

  return (
    <nav aria-label="Accounts modules" className="mb-6 lg:hidden">
      <div className="rounded-2xl border border-border bg-card p-1.5 shadow-sm">
        <div className="grid grid-cols-2 gap-1">
          {topLinks.map(({ label, description, to, icon: Icon }) => (
            <PrimaryLink
              key={label}
              label={label}
              description={description}
              to={to}
              Icon={Icon}
              active={mode === "masters" ? label === "Masters" : label === "Ledger"}
            />
          ))}
        </div>
        <div className="my-2 border-t border-border" />
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {mode === "masters" ? "Master tabs" : "Ledger tabs"}
        </p>
        <div className={`grid gap-1 ${mode === "masters" ? "grid-cols-2" : "grid-cols-3"}`}>
          {mode === "masters"
            ? masterLinks.map(({ label, description, to, icon: Icon }) => (
                <PrimaryLink
                  key={to}
                  label={label}
                  description={description}
                  to={to}
                  Icon={Icon}
                  active={activeFor(pathname, to)}
                />
              ))
            : ledgerLinks.map(({ key, label, description, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onLedgerTabChange?.(key)}
                  aria-current={ledgerTab === key ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    ledgerTab === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-xs font-semibold">{label}</span>
                    <span className="block truncate text-[10px] opacity-70">{description}</span>
                  </span>
                </button>
              ))}
        </div>
      </div>
    </nav>
  );
}

export function AccountsSectionHeader() {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Building2 className="size-3.5" />
      Accounts / Modules
    </span>
  );
}

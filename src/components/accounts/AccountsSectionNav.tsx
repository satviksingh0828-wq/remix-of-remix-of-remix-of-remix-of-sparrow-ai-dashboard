import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, BookOpen, Landmark, List, Plus } from "lucide-react";

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

function activeFor(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AccountsSectionNav({
  mode,
  ledgerTab = "create",
  onLedgerTabChange,
}: {
  mode: SectionMode;
  ledgerTab?: LedgerTab;
  onLedgerTabChange?: (tab: LedgerTab) => void;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav aria-label={mode === "masters" ? "Master tabs" : "Ledger tabs"} className="mb-6 lg:hidden">
      <div className="rounded-2xl border border-border bg-card p-1.5 shadow-sm">
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {mode === "masters" ? "Master tabs" : "Ledger tabs"}
        </p>
        <div className={`grid gap-1 ${mode === "masters" ? "grid-cols-2" : "grid-cols-3"}`}>
          {mode === "masters"
            ? masterLinks.map(({ label, description, to, icon: Icon }) => {
                const active = activeFor(pathname, to);
                return (
                  <Link
                    key={to}
                    to={to}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-xs font-semibold">{label}</span>
                      <span className="block truncate text-[10px] opacity-75">{description}</span>
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
                  className={`flex min-h-12 items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors ${ledgerTab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-xs font-semibold">{label}</span>
                    <span className="block truncate text-[10px] opacity-75">{description}</span>
                  </span>
                </button>
              ))}
        </div>
      </div>
    </nav>
  );
}

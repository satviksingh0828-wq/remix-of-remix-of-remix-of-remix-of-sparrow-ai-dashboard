import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, BookOpen, Building2, Landmark } from "lucide-react";

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

const topLinks = [
  {
    label: "Masters",
    description: "Bank & cash accounts",
    to: "/accounts/masters/bank",
    icon: Building2,
  },
  { label: "Ledger", description: "Create, list & view", to: "/accounts/ledger", icon: BookOpen },
] as const;

function activeFor(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavLink({
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
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${
        active
          ? "bg-primary-soft text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-medium">{label}</span>
        <span className="block truncate text-[11px] opacity-70">{description}</span>
      </span>
    </Link>
  );
}

export function AccountsSectionNav({ desktop = false }: { desktop?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isLedger = activeFor(pathname, "/accounts/ledger");
  const isMasters = !isLedger;

  if (desktop) {
    return (
      <nav
        aria-label="Accounts sections"
        className="app-sidebar-scroll hidden lg:fixed lg:left-[max(1.5rem,calc((100vw-1280px)/2+1.5rem))] lg:top-20 lg:block lg:h-[calc(100dvh-5rem)] lg:w-[220px] lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
      >
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Accounts
        </p>
        <ul className="space-y-1">
          {topLinks.map(({ label, description, to, icon: Icon }) => (
            <li key={label}>
              <NavLink
                label={label}
                description={description}
                to={to}
                Icon={Icon}
                active={label === "Ledger" ? isLedger : isMasters}
              />
            </li>
          ))}
        </ul>
        {isMasters && (
          <>
            <p className="mb-3 mt-7 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Masters
            </p>
            <ul className="space-y-1">
              {masterLinks.map(({ label, description, to, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    label={label}
                    description={description}
                    to={to}
                    Icon={Icon}
                    active={activeFor(pathname, to)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>
    );
  }

  return (
    <nav aria-label="Accounts sections" className="mb-6 lg:hidden">
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
        {topLinks.map(({ label, description, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            aria-current={(label === "Ledger" ? isLedger : isMasters) ? "page" : undefined}
            className={`flex min-h-14 items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${(label === "Ledger" ? isLedger : isMasters) ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">{label}</span>
              <span
                className={`block truncate text-[11px] ${(label === "Ledger" ? isLedger : isMasters) ? "text-primary-foreground/75" : "opacity-70"}`}
              >
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
      {isMasters && (
        <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
          {masterLinks.map(({ label, description, to, icon: Icon }) => {
            const active = activeFor(pathname, to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-2 rounded-xl px-3 py-2 transition-colors ${active ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-semibold">{label}</span>
                  <span className="block truncate text-[11px] opacity-70">{description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}

export function AccountsSectionHeader() {
  return (
    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Building2 className="size-3.5" />
      Accounts / Masters
    </span>
  );
}

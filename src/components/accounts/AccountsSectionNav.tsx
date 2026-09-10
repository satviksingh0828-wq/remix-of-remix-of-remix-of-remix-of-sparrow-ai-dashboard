import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, Building2, Landmark } from "lucide-react";

const links = [
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

function activeFor(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AccountsSectionNav({ desktop = false }: { desktop?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const items = links.map(({ label, description, to, icon: Icon }) => ({
    label,
    description,
    to,
    Icon,
    isActive: activeFor(pathname, to),
  }));

  if (desktop) {
    return (
      <nav
        aria-label="Accounts master sections"
        className="app-sidebar-scroll hidden lg:fixed lg:left-[max(1.5rem,calc((100vw-1280px)/2+1.5rem))] lg:top-20 lg:block lg:h-[calc(100dvh-5rem)] lg:w-[220px] lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1"
      >
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Masters
        </p>
        <ul className="space-y-1">
          {items.map(({ label, description, to, Icon, isActive }) => (
            <li key={to}>
              <Link
                to={to}
                aria-current={isActive ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${
                  isActive
                    ? "bg-primary-soft text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`size-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-medium">{label}</span>
                  <span className="block truncate text-[11px] opacity-70">{description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Accounts sections" className="mb-6 lg:hidden">
      <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Masters
      </p>
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
        {items.map(({ label, description, to, Icon, isActive }) => (
          <Link
            key={to}
            to={to}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-14 items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">{label}</span>
              <span
                className={`block truncate text-[11px] ${isActive ? "text-primary-foreground/75" : "opacity-70"}`}
              >
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
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

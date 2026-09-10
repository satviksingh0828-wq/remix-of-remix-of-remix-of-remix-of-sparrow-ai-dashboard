import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, Building2, Landmark } from "lucide-react";

const links = [
  { label: "Bank", description: "Branch bank accounts", to: "/accounts/bank", icon: Landmark },
  { label: "Cash", description: "Branch cash accounts", to: "/accounts/cash", icon: Banknote },
] as const;

function activeFor(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AccountsSectionNav({ desktop = false }: { desktop?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return (
    <nav aria-label="Accounts sections" className={desktop ? "mb-6" : "mb-6 xl:hidden"}>
      <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Masters
      </p>
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm">
        {links.map(({ label, description, to, icon: Icon }) => {
          const isActive = activeFor(pathname, to);
          return (
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
          );
        })}
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

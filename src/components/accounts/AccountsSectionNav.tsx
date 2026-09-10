import { Link, useRouterState } from "@tanstack/react-router";
import { Banknote, Building2, Check, ChevronDown, Landmark } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  { label: "Bank", description: "Branch bank accounts", to: "/accounts/bank", icon: Landmark },
  { label: "Cash", description: "Branch cash accounts", to: "/accounts/cash", icon: Banknote },
] as const;

function activeFor(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AccountsSectionNav({ desktop = false }: { desktop?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const active = links.find((link) => activeFor(pathname, link.to)) ?? links[0];
  const ActiveIcon = active.icon;

  if (desktop) {
    return (
      <nav
        aria-label="Accounts sections"
        className="app-sidebar-scroll hidden xl:block xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:pr-1"
      >
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Masters
        </p>
        <ul className="space-y-1">
          {links.map(({ label, description, to, icon: Icon }) => {
            const isActive = activeFor(pathname, to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${isActive ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <Icon className={`size-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-sm font-medium">{label}</span>
                    <span className="block truncate text-[11px] opacity-70">{description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Accounts sections" className="mb-6 xl:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-left shadow-sm outline-none transition-all hover:border-primary/30 hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ActiveIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Masters section
              </span>
              <span className="block truncate text-sm font-semibold">{active.label}</span>
            </span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ChevronDown className="size-4" />
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl border-border p-1.5 shadow-xl"
        >
          {links.map(({ label, description, to, icon: Icon }) => {
            const isActive = activeFor(pathname, to);
            return (
              <DropdownMenuItem key={to} asChild>
                <Link
                  to={to}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 ${isActive ? "bg-primary/10" : ""}`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{label}</span>
                    <span className="block text-xs leading-snug text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  {isActive && <Check className="size-4 shrink-0 text-primary" />}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
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

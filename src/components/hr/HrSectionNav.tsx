import { Link, useRouterState } from "@tanstack/react-router";
import {
  BadgeIndianRupee,
  BanknoteArrowDown,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  History,
  Landmark,
  ListChecks,
  Plus,
  ReceiptIndianRupee,
  UserPlus,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type HrArea = "master" | "attendance" | "payroll";

const sectionLinks = {
  master: [
    { label: "All employees", description: "View and manage staff", to: "/employees", icon: Users },
    {
      label: "Add employee",
      description: "Create an employee record",
      to: "/employees/new",
      icon: UserPlus,
    },
    {
      label: "All departments",
      description: "Teams and positions",
      to: "/employees/departments",
      icon: Building2,
    },
    {
      label: "Add department",
      description: "Create a new department",
      to: "/employees/departments/new",
      icon: Plus,
    },
  ],
  attendance: [
    {
      label: "Mark attendance",
      description: "Record daily attendance",
      to: "/attendance/mark",
      icon: CalendarCheck,
    },
    {
      label: "History",
      description: "Review attendance records",
      to: "/attendance/history",
      icon: History,
    },
    {
      label: "Holidays",
      description: "Manage holiday calendar",
      to: "/attendance/holidays",
      icon: CalendarDays,
    },
    {
      label: "Automarker",
      description: "Configure automatic marking",
      to: "/attendance/automarker",
      icon: CalendarClock,
    },
  ],
  payroll: [
    {
      label: "Payroll",
      description: "Generate employee payroll",
      to: "/payroll/generate",
      icon: BadgeIndianRupee,
    },
    {
      label: "Pending payroll",
      description: "Review pending payroll",
      to: "/payroll/pending",
      icon: ClipboardCheck,
    },
    {
      label: "History",
      description: "Past payroll records",
      to: "/payroll/history",
      icon: History,
    },
    { label: "Loans", description: "Employee loan records", to: "/payroll/loans", icon: Landmark },
    {
      label: "Advances",
      description: "Salary advance records",
      to: "/payroll/advances",
      icon: BanknoteArrowDown,
    },
    {
      label: "Loss deductions",
      description: "Manage loss deductions",
      to: "/payroll/deductions",
      icon: ReceiptIndianRupee,
    },
    {
      label: "Ledger",
      description: "Payroll account ledger",
      to: "/payroll/ledger",
      icon: ListChecks,
    },
  ],
} as const;

const areaLabels: Record<HrArea, string> = {
  master: "HR Master",
  attendance: "HR Attendance",
  payroll: "HR Payroll",
};

function linkIsActive(pathname: string, to: string) {
  if (pathname === to || pathname === `${to}/`) return true;
  if (to === "/employees") {
    return (
      pathname.startsWith("/employees/") &&
      !pathname.startsWith("/employees/new") &&
      !pathname.startsWith("/employees/departments")
    );
  }
  if (to === "/employees/departments") {
    return (
      pathname.startsWith("/employees/departments/") &&
      !pathname.startsWith("/employees/departments/new")
    );
  }
  return false;
}

export function HrSectionNav({ area, desktop = false }: { area: HrArea; desktop?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const links = sectionLinks[area];
  const activeLink = links.find(({ to }) => linkIsActive(pathname, to)) ?? links[0];
  const ActiveIcon = activeLink.icon;

  if (desktop) {
    return (
      <nav
        aria-label={`${areaLabels[area]} sections`}
        className="hidden xl:block xl:sticky xl:top-24 xl:self-start"
      >
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {areaLabels[area]}
        </p>
        <ul className="space-y-1">
          {links.map(({ label, description, to, icon: Icon }) => {
            const active = linkIsActive(pathname, to);
            return (
              <li key={to}>
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
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  if (desktop) {
    return (
      <nav
        aria-label={`${areaLabels[area]} sections`}
        className="hidden lg:block lg:sticky lg:top-24 lg:self-start"
      >
        <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {areaLabels[area]}
        </p>
        <ul className="space-y-1">
          {links.map(({ label, description, to, icon: Icon }) => {
            const active = linkIsActive(pathname, to);
            return (
              <li key={to}>
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
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={`${areaLabels[area]} sections`} className="mb-6 xl:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ActiveIcon className="size-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {areaLabels[area]} section
              </span>
              <span className="block truncate text-sm font-semibold">{activeLink.label}</span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
          {links.map(({ label, description, to, icon: Icon }) => {
            const active = linkIsActive(pathname, to);
            return (
              <DropdownMenuItem key={to} asChild>
                <Link
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className="flex cursor-pointer items-center gap-3 py-2.5"
                >
                  <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {description}
                    </span>
                  </span>
                  {active && <Check className="size-4 shrink-0 text-primary" />}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

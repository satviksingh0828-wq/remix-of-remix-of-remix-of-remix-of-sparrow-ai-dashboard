import { Link, useRouterState } from "@tanstack/react-router";
import {
  BadgeIndianRupee,
  BanknoteArrowDown,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  History,
  Landmark,
  ListChecks,
  Plus,
  ReceiptIndianRupee,
  UserPlus,
  Users,
} from "lucide-react";

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
    <nav aria-label={`${areaLabels[area]} sections`} className="-mx-1 mb-6 lg:hidden">
      <div className="scrollbar-none flex gap-1 overflow-x-auto px-1 pb-1">
        {links.map(({ label, to, icon: Icon }) => {
          const active = linkIsActive(pathname, to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-primary font-medium text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

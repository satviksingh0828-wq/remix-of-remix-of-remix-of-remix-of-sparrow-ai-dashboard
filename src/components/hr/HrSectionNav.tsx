import { Link, useRouterState } from "@tanstack/react-router";

type HrArea = "master" | "attendance" | "payroll" | "dashboard";

const sectionLinks = {
  dashboard: [
    ["Employee dashboard", "/dashboard/employee"],
    ["Attendance dashboard", "/dashboard/attendance"],
    ["Payroll dashboard", "/dashboard/payroll"],
    ["Hierarchy", "/dashboard/hierarchy"],
  ],
  master: [
    ["All employees", "/employees"],
    ["Add employee", "/employees/new"],
    ["All departments", "/employees/departments"],
    ["Add department", "/employees/departments/new"],
  ],
  attendance: [
    ["Mark attendance", "/attendance/mark"],
    ["History", "/attendance/history"],
    ["Holidays", "/attendance/holidays"],
    ["Automarker", "/attendance/automarker"],
  ],
  payroll: [
    ["Payroll", "/payroll/generate"],
    ["Pending payroll", "/payroll/pending"],
    ["History", "/payroll/history"],
    ["Loans", "/payroll/loans"],
    ["Advances", "/payroll/advances"],
    ["Loss deductions", "/payroll/deductions"],
    ["Ledger", "/payroll/ledger"],
  ],
} as const;

export function HrSectionNav({ area }: { area: HrArea }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const links = sectionLinks[area];

  return (
    <nav aria-label={`${area} sections`} className="mb-6 border-b border-border">
      <div className="scrollbar-none flex gap-1 overflow-x-auto pb-px">
        {links.map(([label, to]) => {
          const active = pathname === to || (to === "/employees" && pathname === "/employees/");
          return (
            <Link
              key={to}
              to={to}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

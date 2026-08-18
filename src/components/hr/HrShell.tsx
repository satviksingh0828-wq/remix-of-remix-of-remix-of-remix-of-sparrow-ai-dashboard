import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronRight, LayoutDashboard, Users, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";

type HrArea = "master" | "attendance" | "payroll" | "dashboard";

const areas = [
  { id: "master" as const, label: "HR Master", desc: "Employees, departments & positions", to: "/employees", icon: Users },
  { id: "attendance" as const, label: "Attendance", desc: "Marking, history & holidays", to: "/attendance", icon: CalendarCheck },
  { id: "payroll" as const, label: "Payroll", desc: "Salary, loans & deductions", to: "/payroll", icon: Wallet },
  { id: "dashboard" as const, label: "HR Dashboard", desc: "People, attendance & payroll overview", to: "/hr-dashboard", icon: LayoutDashboard },
];

export function HrShell({ area, children }: { area: HrArea; children: ReactNode }) {
  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">Workspace</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">HR</span>
        </span>
      }
    >
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {areas.map((item) => {
          const Icon = item.icon;
          const active = item.id === area;
          return (
            <Link
              key={item.id}
              to={item.to}
              className={`flex min-w-[150px] shrink-0 items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              <span className="leading-tight">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className={`block text-[10px] ${active ? "text-primary-foreground/75" : "opacity-70"}`}>
                  {item.desc}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      {children}
    </AppShell>
  );
}
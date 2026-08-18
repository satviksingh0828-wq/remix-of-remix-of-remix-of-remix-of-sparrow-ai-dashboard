import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

type HrArea = "master" | "attendance" | "payroll" | "dashboard";

const areas = [
  {
    id: "master" as const,
    label: "HR Master",
    desc: "Employees, departments & positions",
    to: "/employees",
    icon: Users,
  },
  {
    id: "attendance" as const,
    label: "Attendance",
    desc: "Marking, history & holidays",
    to: "/attendance",
    icon: CalendarCheck,
  },
  {
    id: "payroll" as const,
    label: "Payroll",
    desc: "Salary, loans & deductions",
    to: "/payroll",
    icon: Wallet,
  },
];

export function HrShell({ area, children }: { area: HrArea; children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(true);

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">
            Workspace
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">HR</span>
        </span>
      }
      headerEnd={
        <button
          type="button"
          onClick={() => setNavOpen((value) => !value)}
          title={navOpen ? "Hide sidebar" : "Show sidebar"}
          className="hidden items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:flex"
        >
          {navOpen ? (
            <PanelLeftClose className="size-3.5" />
          ) : (
            <PanelLeftOpen className="size-3.5" />
          )}
          <span>{navOpen ? "Hide sidebar" : "Show sidebar"}</span>
        </button>
      }
    >
      <div className={`grid gap-6 ${navOpen ? "lg:grid-cols-[220px_1fr]" : "grid-cols-1"}`}>
        {navOpen && (
          <nav className="hidden self-start lg:sticky lg:top-24 lg:block">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              HR
            </p>
            <ul className="space-y-1">
              {areas.map((item) => {
                const Icon = item.icon;
                const active = item.id === area;
                return (
                  <li key={item.id}>
                    <Link
                      to={item.to}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${
                        active
                          ? "bg-primary-soft text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${active ? "text-primary" : ""}`} />
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-sm font-medium">{item.label}</span>
                        <span className="block truncate text-[11px] opacity-70">{item.desc}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="-mx-1 lg:hidden">
          <div className="scrollbar-none flex gap-1 overflow-x-auto px-1 pb-1">
            {areas.map((item) => {
              const Icon = item.icon;
              const active = item.id === area;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary font-medium text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">{children}</div>
      </div>
    </AppShell>
  );
}

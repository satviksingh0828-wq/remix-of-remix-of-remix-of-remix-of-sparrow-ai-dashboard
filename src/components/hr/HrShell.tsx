import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HrSectionNav } from "@/components/hr/HrSectionNav";

type HrArea = "master" | "attendance" | "payroll";

const areaLabels: Record<HrArea, string> = {
  master: "HR Master",
  attendance: "HR Attendance",
  payroll: "HR Payroll",
};

/** Shared page shell for each independent HR workspace module. */
export function HrShell({ area, children }: { area: HrArea; children: ReactNode }) {
  const label = areaLabels[area];

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">
            Workspace
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{label}</span>
        </span>
      }
    >
      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
      </header>
      <HrSectionNav area={area} />
      <div className="min-w-0">{children}</div>
    </AppShell>
  );
}

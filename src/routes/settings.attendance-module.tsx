import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HrAccess } from "@/components/HrAccess";
import { AttendanceModuleSettings } from "@/components/settings/AttendanceModuleSettings";

export const Route = createFileRoute("/settings/attendance-module")({
  component: () => (
    <HrAccess>
      <AppShell
        breadcrumb={
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/home">Workspace</Link>
            <ChevronRight className="size-3.5" />
            <Link to="/settings">Settings</Link>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Attendance Module</span>
          </span>
        }
      >
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Attendance Module</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure the attendance device and service connection.
          </p>
        </header>
        <AttendanceModuleSettings />
      </AppShell>
    </HrAccess>
  ),
});

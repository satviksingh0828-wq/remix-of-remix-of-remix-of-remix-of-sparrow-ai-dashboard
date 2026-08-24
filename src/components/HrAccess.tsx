import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { useSession } from "@/lib/session";

/** HR is an admin/manager area. Basic users are intentionally excluded. */
export function HrAccess({ children }: { children: ReactNode }) {
  const { user } = useSession();

  if (user?.role === "admin" || user?.role === "semi_admin" || user?.role === "viewer") return <>{children}</>;

  return (
    <AppShell>
      <div className="surface-card mx-auto max-w-lg p-8 text-center">
        <ShieldAlert className="mx-auto size-10 text-destructive" />
        <h1 className="mt-4 text-xl font-semibold">HR access is restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only administrators and managers can view or manage HR, attendance, and payroll data.
        </p>
        <Link
          to="/home"
          className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to workspace
        </Link>
      </div>
    </AppShell>
  );
}

export function RequireHrAccess({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <HrAccess>{children}</HrAccess>
    </RequireAuth>
  );
}
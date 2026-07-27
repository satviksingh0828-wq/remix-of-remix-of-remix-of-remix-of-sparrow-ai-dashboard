import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Database,
  FileText,
  Settings2,
  Truck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Workspace — Project TMS | Sparrow AI Solutions" },
      {
        name: "description",
        content:
          "Project TMS workspace: operations, masters, dashboard, reports, users and settings modules.",
      },
      { property: "og:title", content: "Workspace — Project TMS" },
      {
        property: "og:description",
        content: "Operations, masters, dashboard, reports, users and settings in one workspace.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <HomePage />
    </RequireAuth>
  ),
});

const MODULES = [
  { key: "operation", label: "Operation", desc: "Trips, consignments & dispatch", icon: Truck },
  {
    key: "masters",
    label: "Masters",
    desc: "Vehicles, drivers, transporters & locations",
    icon: Database,
    active: true,
    to: "/masters" as const,
  },
  { key: "dashboard", label: "Dashboard", desc: "Live fleet & revenue overview", icon: BarChart3 },
  { key: "reports", label: "Reports", desc: "Statements, MIS & exports", icon: FileText },
  { key: "users", label: "Users", desc: "Roles, access & activity log", icon: Users },
  {
    key: "settings",
    label: "Settings",
    desc: "Company, branches, departments & appearance",
    icon: Settings2,
    active: true,
    to: "/settings" as const,
  },
] as const;

function HomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <AppShell>
      <div className="animate-fade-up">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">Workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a module</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Six modules power Project TMS. Settings is live today — the rest are being rolled out.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))
          : MODULES.map((m, i) => {
              const Icon = m.icon;
              const enabled = "active" in m && m.active;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() =>
                    enabled && "to" in m && m.to
                      ? navigate({ to: m.to })
                      : toast.info(`${m.label} module is coming soon`)
                  }
                  style={{ animationDelay: `${i * 55}ms` }}
                  className="group surface-card animate-fade-up relative flex h-40 flex-col items-start p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]"
                >
                  <span
                    className={`flex size-11 items-center justify-center rounded-xl transition-colors ${
                      enabled
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    }`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <span className="mt-4 text-base font-semibold tracking-tight">{m.label}</span>
                  <span className="mt-1 text-sm text-muted-foreground">{m.desc}</span>
                  <span className="absolute right-5 top-6 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {enabled ? (
                      <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-1" />
                    ) : (
                      "Soon"
                    )}
                  </span>
                </button>
              );
            })}
      </div>
    </AppShell>
  );
}

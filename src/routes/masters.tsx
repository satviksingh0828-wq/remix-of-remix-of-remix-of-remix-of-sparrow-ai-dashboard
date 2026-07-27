import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, ChevronRight, FileText, MapPin, Truck, User } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { MasterList } from "@/components/masters/MasterList";
import { Contracts } from "@/components/masters/Contracts";
import { useSession } from "@/lib/session";
import {
  DRIVER_CONFIG,
  LOCATION_CONFIG,
  TRANSPORTER_CONFIG,
  VEHICLE_CONFIG,
} from "@/components/masters/configs";

export const Route = createFileRoute("/masters")({
  head: () => ({
    meta: [
      { title: "Masters — Project TMS | Sparrow AI Solutions" },
      {
        name: "description",
        content:
          "Manage vehicles, drivers, transporters and locations for Project TMS with Excel-friendly import and export.",
      },
      { property: "og:title", content: "Masters — Project TMS" },
      {
        property: "og:description",
        content: "Vehicles, drivers, transporters and locations for Project TMS.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <MastersPage />
    </RequireAuth>
  ),
});

const ALL_TABS = [
  { id: "vehicle", label: "Vehicle", desc: "Fleet & specifications", icon: Truck, adminOnly: true },
  { id: "driver", label: "Driver", desc: "Staff & licences", icon: User, adminOnly: false },
  { id: "transporter", label: "Transporter", desc: "Owners & brokers", icon: Building2, adminOnly: false },
  { id: "location", label: "Locations", desc: "Pickup & drop points", icon: MapPin, adminOnly: true },
  { id: "contract", label: "Contracts", desc: "Rates & slabs", icon: FileText, adminOnly: true },
] as const;

type TabId = (typeof ALL_TABS)[number]["id"];

function MastersPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  // Basic users only see Transporter and Driver tabs
  const TABS = isAdmin ? ALL_TABS : ALL_TABS.filter((t) => !t.adminOnly);

  const [tab, setTab] = useState<TabId>(isAdmin ? "vehicle" : "driver");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const safeTab = active?.id ?? "driver";

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">
            Workspace
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Masters</span>
        </span>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Masters
          </p>
          <ul className="space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = t.id === safeTab;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${
                      isActive
                        ? "bg-primary-soft text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? "text-primary" : ""}`} />
                    <span className="leading-tight">
                      <span className="block text-sm font-medium">{t.label}</span>
                      <span className="block text-[11px] opacity-70">{t.desc}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div key={safeTab} className="animate-fade-in min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active?.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active?.desc}</p>
          </header>
          {safeTab === "vehicle" ? <MasterList config={VEHICLE_CONFIG} /> : null}
          {safeTab === "driver" ? <MasterList config={DRIVER_CONFIG} /> : null}
          {safeTab === "transporter" ? <MasterList config={TRANSPORTER_CONFIG} /> : null}
          {safeTab === "location" ? <MasterList config={LOCATION_CONFIG} /> : null}
          {safeTab === "contract" ? <Contracts /> : null}
        </div>
      </div>
    </AppShell>
  );
}

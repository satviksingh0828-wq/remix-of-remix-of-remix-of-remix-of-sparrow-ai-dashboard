import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building, Building2, Check, ChevronRight, Palette } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { BranchSettings } from "@/components/settings/BranchSettings";
import { THEMES, useTheme, type ThemeId } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Project TMS | Sparrow AI Solutions" },
      {
        name: "description",
        content:
          "Manage company profile, branch network and application appearance for Project TMS.",
      },
      { property: "og:title", content: "Settings — Project TMS" },
      {
        property: "og:description",
        content: "Company profile, branch network and theme settings for Project TMS.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SettingsPage />
    </RequireAuth>
  ),
});

const TABS = [
  { id: "company", label: "Company", desc: "Profile & registration", icon: Building },
  { id: "branch", label: "Branch", desc: "Locations & managers", icon: Building2 },
  { id: "theme", label: "Theme Settings", desc: "Appearance", icon: Palette },
] as const;

type TabId = (typeof TABS)[number]["id"];

function SettingsPage() {
  const [tab, setTab] = useState<TabId>("company");
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">
            Workspace
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Settings</span>
        </span>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Settings
          </p>
          <ul className="space-y-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const isActive = t.id === tab;
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

        <div key={tab} className="animate-fade-in min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.desc}</p>
          </header>
          {tab === "company" ? <CompanySettings /> : null}
          {tab === "branch" ? <BranchSettings /> : null}
          {tab === "theme" ? <ThemePanel /> : null}
        </div>
      </div>
    </AppShell>
  );
}

function ThemePanel() {
  const { theme, setTheme, saving } = useTheme();

  return (
    <div className="animate-fade-up space-y-5">
      <section className="surface-card p-6">
        <h3 className="text-sm font-semibold tracking-tight">Accent theme</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Applies across the whole workspace and is saved to the cloud.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {THEMES.map((t) => {
            const isActive = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                disabled={saving}
                onClick={() => setTheme(t.id as ThemeId)}
                className={`relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                  isActive
                    ? "border-primary bg-primary-soft"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span
                  className="size-9 shrink-0 rounded-lg"
                  style={{ backgroundColor: t.swatch }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{t.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{t.hint}</span>
                </span>
                {isActive ? (
                  <Check className="absolute right-3 top-3 size-4 text-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="surface-card p-6">
        <h3 className="text-sm font-semibold tracking-tight">Preview</h3>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground"
            style={{ backgroundImage: "var(--gradient-brand)" }}
          >
            Primary action
          </span>
          <span className="rounded-xl bg-primary-soft px-5 py-2.5 text-sm font-medium text-primary">
            Soft accent
          </span>
          <span className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium">
            Outline
          </span>
        </div>
      </section>
    </div>
  );
}

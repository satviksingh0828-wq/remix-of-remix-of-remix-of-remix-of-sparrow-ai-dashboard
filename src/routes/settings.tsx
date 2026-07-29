import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Building, Building2, Check, ChevronRight, PanelLeftClose, PanelLeftOpen, Palette } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { CompanySettings } from "@/components/settings/CompanySettings";
import { BranchSettings } from "@/components/settings/BranchSettings";
import { THEMES, useTheme, type ThemeId } from "@/lib/theme";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Garuda Logistics Solutions | Sparrow AI Solutions" },
      {
        name: "description",
        content:
          "Manage company profile, branches, departments and application appearance for Garuda Logistics Solutions.",
      },
      { property: "og:title", content: "Settings — Garuda Logistics Solutions" },
      {
        property: "og:description",
        content: "Company profile, branches, departments and theme settings for Garuda Logistics Solutions.",
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
  { id: "company", label: "Company",        desc: "Profile & registration", icon: Building  },
  { id: "branch",  label: "Branch",         desc: "Locations & managers",   icon: Building2 },
  { id: "theme",   label: "Theme Settings", desc: "Appearance",             icon: Palette   },
] as const;

type TabId = (typeof TABS)[number]["id"];

function SettingsPage() {
  const [tab, setTab]     = useState<TabId>("company");
  const [navOpen, setNavOpen] = useState(true);

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <AppShell
      breadcrumb={
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/home" className="hover:text-foreground">Workspace</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">Settings</span>
        </span>
      }
      headerEnd={
        <button
          type="button"
          onClick={() => setNavOpen(v => !v)}
          title={navOpen ? "Hide sidebar" : "Show sidebar"}
          className="hidden lg:flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {navOpen
            ? <><PanelLeftClose className="size-3.5" /><span>Hide sidebar</span></>
            : <><PanelLeftOpen  className="size-3.5" /><span>Show sidebar</span></>
          }
        </button>
      }
    >
      <div className={`grid gap-6 ${navOpen ? "lg:grid-cols-[220px_1fr]" : "grid-cols-1"}`}>
        {/* Desktop left nav */}
        {navOpen && (
          <nav className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Settings
            </p>
            <ul className="space-y-1">
              {TABS.map((t) => {
                const Icon     = t.icon;
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
                      <Icon className={`size-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                      <span className="leading-tight min-w-0">
                        <span className="block text-sm font-medium truncate">{t.label}</span>
                        <span className="block text-[11px] opacity-70 truncate">{t.desc}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* Mobile horizontal tab bar */}
        <div className="lg:hidden -mx-1">
          <div className="flex gap-1 overflow-x-auto pb-1 px-1 scrollbar-none">
            {TABS.map((t) => {
              const Icon     = t.icon;
              const isActive = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    isActive ? "bg-primary text-primary-foreground font-medium" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div key={tab} className="animate-fade-in min-w-0">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{active.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.desc}</p>
          </header>
          {tab === "company" ? <CompanySettings /> : null}
          {tab === "branch"  ? <BranchSettings />  : null}
          {tab === "theme"   ? <ThemePanel />       : null}
        </div>
      </div>
    </AppShell>
  );
}

function ThemePanel() {
  const { theme, setTheme, saving, loginUi, setLoginUi } = useTheme();

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

      {/* ── Login page style ─────────────────────────────────────── */}
      <section className="surface-card p-6">
        <h3 className="text-sm font-semibold tracking-tight">Login page style</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose how the left panel of the sign-in screen looks. Saved to the cloud and applies to
          all users.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Plain UI */}
          <button
            type="button"
            disabled={saving}
            onClick={() => setLoginUi("plain")}
            className={`relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 ${
              loginUi === "plain"
                ? "border-primary bg-primary-soft"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {/* Mini preview */}
            <div
              className="flex h-28 w-full items-center justify-center"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              <div className="rounded-xl bg-white/20 px-5 py-2 text-[11px] font-semibold uppercase tracking-widest text-white">
                Garuda Logistics Solutions
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="min-w-0">
                <span className="block text-sm font-medium">Plain UI</span>
                <span className="block text-xs text-muted-foreground">Gradient with logo (default)</span>
              </span>
              {loginUi === "plain" ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : null}
            </div>
          </button>

          {/* Image UI */}
          <button
            type="button"
            disabled={saving}
            onClick={() => setLoginUi("image")}
            className={`relative flex flex-col overflow-hidden rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 ${
              loginUi === "image"
                ? "border-primary bg-primary-soft"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            {/* Mini preview */}
            <div className="h-28 w-full overflow-hidden">
              <img
                src="/garuda-banner.jpeg"
                alt="Garuda banner preview"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="min-w-0">
                <span className="block text-sm font-medium">Image UI</span>
                <span className="block text-xs text-muted-foreground">Garuda banner as background</span>
              </span>
              {loginUi === "image" ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : null}
            </div>
          </button>
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

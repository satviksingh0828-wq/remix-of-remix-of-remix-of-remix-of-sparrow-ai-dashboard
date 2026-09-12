import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export const THEMES = [
  /* ── Light accent themes ── */
  { id: "sky", label: "Azure Sky", swatch: "#2f7ed8", hint: "Calm corporate blue", dark: false },
  { id: "emerald", label: "Emerald", swatch: "#12926f", hint: "Logistics green", dark: false },
  { id: "violet", label: "Deep Violet", swatch: "#6d4bd8", hint: "Modern & bold", dark: false },
  { id: "amber", label: "Warm Amber", swatch: "#d38b1b", hint: "Bright & energetic", dark: false },
  { id: "rose", label: "Signal Rose", swatch: "#d94f5c", hint: "High visibility", dark: false },
  { id: "graphite", label: "Graphite", swatch: "#4a4f57", hint: "Neutral monochrome", dark: false },
  { id: "garuda", label: "Garuda", swatch: "#8b1a2c", hint: "Crimson & gold", dark: false },
  { id: "ocean", label: "Deep Ocean", swatch: "#1e3a6e", hint: "Professional navy", dark: false },
  { id: "blaze", label: "Blaze", swatch: "#e06820", hint: "Orange on blue-tint", dark: false },
  {
    id: "tangerine",
    label: "Tangerine",
    swatch: "#d96a25",
    hint: "Light warm orange",
    dark: false,
  },
  { id: "copper", label: "Copper", swatch: "#8b5a2b", hint: "Burnished bronze", dark: false },
  { id: "sakura", label: "Sakura", swatch: "#d95f8a", hint: "Cherry blossom pink", dark: false },
  { id: "arctic", label: "Arctic", swatch: "#2a8fa8", hint: "Icy teal & frost", dark: false },
  { id: "terra", label: "Terra", swatch: "#b05a30", hint: "Earthy terracotta", dark: false },
  /* ── Textured surface themes ── */
  {
    id: "vintage",
    label: "Vintage Press",
    swatch: "#7a4520",
    hint: "Sepia newspaper",
    dark: false,
  },
  { id: "paper", label: "Paper", swatch: "#3a4a8a", hint: "Clean parchment", dark: false },
  { id: "kraft", label: "Kraft", swatch: "#8B5E3C", hint: "Cardboard kraft paper", dark: false },
  {
    id: "blueprint",
    label: "Blueprint",
    swatch: "#1A3F6F",
    hint: "Engineering draft paper",
    dark: false,
  },
  { id: "linen", label: "Linen", swatch: "#7A3B2E", hint: "Natural linen & cream", dark: false },
  {
    id: "chalkboard",
    label: "Chalkboard",
    swatch: "#2D5A3D",
    hint: "Warm white, forest green",
    dark: false,
  },
  {
    id: "vellum",
    label: "Vellum",
    swatch: "#4A4A5A",
    hint: "Tracing paper & graphite",
    dark: false,
  },
  { id: "cork", label: "Cork", swatch: "#1A6B6B", hint: "Cork board tan & teal", dark: false },
  /* ── Dark themes ── */
  {
    id: "neon",
    label: "Neon Brutalism",
    swatch: "#39ff7a",
    hint: "Dark + neon green, no radius",
    dark: true,
  },
  { id: "midnight", label: "Midnight", swatch: "#4a7fd8", hint: "Deep midnight blue", dark: true },
  { id: "forest", label: "Dark Forest", swatch: "#22d870", hint: "Pine & moss", dark: true },
  { id: "storm", label: "Storm", swatch: "#3a6fd8", hint: "Charcoal + electric blue", dark: true },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type LoginUi = "plain" | "image";

type ThemeValue = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => Promise<void>;
  saving: boolean;
  loginUi: LoginUi;
  setLoginUi: (v: LoginUi) => Promise<void>;
};

const ThemeContext = createContext<ThemeValue | null>(null);
const THEME_CACHE_KEY = "garuda.theme";
const DEFAULT_THEME: ThemeId = "sky";
const THEME_IDS = new Set<string>(THEMES.map(({ id }) => id));

function validTheme(value: unknown): ThemeId {
  return typeof value === "string" && THEME_IDS.has(value) ? (value as ThemeId) : DEFAULT_THEME;
}

function readCachedTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return validTheme(window.localStorage.getItem(THEME_CACHE_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

function cacheTheme(theme: ThemeId) {
  try {
    window.localStorage.setItem(THEME_CACHE_KEY, theme);
  } catch {
    // Storage can be disabled; the in-memory theme still works.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readCachedTheme);
  const [loginUi, setLoginUiState] = useState<LoginUi>("plain");
  const [saving, setSaving] = useState(false);

  const apply = useCallback((t: ThemeId) => {
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  // Shared fetch helper — called on mount and on page-visibility regain.
  // Tries to fetch both columns; if login_ui doesn't exist yet (migration
  // not run), falls back to fetching just theme so the theme still loads.
  const fetchSettings = useCallback(async () => {
    try {
      if (!isSupabaseConfigured()) return;
      const request = supabase
        .from("app_settings")
        .select("theme, login_ui")
        .limit(1)
        .maybeSingle();
      const { data, error } = await Promise.race([
        request,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("theme settings timeout")), 2500),
        ),
      ]);

      if (error) {
        // Only retry for the known pre-login_ui schema; avoid doubling every
        // transient network failure during the first page load.
        const missingLoginUi = error.code === "42703" || error.code === "PGRST204";
        if (!missingLoginUi) return;
        const { data: fallback } = await supabase
          .from("app_settings")
          .select("theme")
          .limit(1)
          .maybeSingle();
        const next = validTheme(fallback?.theme);
        setThemeState(next);
        apply(next);
        cacheTheme(next);
        return;
      }

      const next = validTheme(data?.theme);
      setThemeState(next);
      apply(next);
      cacheTheme(next);
      setLoginUiState((data?.login_ui as LoginUi) ?? "plain");
    } catch {
      // Supabase not configured yet — keep defaults.
    }
  }, [apply]);

  useEffect(() => {
    void fetchSettings();
    // Re-fetch whenever the user switches back to this tab (covers cross-device
    // changes that may have happened while the tab was in the background).
    function onVisible() {
      if (document.visibilityState === "visible") fetchSettings();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [apply, fetchSettings]);

  useEffect(() => {
    apply(theme);
  }, [apply, theme]);

  // Real-time sync: when admin saves a theme on any device, all open sessions update instantly.
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = supabase
      .channel("theme_sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (row.theme) {
            const next = validTheme(row.theme);
            setThemeState(next);
            apply(next);
            cacheTheme(next);
          }
          if (row.login_ui) {
            setLoginUiState(row.login_ui as LoginUi);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [apply]);

  // Shared save helper — upserts a partial settings object.
  // Gets the existing row id first so we always UPDATE the same row, never
  // accumulate duplicate rows that would cause the wrong row to load later.
  const saveSettings = useCallback(
    async (patch: Partial<{ theme: string; login_ui: string; updated_at: string }>) => {
      const { data } = await supabase.from("app_settings").select("id").limit(1).maybeSingle();
      if (data?.id) {
        await supabase
          .from("app_settings")
          .update(patch)
          .eq("id", data.id as string);
      } else {
        await supabase.from("app_settings").insert(patch);
      }
    },
    [],
  );

  const setTheme = useCallback(
    async (t: ThemeId) => {
      setThemeState(t);
      apply(t);
      cacheTheme(t);
      setSaving(true);
      try {
        await saveSettings({ theme: t });
      } catch {
        // Supabase not configured yet — theme applied locally only.
      }
      setSaving(false);
    },
    [apply, saveSettings],
  );

  const setLoginUi = useCallback(
    async (v: LoginUi) => {
      setLoginUiState(v);
      setSaving(true);
      try {
        await saveSettings({ login_ui: v });
      } catch {
        // Supabase not configured — applied locally only.
      }
      setSaving(false);
    },
    [saveSettings],
  );

  const value = useMemo(
    () => ({ theme, setTheme, saving, loginUi, setLoginUi }),
    [theme, setTheme, saving, loginUi, setLoginUi],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

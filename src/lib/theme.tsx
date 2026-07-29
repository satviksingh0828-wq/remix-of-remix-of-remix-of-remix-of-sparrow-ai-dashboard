import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export const THEMES = [
  /* ── Light accent themes ── */
  { id: "sky",       label: "Azure Sky",      swatch: "#2f7ed8", hint: "Calm corporate blue",      dark: false },
  { id: "emerald",   label: "Emerald",         swatch: "#12926f", hint: "Logistics green",           dark: false },
  { id: "violet",    label: "Deep Violet",     swatch: "#6d4bd8", hint: "Modern & bold",             dark: false },
  { id: "amber",     label: "Warm Amber",      swatch: "#d38b1b", hint: "Bright & energetic",        dark: false },
  { id: "rose",      label: "Signal Rose",     swatch: "#d94f5c", hint: "High visibility",           dark: false },
  { id: "graphite",  label: "Graphite",        swatch: "#4a4f57", hint: "Neutral monochrome",        dark: false },
  { id: "garuda",    label: "Garuda",          swatch: "#8b1a2c", hint: "Crimson & gold",            dark: false },
  { id: "ocean",     label: "Deep Ocean",      swatch: "#1e3a6e", hint: "Professional navy",         dark: false },
  { id: "blaze",     label: "Blaze",           swatch: "#e06820", hint: "Orange on blue-tint",       dark: false },
  { id: "tangerine", label: "Tangerine",       swatch: "#d96a25", hint: "Light warm orange",         dark: false },
  { id: "copper",    label: "Copper",          swatch: "#8b5a2b", hint: "Burnished bronze",          dark: false },
  { id: "sakura",    label: "Sakura",          swatch: "#d95f8a", hint: "Cherry blossom pink",       dark: false },
  { id: "arctic",    label: "Arctic",          swatch: "#2a8fa8", hint: "Icy teal & frost",          dark: false },
  { id: "terra",     label: "Terra",           swatch: "#b05a30", hint: "Earthy terracotta",         dark: false },
  /* ── Textured surface themes ── */
  { id: "vintage",   label: "Vintage Press",   swatch: "#7a4520", hint: "Sepia newspaper",           dark: false },
  { id: "paper",     label: "Paper",           swatch: "#3a4a8a", hint: "Clean parchment",           dark: false },
  /* ── Dark themes ── */
  { id: "neon",      label: "Neon Brutalism",  swatch: "#39ff7a", hint: "Dark + neon green, no radius", dark: true },
  { id: "midnight",  label: "Midnight",        swatch: "#4a7fd8", hint: "Deep midnight blue",        dark: true },
  { id: "forest",    label: "Dark Forest",     swatch: "#22d870", hint: "Pine & moss",               dark: true },
  { id: "storm",     label: "Storm",           swatch: "#3a6fd8", hint: "Charcoal + electric blue",  dark: true },
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("sky");
  const [loginUi, setLoginUiState] = useState<LoginUi>("plain");
  const [saving, setSaving] = useState(false);

  const apply = useCallback((t: ThemeId) => {
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("theme, login_ui")
          .limit(1)
          .maybeSingle();
        if (!active) return;
        const next = (data?.theme as ThemeId) ?? "sky";
        setThemeState(next);
        apply(next);
        setLoginUiState((data?.login_ui as LoginUi) ?? "plain");
      } catch {
        // Supabase not configured yet — keep defaults.
      }
    })();
    apply("sky");
    return () => {
      active = false;
    };
  }, [apply]);

  const setTheme = useCallback(
    async (t: ThemeId) => {
      setThemeState(t);
      apply(t);
      setSaving(true);
      try {
        const { data } = await supabase.from("app_settings").select("id").limit(1).maybeSingle();
        if (data?.id) await supabase.from("app_settings").update({ theme: t }).eq("id", data.id);
        else await supabase.from("app_settings").insert({ theme: t });
      } catch {
        // Supabase not configured yet — theme applied locally only.
      }
      setSaving(false);
    },
    [apply],
  );

  const setLoginUi = useCallback(async (v: LoginUi) => {
    setLoginUiState(v);
    setSaving(true);
    try {
      const { data } = await supabase.from("app_settings").select("id").limit(1).maybeSingle();
      if (data?.id) await supabase.from("app_settings").update({ login_ui: v }).eq("id", data.id);
      else await supabase.from("app_settings").insert({ login_ui: v });
    } catch {
      // Supabase not configured — applied locally only.
    }
    setSaving(false);
  }, []);

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

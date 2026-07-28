import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export const THEMES = [
  { id: "sky", label: "Azure Sky", swatch: "#2f7ed8", hint: "Calm corporate blue" },
  { id: "emerald", label: "Fresh Emerald", swatch: "#12926f", hint: "Logistics green" },
  { id: "violet", label: "Deep Violet", swatch: "#6d4bd8", hint: "Modern & bold" },
  { id: "amber", label: "Warm Amber", swatch: "#d38b1b", hint: "Bright and energetic" },
  { id: "rose", label: "Signal Rose", swatch: "#d94f5c", hint: "High visibility" },
  { id: "graphite", label: "Graphite", swatch: "#4a4f57", hint: "Neutral monochrome" },
  { id: "garuda", label: "Garuda", swatch: "#8b1a2c", hint: "Crimson & gold" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

type ThemeValue = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => Promise<void>;
  saving: boolean;
};

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("sky");
  const [saving, setSaving] = useState(false);

  const apply = useCallback((t: ThemeId) => {
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.from("app_settings").select("theme").limit(1).maybeSingle();
        const next = (data?.theme as ThemeId) ?? "sky";
        if (!active) return;
        setThemeState(next);
        apply(next);
      } catch {
        // Supabase not configured yet — keep the default theme.
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

  const value = useMemo(() => ({ theme, setTheme, saving }), [theme, setTheme, saving]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

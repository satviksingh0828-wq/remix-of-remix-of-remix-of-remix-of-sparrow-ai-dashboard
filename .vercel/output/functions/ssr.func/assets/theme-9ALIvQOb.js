import { t as supabase } from "./client-B1QWR90o.js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { jsx } from "react/jsx-runtime";
//#region src/lib/theme.tsx
var THEMES = [
	{
		id: "sky",
		label: "Azure Sky",
		swatch: "#2f7ed8",
		hint: "Calm corporate blue"
	},
	{
		id: "emerald",
		label: "Fresh Emerald",
		swatch: "#12926f",
		hint: "Logistics green"
	},
	{
		id: "violet",
		label: "Deep Violet",
		swatch: "#6d4bd8",
		hint: "Modern & bold"
	},
	{
		id: "amber",
		label: "Warm Amber",
		swatch: "#d38b1b",
		hint: "Bright and energetic"
	},
	{
		id: "rose",
		label: "Signal Rose",
		swatch: "#d94f5c",
		hint: "High visibility"
	},
	{
		id: "graphite",
		label: "Graphite",
		swatch: "#4a4f57",
		hint: "Neutral monochrome"
	}
];
var ThemeContext = createContext(null);
function ThemeProvider({ children }) {
	const [theme, setThemeState] = useState("sky");
	const [saving, setSaving] = useState(false);
	const apply = useCallback((t) => {
		document.documentElement.setAttribute("data-theme", t);
	}, []);
	useEffect(() => {
		let active = true;
		(async () => {
			const { data } = await supabase.from("app_settings").select("theme").limit(1).maybeSingle();
			const next = data?.theme ?? "sky";
			if (!active) return;
			setThemeState(next);
			apply(next);
		})();
		apply("sky");
		return () => {
			active = false;
		};
	}, [apply]);
	const setTheme = useCallback(async (t) => {
		setThemeState(t);
		apply(t);
		setSaving(true);
		const { data } = await supabase.from("app_settings").select("id").limit(1).maybeSingle();
		if (data?.id) await supabase.from("app_settings").update({ theme: t }).eq("id", data.id);
		else await supabase.from("app_settings").insert({ theme: t });
		setSaving(false);
	}, [apply]);
	const value = useMemo(() => ({
		theme,
		setTheme,
		saving
	}), [
		theme,
		setTheme,
		saving
	]);
	return /* @__PURE__ */ jsx(ThemeContext.Provider, {
		value,
		children
	});
}
function useTheme() {
	const ctx = useContext(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
	return ctx;
}
//#endregion
export { ThemeProvider as n, useTheme as r, THEMES as t };

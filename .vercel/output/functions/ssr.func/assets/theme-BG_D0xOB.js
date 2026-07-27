import { i as require_jsx_runtime, p as __toESM, u as require_react } from "./react-dom-Dq4Ayi9w.js";
import { t as supabase } from "./client-Bkpf2bR_.js";
//#region src/lib/theme.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
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
var ThemeContext = (0, import_react.createContext)(null);
function ThemeProvider({ children }) {
	const [theme, setThemeState] = (0, import_react.useState)("sky");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const apply = (0, import_react.useCallback)((t) => {
		document.documentElement.setAttribute("data-theme", t);
	}, []);
	(0, import_react.useEffect)(() => {
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
	const setTheme = (0, import_react.useCallback)(async (t) => {
		setThemeState(t);
		apply(t);
		setSaving(true);
		const { data } = await supabase.from("app_settings").select("id").limit(1).maybeSingle();
		if (data?.id) await supabase.from("app_settings").update({ theme: t }).eq("id", data.id);
		else await supabase.from("app_settings").insert({ theme: t });
		setSaving(false);
	}, [apply]);
	const value = (0, import_react.useMemo)(() => ({
		theme,
		setTheme,
		saving
	}), [
		theme,
		setTheme,
		saving
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeContext.Provider, {
		value,
		children
	});
}
function useTheme() {
	const ctx = (0, import_react.useContext)(ThemeContext);
	if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
	return ctx;
}
//#endregion
export { ThemeProvider as n, useTheme as r, THEMES as t };

import { n as RequireAuth, r as Skeleton, t as AppShell } from "./AppShell-BnxEBzUr.js";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Database, FileText, Settings2, Truck, Users } from "lucide-react";
//#region src/routes/home.tsx?tsr-split=component
var MODULES = [
	{
		key: "operation",
		label: "Operation",
		desc: "Trips, consignments & dispatch",
		icon: Truck,
		active: true,
		to: "/operations"
	},
	{
		key: "masters",
		label: "Masters",
		desc: "Vehicles, drivers, transporters & locations",
		icon: Database,
		active: true,
		to: "/masters"
	},
	{
		key: "dashboard",
		label: "Dashboard",
		desc: "Live fleet & revenue overview",
		icon: BarChart3
	},
	{
		key: "reports",
		label: "Reports",
		desc: "Statements, MIS & exports",
		icon: FileText
	},
	{
		key: "users",
		label: "Users",
		desc: "Roles, access & activity log",
		icon: Users
	},
	{
		key: "settings",
		label: "Settings",
		desc: "Company, branches, departments & appearance",
		icon: Settings2,
		active: true,
		to: "/settings"
	}
];
function HomePage() {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		const t = setTimeout(() => setLoading(false), 700);
		return () => clearTimeout(t);
	}, []);
	return /* @__PURE__ */ jsxs(AppShell, { children: [/* @__PURE__ */ jsxs("div", {
		className: "animate-fade-up",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "text-xs font-medium uppercase tracking-[0.22em] text-primary",
				children: "Workspace"
			}),
			/* @__PURE__ */ jsx("h1", {
				className: "mt-2 text-3xl font-semibold tracking-tight",
				children: "Choose a module"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "mt-2 max-w-xl text-sm text-muted-foreground",
				children: "Six modules power Project TMS. Settings is live today — the rest are being rolled out."
			})
		]
	}), /* @__PURE__ */ jsx("div", {
		className: "mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3",
		children: loading ? Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-40 rounded-2xl" }, i)) : MODULES.map((m, i) => {
			const Icon = m.icon;
			const enabled = "active" in m && m.active;
			return /* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: () => enabled && "to" in m && m.to ? navigate({ to: m.to }) : toast.info(`${m.label} module is coming soon`),
				style: { animationDelay: `${i * 55}ms` },
				className: "group surface-card animate-fade-up relative flex h-40 flex-col items-start p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: `flex size-11 items-center justify-center rounded-xl transition-colors ${enabled ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground"}`,
						children: /* @__PURE__ */ jsx(Icon, { className: "size-5" })
					}),
					/* @__PURE__ */ jsx("span", {
						className: "mt-4 text-base font-semibold tracking-tight",
						children: m.label
					}),
					/* @__PURE__ */ jsx("span", {
						className: "mt-1 text-sm text-muted-foreground",
						children: m.desc
					}),
					/* @__PURE__ */ jsx("span", {
						className: "absolute right-5 top-6 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
						children: enabled ? /* @__PURE__ */ jsx(ArrowRight, { className: "size-4 text-primary transition-transform group-hover:translate-x-1" }) : "Soon"
					})
				]
			}, m.key);
		})
	})] });
}
var SplitComponent = () => /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(HomePage, {}) });
//#endregion
export { SplitComponent as component };

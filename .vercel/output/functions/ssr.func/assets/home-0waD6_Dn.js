import { i as require_jsx_runtime, p as __toESM, u as require_react } from "./react-dom-Dq4Ayi9w.js";
import { a as useNavigate, n as toast } from "./dist-B5LMTscI.js";
import { s as createLucideIcon } from "./button-Cg6e1uWQ.js";
import { t as FileText } from "./file-text-7oSJ1Xjw.js";
import { n as RequireAuth, r as Skeleton, t as AppShell } from "./AppShell-fbB4GQtd.js";
import { t as Truck } from "./truck-B1Qv8gJx.js";
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ArrowRight = createLucideIcon("arrow-right", [["path", {
	d: "M5 12h14",
	key: "1ays0h"
}], ["path", {
	d: "m12 5 7 7-7 7",
	key: "xquz4c"
}]]);
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var ChartColumn = createLucideIcon("chart-column", [
	["path", {
		d: "M3 3v16a2 2 0 0 0 2 2h16",
		key: "c24i48"
	}],
	["path", {
		d: "M18 17V9",
		key: "2bz60n"
	}],
	["path", {
		d: "M13 17V5",
		key: "1frdt8"
	}],
	["path", {
		d: "M8 17v-3",
		key: "17ska0"
	}]
]);
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Database = createLucideIcon("database", [
	["ellipse", {
		cx: "12",
		cy: "5",
		rx: "9",
		ry: "3",
		key: "msslwz"
	}],
	["path", {
		d: "M3 5V19A9 3 0 0 0 21 19V5",
		key: "1wlel7"
	}],
	["path", {
		d: "M3 12A9 3 0 0 0 21 12",
		key: "mv7ke4"
	}]
]);
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Settings2 = createLucideIcon("settings-2", [
	["path", {
		d: "M14 17H5",
		key: "gfn3mx"
	}],
	["path", {
		d: "M19 7h-9",
		key: "6i9tg"
	}],
	["circle", {
		cx: "17",
		cy: "17",
		r: "3",
		key: "18b49y"
	}],
	["circle", {
		cx: "7",
		cy: "7",
		r: "3",
		key: "dfmy0x"
	}]
]);
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Users = createLucideIcon("users", [
	["path", {
		d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
		key: "1yyitq"
	}],
	["path", {
		d: "M16 3.128a4 4 0 0 1 0 7.744",
		key: "16gr8j"
	}],
	["path", {
		d: "M22 21v-2a4 4 0 0 0-3-3.87",
		key: "kshegd"
	}],
	["circle", {
		cx: "9",
		cy: "7",
		r: "4",
		key: "nufk8"
	}]
]);
//#endregion
//#region src/routes/home.tsx?tsr-split=component
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
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
		icon: ChartColumn
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
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const t = setTimeout(() => setLoading(false), 700);
		return () => clearTimeout(t);
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "animate-fade-up",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-medium uppercase tracking-[0.22em] text-primary",
				children: "Workspace"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-2 text-3xl font-semibold tracking-tight",
				children: "Choose a module"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-sm text-muted-foreground",
				children: "Six modules power Project TMS. Settings is live today — the rest are being rolled out."
			})
		]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3",
		children: loading ? Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-40 rounded-2xl" }, i)) : MODULES.map((m, i) => {
			const Icon = m.icon;
			const enabled = "active" in m && m.active;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				onClick: () => enabled && "to" in m && m.to ? navigate({ to: m.to }) : toast.info(`${m.label} module is coming soon`),
				style: { animationDelay: `${i * 55}ms` },
				className: "group surface-card animate-fade-up relative flex h-40 flex-col items-start p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `flex size-11 items-center justify-center rounded-xl transition-colors ${enabled ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground"}`,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-4 text-base font-semibold tracking-tight",
						children: m.label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-1 text-sm text-muted-foreground",
						children: m.desc
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute right-5 top-6 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground",
						children: enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "size-4 text-primary transition-transform group-hover:translate-x-1" }) : "Soon"
					})
				]
			}, m.key);
		})
	})] });
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HomePage, {}) });
//#endregion
export { SplitComponent as component };

import { t as SessionProvider } from "./session-PXnsX560.js";
import { n as ThemeProvider } from "./theme-9ALIvQOb.js";
import { useMemo } from "react";
import { HeadContent, Link, Outlet, Scripts, createFileRoute, createRootRouteWithContext, createRouter, lazyRouteComponent, useRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { Toaster } from "sonner";
import "lucide-react";
//#region src/lib/query-persist.ts
/**
* IndexedDB-backed cache for react-query. Persisted across reloads so lists that
* already loaded once appear instantly on the next visit; a background refetch
* keeps them fresh.
*/
function createIdbPersister() {
	return createAsyncStoragePersister({
		storage: {
			getItem: async (key) => await get(key) ?? null,
			setItem: async (key, value) => {
				await set(key, value);
			},
			removeItem: async (key) => {
				await del(key);
			}
		},
		key: "app-query-cache",
		throttleTime: 1e3
	});
}
var DEFAULT_QUERY_OPTIONS = { queries: {
	staleTime: 3e4,
	gcTime: 30 * 6e4,
	refetchOnWindowFocus: false,
	retry: 1
} };
function makeQueryClient() {
	return new QueryClient({ defaultOptions: DEFAULT_QUERY_OPTIONS });
}
//#endregion
//#region src/styles.css?url
var styles_default = "/assets/styles-YKe3FEGT.css";
//#endregion
//#region src/components/ui/sonner.tsx
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ jsx(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
//#endregion
//#region src/routes/__root.tsx
function NotFoundComponent() {
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ jsx("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-6",
					children: /* @__PURE__ */ jsx(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ jsx("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ jsx("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$7 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{
				name: "author",
				content: "Sparrow AI Solutions"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap"
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "en",
		"data-theme": "sky",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [children, /* @__PURE__ */ jsx(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$7.useRouteContext();
	return /* @__PURE__ */ jsx(PersistQueryClientProvider, {
		client: queryClient,
		persistOptions: {
			persister: useMemo(() => typeof window === "undefined" ? null : createIdbPersister(), []) ?? {
				persistClient: async () => {},
				restoreClient: async () => void 0,
				removeClient: async () => {}
			},
			maxAge: 1440 * 60 * 1e3
		},
		children: /* @__PURE__ */ jsx(SessionProvider, { children: /* @__PURE__ */ jsxs(ThemeProvider, { children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(Toaster$1, { position: "top-right" })] }) })
	});
}
//#endregion
//#region src/routes/sitemap[.]xml.ts
var BASE_URL = "";
var Route$6 = createFileRoute("/sitemap.xml")({ server: { handlers: { GET: async () => {
	const xml = [
		`<?xml version="1.0" encoding="UTF-8"?>`,
		`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
		...[{
			path: "/",
			changefreq: "monthly",
			priority: "1.0"
		}].map((e) => [
			`  <url>`,
			`    <loc>${BASE_URL}${e.path}</loc>`,
			e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
			e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
			e.priority ? `    <priority>${e.priority}</priority>` : null,
			`  </url>`
		].filter(Boolean).join("\n")),
		`</urlset>`
	].join("\n");
	return new Response(xml, { headers: {
		"Content-Type": "application/xml",
		"Cache-Control": "public, max-age=3600"
	} });
} } } });
//#endregion
//#region src/routes/settings.tsx
var $$splitComponentImporter$4 = () => import("./settings-DIZkvZWj.js");
var Route$5 = createFileRoute("/settings")({
	head: () => ({ meta: [
		{ title: "Settings — Project TMS | Sparrow AI Solutions" },
		{
			name: "description",
			content: "Manage company profile, branches, departments and application appearance for Project TMS."
		},
		{
			property: "og:title",
			content: "Settings — Project TMS"
		},
		{
			property: "og:description",
			content: "Company profile, branches, departments and theme settings for Project TMS."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
//#endregion
//#region src/routes/operations.tsx
var $$splitComponentImporter$3 = () => import("./operations-B3Uuqe62.js");
var Route$4 = createFileRoute("/operations")({
	head: () => ({ meta: [
		{ title: "Operations — Project TMS | Sparrow AI Solutions" },
		{
			name: "description",
			content: "Plan and record trips with manifests, contract-based freight, other income, expenses and a profit summary."
		},
		{
			property: "og:title",
			content: "Operations — Project TMS"
		},
		{
			property: "og:description",
			content: "Trips, manifests, income and expenses for Project TMS."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
//#endregion
//#region src/routes/masters.tsx
var $$splitComponentImporter$2 = () => import("./masters-CSlF5n5n.js");
var Route$3 = createFileRoute("/masters")({
	head: () => ({ meta: [
		{ title: "Masters — Project TMS | Sparrow AI Solutions" },
		{
			name: "description",
			content: "Manage vehicles, drivers, transporters and locations for Project TMS with Excel-friendly import and export."
		},
		{
			property: "og:title",
			content: "Masters — Project TMS"
		},
		{
			property: "og:description",
			content: "Vehicles, drivers, transporters and locations for Project TMS."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
//#endregion
//#region src/routes/home.tsx
var $$splitComponentImporter$1 = () => import("./home-B-G1O3yp.js");
var Route$2 = createFileRoute("/home")({
	head: () => ({ meta: [
		{ title: "Workspace — Project TMS | Sparrow AI Solutions" },
		{
			name: "description",
			content: "Project TMS workspace: operations, masters, dashboard, reports, users and settings modules."
		},
		{
			property: "og:title",
			content: "Workspace — Project TMS"
		},
		{
			property: "og:description",
			content: "Operations, masters, dashboard, reports, users and settings in one workspace."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter = () => import("./routes-5x7xQYaD.js");
var Route$1 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "Sign in — Project TMS | Sparrow AI Solutions" },
		{
			name: "description",
			content: "Secure operator sign-in for Project TMS, the transport management workspace by Sparrow AI Solutions."
		},
		{
			property: "og:title",
			content: "Sign in — Project TMS | Sparrow AI Solutions"
		},
		{
			property: "og:description",
			content: "Secure operator sign-in for Project TMS by Sparrow AI Solutions."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
//#region src/routeTree.gen.ts
var SitemapDotxmlRoute = Route$6.update({
	id: "/sitemap.xml",
	path: "/sitemap.xml",
	getParentRoute: () => Route$7
});
var SettingsRoute = Route$5.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => Route$7
});
var OperationsRoute = Route$4.update({
	id: "/operations",
	path: "/operations",
	getParentRoute: () => Route$7
});
var MastersRoute = Route$3.update({
	id: "/masters",
	path: "/masters",
	getParentRoute: () => Route$7
});
var HomeRoute = Route$2.update({
	id: "/home",
	path: "/home",
	getParentRoute: () => Route$7
});
var rootRouteChildren = {
	IndexRoute: Route$1.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$7
	}),
	HomeRoute,
	MastersRoute,
	OperationsRoute,
	SettingsRoute,
	SitemapDotxmlRoute
};
var routeTree = Route$7._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: makeQueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };

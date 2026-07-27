import { n as useSession } from "./session-PXnsX560.js";
import { n as cn, t as Button } from "./button-BpE9Czok.js";
import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { LogOut } from "lucide-react";
//#region src/components/ui/skeleton.tsx
function Skeleton({ className, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		className: cn("animate-pulse rounded-md bg-primary/10", className),
		...props
	});
}
//#endregion
//#region src/components/RequireAuth.tsx
function RequireAuth({ children }) {
	const { ready, user } = useSession();
	const navigate = useNavigate();
	useEffect(() => {
		if (ready && !user) navigate({
			to: "/",
			replace: true
		});
	}, [
		ready,
		user,
		navigate
	]);
	if (!ready || !user) return /* @__PURE__ */ jsx("div", {
		className: "min-h-screen bg-background p-8",
		children: /* @__PURE__ */ jsxs("div", {
			className: "mx-auto max-w-6xl space-y-6",
			children: [/* @__PURE__ */ jsx(Skeleton, { className: "h-12 w-64" }), /* @__PURE__ */ jsx("div", {
				className: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3",
				children: Array.from({ length: 6 }).map((_, i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-36 rounded-2xl" }, i))
			})]
		})
	});
	return /* @__PURE__ */ jsx(Fragment, { children });
}
//#endregion
//#region src/components/AppShell.tsx
function AppShell({ children, breadcrumb }) {
	const { signOut, user } = useSession();
	const navigate = useNavigate();
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen bg-background",
		children: [/* @__PURE__ */ jsx("header", {
			className: "sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur",
			children: /* @__PURE__ */ jsxs("div", {
				className: "mx-auto flex h-16 max-w-6xl items-center gap-4 px-6",
				children: [
					/* @__PURE__ */ jsxs(Link, {
						to: "/home",
						className: "leading-tight",
						children: [/* @__PURE__ */ jsx("span", {
							className: "block text-sm font-semibold tracking-tight",
							children: "Sparrow AI Solutions"
						}), /* @__PURE__ */ jsx("span", {
							className: "block text-[11px] uppercase tracking-[0.18em] text-muted-foreground",
							children: "Project TMS"
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "ml-2 hidden md:block",
						children: breadcrumb
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "ml-auto flex items-center gap-3",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "hidden text-sm text-muted-foreground sm:inline",
							children: ["Signed in as ", /* @__PURE__ */ jsx("span", {
								className: "font-medium text-foreground",
								children: user
							})]
						}), /* @__PURE__ */ jsxs(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => {
								signOut();
								navigate({
									to: "/",
									replace: true
								});
							},
							children: [/* @__PURE__ */ jsx(LogOut, { className: "size-4" }), "Sign out"]
						})]
					})
				]
			})
		}), /* @__PURE__ */ jsx("main", {
			className: "mx-auto max-w-6xl px-6 py-8",
			children
		})]
	});
}
//#endregion
export { RequireAuth as n, Skeleton as r, AppShell as t };

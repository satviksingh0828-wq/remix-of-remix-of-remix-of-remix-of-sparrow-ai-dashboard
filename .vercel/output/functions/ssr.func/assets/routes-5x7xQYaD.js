import { n as useSession } from "./session-PXnsX560.js";
import { t as Button } from "./button-BpE9Czok.js";
import { n as Input, t as Label } from "./label-CwWTNQoo.js";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Loader2, Lock, User } from "lucide-react";
//#region src/routes/index.tsx?tsr-split=component
function LoginPage() {
	const { signIn, user, ready } = useSession();
	const navigate = useNavigate();
	const [id, setId] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	useEffect(() => {
		if (ready && user) navigate({
			to: "/home",
			replace: true
		});
	}, [
		ready,
		user,
		navigate
	]);
	async function onSubmit(e) {
		e.preventDefault();
		setBusy(true);
		setError(null);
		await new Promise((r) => setTimeout(r, 650));
		if (signIn(id, password)) {
			toast.success("Welcome back");
			navigate({
				to: "/home",
				replace: true
			});
		} else {
			setError("Invalid login ID or password.");
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "grid min-h-screen lg:grid-cols-[1.05fr_1fr]",
		children: [/* @__PURE__ */ jsxs("aside", {
			className: "relative hidden items-center justify-center overflow-hidden px-12 lg:flex",
			style: { backgroundImage: "var(--gradient-brand)" },
			children: [
				/* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" }),
				/* @__PURE__ */ jsx("div", { className: "pointer-events-none absolute -bottom-32 -right-16 size-[26rem] rounded-full bg-white/10 blur-3xl" }),
				/* @__PURE__ */ jsxs("div", {
					className: "relative animate-fade-up text-center text-primary-foreground",
					children: [
						/* @__PURE__ */ jsxs("h1", {
							className: "text-4xl font-semibold uppercase leading-tight tracking-[0.14em] xl:text-5xl",
							children: [
								"Sparrow AI",
								/* @__PURE__ */ jsx("br", {}),
								"Solutions"
							]
						}),
						/* @__PURE__ */ jsx("div", { className: "mx-auto my-7 h-px w-24 bg-white/40" }),
						/* @__PURE__ */ jsx("p", {
							className: "text-lg font-medium uppercase tracking-[0.42em] opacity-90",
							children: "Project TMS"
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mx-auto mt-8 max-w-sm text-sm leading-relaxed opacity-80",
							children: "Transport management, masters and operations — unified in one clean workspace."
						})
					]
				})
			]
		}), /* @__PURE__ */ jsx("section", {
			className: "flex items-center justify-center bg-background px-6 py-14",
			children: /* @__PURE__ */ jsxs("div", {
				className: "w-full max-w-sm animate-fade-up",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "mb-9 lg:hidden",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-xl font-semibold uppercase tracking-[0.12em]",
							children: "Sparrow AI Solutions"
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-xs uppercase tracking-[0.35em] text-muted-foreground",
							children: "Project TMS"
						})]
					}),
					/* @__PURE__ */ jsx("h2", {
						className: "text-2xl font-semibold tracking-tight",
						children: "Sign in"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1.5 text-sm text-muted-foreground",
						children: "Enter your operator credentials to continue."
					}),
					/* @__PURE__ */ jsxs("form", {
						onSubmit,
						className: "mt-8 space-y-5",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "loginId",
									children: "Login ID"
								}), /* @__PURE__ */ jsxs("div", {
									className: "relative",
									children: [/* @__PURE__ */ jsx(User, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ jsx(Input, {
										id: "loginId",
										value: id,
										onChange: (e) => setId(e.target.value),
										placeholder: "admin",
										autoComplete: "username",
										className: "h-11 pl-9",
										required: true
									})]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ jsx(Label, {
									htmlFor: "password",
									children: "Password"
								}), /* @__PURE__ */ jsxs("div", {
									className: "relative",
									children: [/* @__PURE__ */ jsx(Lock, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ jsx(Input, {
										id: "password",
										type: "password",
										value: password,
										onChange: (e) => setPassword(e.target.value),
										placeholder: "••••••••",
										autoComplete: "current-password",
										className: "h-11 pl-9",
										required: true
									})]
								})]
							}),
							error ? /* @__PURE__ */ jsx("p", {
								className: "animate-fade-in rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive",
								children: error
							}) : null,
							/* @__PURE__ */ jsxs(Button, {
								type: "submit",
								disabled: busy,
								className: "h-11 w-full",
								children: [busy ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : null, busy ? "Signing in…" : "Sign in"]
							})
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-8 text-center text-xs text-muted-foreground",
						children: "Access is limited to authorised operators. Contact your administrator for credentials."
					})
				]
			})
		})]
	});
}
//#endregion
export { LoginPage as component };

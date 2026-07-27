import { i as require_jsx_runtime, p as __toESM, u as require_react } from "./react-dom-Dq4Ayi9w.js";
import { t as Link } from "./link-CKzZ5ILk.js";
import { n as toast } from "./dist-B5LMTscI.js";
import { t as supabase } from "./client-Bkpf2bR_.js";
import { o as cn, t as Button } from "./button-Cg6e1uWQ.js";
import { A as Building2, D as Plus, E as Save, O as ChevronRight, T as Trash2, a as SelectTrigger, i as SelectItem, j as ArrowLeft, k as Check, n as Select, o as SelectValue, r as SelectContent, t as CsvIO } from "./CsvIO-BcC9PDu7.js";
import { A as MapPin, C as CommandList, S as CommandItem, _ as PopoverTrigger, a as LocationPinPair, b as CommandGroup, c as basisRanges, d as rangeLabel, f as branchName, g as PopoverContent, h as Popover, i as VEHICLE_CONFIG, j as ChevronsUpDown, k as Search, l as basisUnit, m as fetchAll, n as LOCATION_CONFIG, p as useBranches, r as TRANSPORTER_CONFIG, t as DRIVER_CONFIG, u as rangeKey, v as Command, x as CommandInput, y as CommandEmpty } from "./configs-BCM5Bo-K.js";
import { t as FileText } from "./file-text-7oSJ1Xjw.js";
import { n as Input, r as LoaderCircle, t as Label } from "./label-D7-hsNzd.js";
import { n as RequireAuth, r as Skeleton, t as AppShell } from "./AppShell-fbB4GQtd.js";
import { t as Truck } from "./truck-B1Qv8gJx.js";
import { t as User } from "./user-DbJnru8E.js";
//#region src/components/BranchSelect.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function BranchSelect({ value, onChange, label = "Controlling Branch" }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const branches = useBranches();
	const selected = branches.find((b) => b.id === value);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1.5 sm:col-span-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
			className: "text-xs font-medium text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
			open,
			onOpenChange: setOpen,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "outline",
					role: "combobox",
					"aria-expanded": open,
					className: "h-10 w-full justify-between font-normal",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex min-w-0 items-center gap-2 truncate",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4 shrink-0 text-muted-foreground" }), selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "truncate",
							children: [selected.branch_name, selected.branch_type ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "ml-1 text-muted-foreground",
								children: [
									"(",
									selected.branch_type,
									")"
								]
							}) : null]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted-foreground",
							children: "Select branch"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronsUpDown, { className: "ml-2 size-4 shrink-0 opacity-50" })]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverContent, {
				className: "w-[--radix-popover-trigger-width] p-0",
				align: "start",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Command, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandInput, { placeholder: "Search branches…" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandList, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandEmpty, { children: "No branches found." }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandGroup, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandItem, {
					value: "__none__",
					onSelect: () => {
						onChange(null);
						setOpen(false);
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: cn("size-4", !value ? "opacity-100" : "opacity-0") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted-foreground",
						children: "No branch"
					})]
				}), branches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandItem, {
					value: `${b.branch_name} ${b.branch_type ?? ""}`,
					onSelect: () => {
						onChange(b.id);
						setOpen(false);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: cn("size-4", value === b.id ? "opacity-100" : "opacity-0") }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: b.branch_name
						}),
						b.branch_type ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-auto text-xs text-muted-foreground",
							children: b.branch_type
						}) : null
					]
				}, b.id))] })] })] })
			})]
		})]
	});
}
//#endregion
//#region src/components/masters/MasterList.tsx
function MasterList({ config }) {
	const [items, setItems] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const branches = useBranches();
	const allFieldKeys = config.sections.flatMap((s) => s.fields.map((f) => f.key));
	const emptyRow = Object.fromEntries(allFieldKeys.map((k) => [k, ""]));
	if (config.hasBranch) emptyRow.branch_id = null;
	const columns = [...allFieldKeys, ...config.hasBranch ? ["branch_name"] : []];
	async function load() {
		setLoading(true);
		try {
			setItems(await fetchAll(() => supabase.from(config.table).select("*").order("created_at", { ascending: true })));
		} catch {
			toast.error(`Could not load ${config.entityLabel.toLowerCase()}`);
		}
		setLoading(false);
	}
	(0, import_react.useEffect)(() => {
		load();
	}, [config.table]);
	const set = (k) => (v) => setEditing((f) => f ? {
		...f,
		[k]: v
	} : f);
	async function onSubmit(e) {
		e.preventDefault();
		if (!editing) return;
		setSaving(true);
		const { id, created_at: _c, updated_at: _u, branch_name: _bn, ...rest } = editing;
		const payload = rest;
		const res = id ? await supabase.from(config.table).update(payload).eq("id", id) : await supabase.from(config.table).insert(payload);
		setSaving(false);
		if (res.error) return toast.error(res.error.message);
		toast.success(id ? `${config.singular} updated` : `${config.singular} created`);
		setEditing(null);
		load();
	}
	async function remove(id) {
		const { error } = await supabase.from(config.table).delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success(`${config.singular} removed`);
		load();
	}
	async function onImport(rows) {
		const nameToId = new Map(branches.map((b) => [b.branch_name.toLowerCase(), b.id]));
		const payload = rows.filter((r) => (r[config.titleKey] || "").trim() !== "").map((r) => {
			const o = {};
			for (const k of allFieldKeys) o[k] = r[k] ?? "";
			if (config.hasBranch) {
				const n = (r.branch_name || "").trim().toLowerCase();
				o.branch_id = n ? nameToId.get(n) ?? null : null;
			}
			return o;
		});
		if (payload.length === 0) return {
			inserted: 0,
			failed: rows.length
		};
		const { error, count } = await supabase.from(config.table).insert(payload, { count: "exact" });
		if (error) {
			toast.error(error.message);
			return {
				inserted: 0,
				failed: payload.length
			};
		}
		await load();
		return {
			inserted: count ?? payload.length,
			failed: rows.length - payload.length
		};
	}
	const rowsForExport = items.map((r) => ({
		...r,
		branch_name: config.hasBranch ? branchName(branches, r.branch_id) : void 0
	}));
	if (editing) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit,
		className: "animate-fade-up space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "ghost",
					size: "sm",
					onClick: () => setEditing(null),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), "Back to list"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold tracking-tight",
					children: editing.id ? `Edit ${config.singular}` : `New ${config.singular}`
				})]
			}),
			config.sections.map((sec) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-semibold tracking-tight",
					children: sec.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
					children: sec.fields.map((f) => {
						const val = String(editing[f.key] ?? "");
						if (f.options) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `space-y-1.5 ${f.full ? "sm:col-span-2" : ""}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								className: "text-xs font-medium text-muted-foreground",
								children: [f.label, f.required ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-destructive",
									children: " *"
								}) : null]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: val || void 0,
								onValueChange: (v) => set(f.key)(v),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "h-10 w-full",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: f.options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: o,
									children: o
								}, o)) })]
							})]
						}, f.key);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `space-y-1.5 ${f.full ? "sm:col-span-2" : ""}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
								className: "text-xs font-medium text-muted-foreground",
								children: [f.label, f.required ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-destructive",
									children: " *"
								}) : null]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: f.type ?? "text",
								value: val,
								required: f.required,
								onChange: (e) => set(f.key)(e.target.value),
								className: "h-10"
							})]
						}, f.key);
					})
				})]
			}, sec.title)),
			config.hasBranch ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold tracking-tight",
						children: "Controlling branch"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: [
							"Link this ",
							config.singular,
							" to a branch defined in Settings."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BranchSelect, {
							value: editing.branch_id ?? null,
							onChange: (id) => setEditing((f) => f ? {
								...f,
								branch_id: id
							} : f)
						})
					})
				]
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-end gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: () => setEditing(null),
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "submit",
					disabled: saving,
					className: "h-10",
					children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), saving ? "Saving…" : `Save ${config.singular}`]
				})]
			})
		]
	});
	const Icon = config.icon;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "animate-fade-up space-y-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg font-semibold tracking-tight",
				children: config.entityLabel
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: config.emptyMsg
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CsvIO, {
					entityLabel: config.entityLabel,
					filename: config.table,
					columns,
					rows: rowsForExport,
					onImport
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => setEditing({ ...emptyRow }),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }),
						"New ",
						config.singular
					]
				})]
			})]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-20 rounded-xl" }, i))
		}) : items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "surface-card flex flex-col items-center justify-center px-6 py-16 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-6" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 text-sm font-medium",
					children: [
						"No ",
						config.entityLabel.toLowerCase(),
						" yet"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Create one, or import a filled template."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "mt-5",
					onClick: () => setEditing({ ...emptyRow }),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }),
						"New ",
						config.singular
					]
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-3",
			children: items.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				style: { animationDelay: `${i * 40}ms` },
				className: "surface-card animate-fade-up flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm font-semibold",
							children: String(r[config.titleKey] ?? "—")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-xs text-muted-foreground",
							children: config.subtitleKeys.map((k) => k === "branch_name" ? branchName(branches, r.branch_id) : String(r[k] ?? "")).filter(Boolean).join(" · ") || "No details"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex shrink-0 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => setEditing(r),
							children: "Edit"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => r.id && remove(r.id),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4 text-destructive" })
						})]
					})
				]
			}, r.id))
		})]
	});
}
//#endregion
//#region src/components/masters/ContractForm.tsx
var EMPTY_CONTRACT = {
	contract_name: "",
	weight_ranges: [{
		from: "0",
		to: "100"
	}],
	quantity_ranges: [{
		from: "0",
		to: "100"
	}],
	freight_basis: "weight",
	loading_basis: "weight",
	company_name: "",
	legal_business_name: "",
	company_type: "",
	industry: "",
	pan: "",
	gstin: "",
	cin: "",
	msme_udyam: "",
	tan: "",
	iec: "",
	address_line1: "",
	address_line2: "",
	city: "",
	state: "",
	country: "",
	pin_code: "",
	mobile_number: "",
	telephone_number: "",
	email: "",
	website: ""
};
function Section({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "surface-card p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-sm font-semibold tracking-tight",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-5",
			children
		})]
	});
}
function TextField({ label, value, onChange, full, type, required }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `space-y-1.5 ${full ? "sm:col-span-2" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
			className: "text-xs font-medium text-muted-foreground",
			children: [label, required ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-destructive",
				children: " *"
			}) : null]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			value,
			required,
			type: type ?? "text",
			onChange: (e) => onChange(e.target.value),
			className: "h-10"
		})]
	});
}
function RangeEditor({ title, unit, ranges, onChange }) {
	const update = (i, patch) => {
		const next = ranges.slice();
		next[i] = {
			...next[i],
			...patch
		};
		onChange(next);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: [title, ". Leave the last \"To\" blank to mean infinity (e.g. 500+)."]
			}),
			ranges.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						className: "h-10",
						placeholder: "From",
						value: r.from,
						onChange: (e) => update(i, { from: e.target.value })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted-foreground",
						children: "→"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						className: "h-10",
						placeholder: `To (blank = ∞)`,
						value: r.to,
						onChange: (e) => update(i, { to: e.target.value })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "w-10 text-xs text-muted-foreground",
						children: unit
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						size: "sm",
						onClick: () => onChange(ranges.filter((_, j) => j !== i)),
						disabled: ranges.length <= 1,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4 text-destructive" })
					})
				]
			}, i)),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				type: "button",
				variant: "outline",
				size: "sm",
				onClick: () => {
					const last = ranges[ranges.length - 1];
					onChange([...ranges, {
						from: last?.to || "",
						to: ""
					}]);
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Add range"]
			})
		]
	});
}
function ContractForm({ initial, onCancel, onSaved }) {
	const [form, setForm] = (0, import_react.useState)(initial);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [showCompany, setShowCompany] = (0, import_react.useState)(!!initial.company_name);
	async function onSubmit(e) {
		e.preventDefault();
		setSaving(true);
		const { id, ...rest } = form;
		const payload = rest;
		const res = id ? await supabase.from("contracts").update(payload).eq("id", id) : await supabase.from("contracts").insert(payload);
		setSaving(false);
		if (res.error) return toast.error(res.error.message);
		toast.success(id ? "Contract updated" : "Contract created");
		onSaved();
	}
	const patch = (p) => setForm((f) => ({
		...f,
		...p
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit,
		className: "animate-fade-up space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "ghost",
					size: "sm",
					onClick: onCancel,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), "Back to contracts"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold tracking-tight",
					children: form.id ? "Edit contract" : "New contract"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Contract",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
						label: "Contract Name",
						required: true,
						full: true,
						value: form.contract_name,
						onChange: (v) => patch({ contract_name: v })
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Weight ranges (kg)",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RangeEditor, {
					title: "Define weight slabs in kg",
					unit: "kg",
					ranges: form.weight_ranges,
					onChange: (r) => patch({ weight_ranges: r })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Quantity ranges",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RangeEditor, {
					title: "Define quantity slabs",
					unit: "qty",
					ranges: form.quantity_ranges,
					onChange: (r) => patch({ quantity_ranges: r })
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Section, {
				title: "Basis",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							className: "text-xs font-medium text-muted-foreground",
							children: "Freight uses"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: form.freight_basis,
							onValueChange: (v) => patch({ freight_basis: v }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "h-10",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "weight",
								children: "Weight range (kg)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "quantity",
								children: "Quantity range"
							})] })]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							className: "text-xs font-medium text-muted-foreground",
							children: "Loading charges use"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: form.loading_basis,
							onValueChange: (v) => patch({ loading_basis: v }),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "h-10",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "weight",
								children: "Weight range (kg)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "quantity",
								children: "Quantity range"
							})] })]
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold tracking-tight",
						children: "Contracting company details"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: "Optional — details of the company you are contracting with."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "outline",
						size: "sm",
						onClick: () => setShowCompany((s) => !s),
						children: showCompany ? "Hide" : "Show"
					})]
				}), showCompany ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Company Name",
							full: true,
							value: form.company_name ?? "",
							onChange: (v) => patch({ company_name: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Legal Business Name",
							value: form.legal_business_name ?? "",
							onChange: (v) => patch({ legal_business_name: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Company Type",
							value: form.company_type ?? "",
							onChange: (v) => patch({ company_type: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Industry",
							value: form.industry ?? "",
							onChange: (v) => patch({ industry: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "PAN",
							value: form.pan ?? "",
							onChange: (v) => patch({ pan: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "GSTIN",
							value: form.gstin ?? "",
							onChange: (v) => patch({ gstin: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "CIN",
							value: form.cin ?? "",
							onChange: (v) => patch({ cin: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "MSME / Udyam",
							value: form.msme_udyam ?? "",
							onChange: (v) => patch({ msme_udyam: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "TAN",
							value: form.tan ?? "",
							onChange: (v) => patch({ tan: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "IEC",
							value: form.iec ?? "",
							onChange: (v) => patch({ iec: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Address Line 1",
							full: true,
							value: form.address_line1 ?? "",
							onChange: (v) => patch({ address_line1: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Address Line 2",
							full: true,
							value: form.address_line2 ?? "",
							onChange: (v) => patch({ address_line2: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "City",
							value: form.city ?? "",
							onChange: (v) => patch({ city: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "State",
							value: form.state ?? "",
							onChange: (v) => patch({ state: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Country",
							value: form.country ?? "",
							onChange: (v) => patch({ country: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "PIN Code",
							value: form.pin_code ?? "",
							onChange: (v) => patch({ pin_code: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Mobile",
							value: form.mobile_number ?? "",
							onChange: (v) => patch({ mobile_number: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Telephone",
							value: form.telephone_number ?? "",
							onChange: (v) => patch({ telephone_number: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Email",
							type: "email",
							value: form.email ?? "",
							onChange: (v) => patch({ email: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TextField, {
							label: "Website",
							value: form.website ?? "",
							onChange: (v) => patch({ website: v })
						})
					]
				}) : null]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-end gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: onCancel,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "submit",
					disabled: saving,
					children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), saving ? "Saving…" : "Save contract"]
				})]
			})
		]
	});
}
//#endregion
//#region src/components/ui/textarea.tsx
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
//#endregion
//#region src/components/masters/ContractEntryForm.tsx
function emptyEntry(contract_id) {
	return {
		contract_id,
		from_location_id: null,
		to_location_id: null,
		from_pin_code: "",
		to_pin_code: "",
		freight_values: {},
		loading_values: {},
		per_manifest_amount: "",
		per_manifest_note: ""
	};
}
function AmountNote({ title, amount, note, onAmount, onNote }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "surface-card p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-sm font-semibold tracking-tight",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					className: "text-xs font-medium text-muted-foreground",
					children: "Amount"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "number",
					className: "h-10",
					value: amount,
					onChange: (e) => onAmount(e.target.value)
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-1.5 sm:col-span-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					className: "text-xs font-medium text-muted-foreground",
					children: "Note"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					rows: 2,
					value: note,
					onChange: (e) => onNote(e.target.value)
				})]
			})]
		})]
	});
}
function ContractEntryForm({ contract, initial, onCancel, onSaved }) {
	const [form, setForm] = (0, import_react.useState)(initial);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const freightRanges = basisRanges(contract, contract.freight_basis);
	const freightUnit = basisUnit(contract.freight_basis);
	const loadingRanges = basisRanges(contract, contract.loading_basis);
	const loadingUnit = basisUnit(contract.loading_basis);
	const patch = (p) => setForm((f) => ({
		...f,
		...p
	}));
	async function onSubmit(e) {
		e.preventDefault();
		setSaving(true);
		const { id, ...rest } = form;
		const payload = rest;
		const res = id ? await supabase.from("contract_entries").update(payload).eq("id", id) : await supabase.from("contract_entries").insert(payload);
		setSaving(false);
		if (res.error) return toast.error(res.error.message);
		toast.success(id ? "Entry updated" : "Entry added");
		onSaved();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit,
		className: "animate-fade-up space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "ghost",
					size: "sm",
					onClick: onCancel,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), "Back to entries"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold tracking-tight",
					children: form.id ? "Edit entry" : "New entry"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-semibold tracking-tight",
					children: "Route"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocationPinPair, {
						label: "From",
						locationId: form.from_location_id,
						pinCode: form.from_pin_code,
						onChange: (n) => patch({
							from_location_id: n.location_id,
							from_pin_code: n.pin_code
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocationPinPair, {
						label: "To",
						locationId: form.to_location_id,
						pinCode: form.to_pin_code,
						onChange: (n) => patch({
							to_location_id: n.location_id,
							to_pin_code: n.pin_code
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "text-sm font-semibold tracking-tight",
						children: [
							"Freight (",
							contract.freight_basis,
							")"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-xs text-muted-foreground",
						children: [
							"One amount per ",
							contract.freight_basis,
							" slab defined on the contract."
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
						children: freightRanges.map((r) => {
							const key = rangeKey(r);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs font-medium text-muted-foreground",
									children: rangeLabel(r, freightUnit)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									className: "h-10",
									value: form.freight_values[key] ?? "",
									onChange: (e) => patch({ freight_values: {
										...form.freight_values,
										[key]: e.target.value
									} })
								})]
							}, `f-${key}`);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "surface-card p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "text-sm font-semibold tracking-tight",
					children: [
						"Loading charges (",
						contract.loading_basis,
						")"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
					children: loadingRanges.map((r) => {
						const key = rangeKey(r);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs font-medium text-muted-foreground",
								children: rangeLabel(r, loadingUnit)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								className: "h-10",
								value: form.loading_values[key] ?? "",
								onChange: (e) => patch({ loading_values: {
									...form.loading_values,
									[key]: e.target.value
								} })
							})]
						}, `l-${key}`);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AmountNote, {
				title: "Per manifest change",
				amount: form.per_manifest_amount,
				note: form.per_manifest_note,
				onAmount: (v) => patch({ per_manifest_amount: v }),
				onNote: (v) => patch({ per_manifest_note: v })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-end gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: onCancel,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "submit",
					disabled: saving,
					children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), saving ? "Saving…" : "Save entry"]
				})]
			})
		]
	});
}
//#endregion
//#region src/components/masters/Contracts.tsx
var CONTRACT_COLUMNS = [
	"contract_name",
	"weight_ranges",
	"quantity_ranges",
	"freight_basis",
	"loading_basis",
	"company_name",
	"legal_business_name",
	"company_type",
	"industry",
	"pan",
	"gstin",
	"cin",
	"msme_udyam",
	"tan",
	"iec",
	"address_line1",
	"address_line2",
	"city",
	"state",
	"country",
	"pin_code",
	"mobile_number",
	"telephone_number",
	"email",
	"website"
];
function Contracts() {
	const [view, setView] = (0, import_react.useState)({ kind: "list" });
	const [contracts, setContracts] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	async function load() {
		setLoading(true);
		try {
			setContracts(await fetchAll(() => supabase.from("contracts").select("*").order("created_at", { ascending: true })));
		} catch {
			toast.error("Could not load contracts");
		}
		setLoading(false);
	}
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	async function removeContract(id) {
		const { error } = await supabase.from("contracts").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Contract removed");
		load();
	}
	async function onImportContracts(rows) {
		const payload = rows.filter((r) => (r.contract_name || "").trim() !== "").map((r) => {
			const o = {};
			for (const k of CONTRACT_COLUMNS) o[k] = r[k] ?? "";
			try {
				o.weight_ranges = r.weight_ranges ? JSON.parse(r.weight_ranges) : [];
			} catch {
				o.weight_ranges = [];
			}
			try {
				o.quantity_ranges = r.quantity_ranges ? JSON.parse(r.quantity_ranges) : [];
			} catch {
				o.quantity_ranges = [];
			}
			o.freight_basis = (r.freight_basis || "weight").trim() || "weight";
			o.loading_basis = (r.loading_basis || "weight").trim() || "weight";
			return o;
		});
		if (payload.length === 0) return {
			inserted: 0,
			failed: rows.length
		};
		const { error, count } = await supabase.from("contracts").insert(payload, { count: "exact" });
		if (error) {
			toast.error(error.message);
			return {
				inserted: 0,
				failed: payload.length
			};
		}
		await load();
		return {
			inserted: count ?? payload.length,
			failed: rows.length - payload.length
		};
	}
	const exportRows = contracts.map((c) => ({
		...c,
		weight_ranges: JSON.stringify(c.weight_ranges ?? []),
		quantity_ranges: JSON.stringify(c.quantity_ranges ?? [])
	}));
	if (view.kind === "new-contract") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContractForm, {
		initial: { ...EMPTY_CONTRACT },
		onCancel: () => setView({ kind: "list" }),
		onSaved: () => {
			setView({ kind: "list" });
			load();
		}
	});
	if (view.kind === "edit-contract") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContractForm, {
		initial: view.contract,
		onCancel: () => setView({ kind: "list" }),
		onSaved: () => {
			setView({ kind: "list" });
			load();
		}
	});
	if (view.kind === "entries" || view.kind === "new-entry" || view.kind === "edit-entry") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntriesView, {
		contract: view.contract,
		view,
		onBack: () => setView({ kind: "list" }),
		onNew: () => setView({
			kind: "new-entry",
			contract: view.contract
		}),
		onEdit: (e) => setView({
			kind: "edit-entry",
			contract: view.contract,
			entry: e
		}),
		onCancelForm: () => setView({
			kind: "entries",
			contract: view.contract
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "animate-fade-up space-y-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg font-semibold tracking-tight",
				children: "Contracts"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: "Freight contracts with weight or quantity slabs. Open a contract to add route-wise entries."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CsvIO, {
					entityLabel: "Contracts",
					filename: "contracts",
					columns: CONTRACT_COLUMNS,
					rows: exportRows,
					onImport: onImportContracts
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => setView({ kind: "new-contract" }),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "New contract"]
				})]
			})]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-20 rounded-xl" }, i))
		}) : contracts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "surface-card flex flex-col items-center justify-center px-6 py-16 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-6" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm font-medium",
					children: "No contracts yet"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Create your first contract to define weight and quantity slabs."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "mt-5",
					onClick: () => setView({ kind: "new-contract" }),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "New contract"]
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-3",
			children: contracts.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				style: { animationDelay: `${i * 40}ms` },
				className: "surface-card animate-fade-up flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm font-semibold",
							children: c.contract_name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate text-xs text-muted-foreground",
							children: [
								"Freight: ",
								c.freight_basis,
								" · Loading: ",
								c.loading_basis,
								" ·",
								" ",
								c.weight_ranges?.length ?? 0,
								" weight slabs ·",
								" ",
								c.quantity_ranges?.length ?? 0,
								" qty slabs"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex shrink-0 gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								onClick: () => setView({
									kind: "entries",
									contract: c
								}),
								children: "Open"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => setView({
									kind: "edit-contract",
									contract: c
								}),
								children: "Edit"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => c.id && removeContract(c.id),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4 text-destructive" })
							})
						]
					})
				]
			}, c.id))
		})]
	});
}
function EntriesView({ contract, view, onBack, onNew, onEdit, onCancelForm }) {
	const [entries, setEntries] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [locNames, setLocNames] = (0, import_react.useState)({});
	const freightRanges = basisRanges(contract, contract.freight_basis);
	const loadingRanges = basisRanges(contract, contract.loading_basis);
	const freightUnit = basisUnit(contract.freight_basis);
	basisUnit(contract.loading_basis);
	const entryColumns = (0, import_react.useMemo)(() => {
		const freightCols = freightRanges.map((r) => `freight_${rangeKey(r)}`);
		const loadingCols = loadingRanges.map((r) => `loading_${rangeKey(r)}`);
		return [
			"from_location",
			"from_pin_code",
			"to_location",
			"to_pin_code",
			...freightCols,
			...loadingCols,
			"per_manifest_amount",
			"per_manifest_note"
		];
	}, [freightRanges, loadingRanges]);
	async function load() {
		setLoading(true);
		try {
			const rows = await fetchAll(() => supabase.from("contract_entries").select("*").eq("contract_id", contract.id).order("created_at", { ascending: true }));
			setEntries(rows);
			const ids = Array.from(new Set(rows.flatMap((r) => [r.from_location_id, r.to_location_id]).filter(Boolean)));
			if (ids.length) {
				const locs = await fetchAll(() => supabase.from("locations").select("id,location_name").in("id", ids));
				const map = {};
				locs.forEach((l) => {
					map[l.id] = l.location_name;
				});
				setLocNames(map);
			}
		} catch {
			toast.error("Could not load entries");
		}
		setLoading(false);
	}
	(0, import_react.useEffect)(() => {
		load();
	}, [contract.id]);
	async function remove(id) {
		const { error } = await supabase.from("contract_entries").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Entry removed");
		load();
	}
	async function onImport(rows) {
		const all = await fetchAll(() => supabase.from("locations").select("id,location_name,pin_code"));
		const nameToId = new Map(all.map((l) => [l.location_name.trim().toLowerCase(), l.id]));
		const pinToId = new Map(all.filter((l) => (l.pin_code ?? "").trim() !== "").map((l) => [(l.pin_code ?? "").trim(), l.id]));
		const pinById = new Map(all.map((l) => [l.id, (l.pin_code ?? "").trim()]));
		const resolve = (name, pin) => {
			const n = (name ?? "").trim().toLowerCase();
			const p = (pin ?? "").trim();
			const id = pinToId.get(p) ?? nameToId.get(n) ?? null;
			return {
				id,
				pin: p || (id ? pinById.get(id) ?? "" : "")
			};
		};
		const payload = rows.map((r) => {
			const freight_values = {};
			freightRanges.forEach((rg) => {
				const k = rangeKey(rg);
				const v = r[`freight_${k}`];
				if (v !== void 0 && v !== "") freight_values[k] = v;
			});
			const loading_values = {};
			loadingRanges.forEach((rg) => {
				const k = rangeKey(rg);
				const v = r[`loading_${k}`];
				if (v !== void 0 && v !== "") loading_values[k] = v;
			});
			const from = resolve(r.from_location ?? "", r.from_pin_code ?? "");
			const to = resolve(r.to_location ?? "", r.to_pin_code ?? "");
			return {
				contract_id: contract.id,
				from_location_id: from.id,
				to_location_id: to.id,
				from_pin_code: from.pin,
				to_pin_code: to.pin,
				freight_values,
				loading_values,
				per_manifest_amount: r.per_manifest_amount ?? "",
				per_manifest_note: r.per_manifest_note ?? ""
			};
		});
		if (payload.length === 0) return {
			inserted: 0,
			failed: rows.length
		};
		const { error, count } = await supabase.from("contract_entries").insert(payload, { count: "exact" });
		if (error) {
			toast.error(error.message);
			return {
				inserted: 0,
				failed: payload.length
			};
		}
		await load();
		return {
			inserted: count ?? payload.length,
			failed: rows.length - payload.length
		};
	}
	const exportRows = entries.map((e) => {
		const row = {
			from_location: e.from_location_id ? locNames[e.from_location_id] ?? "" : "",
			from_pin_code: e.from_pin_code,
			to_location: e.to_location_id ? locNames[e.to_location_id] ?? "" : "",
			to_pin_code: e.to_pin_code,
			per_manifest_amount: e.per_manifest_amount,
			per_manifest_note: e.per_manifest_note
		};
		freightRanges.forEach((r) => {
			const k = rangeKey(r);
			row[`freight_${k}`] = (e.freight_values ?? {})[k] ?? "";
		});
		loadingRanges.forEach((r) => {
			const k = rangeKey(r);
			row[`loading_${k}`] = (e.loading_values ?? {})[k] ?? "";
		});
		return row;
	});
	if (view.kind === "new-entry") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContractEntryForm, {
		contract,
		initial: emptyEntry(contract.id),
		onCancel: onCancelForm,
		onSaved: () => {
			onCancelForm();
			load();
		}
	});
	if (view.kind === "edit-entry") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContractEntryForm, {
		contract,
		initial: view.entry,
		onCancel: onCancelForm,
		onSaved: () => {
			onCancelForm();
			load();
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "animate-fade-up space-y-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "ghost",
					size: "sm",
					onClick: onBack,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), "Contracts"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-semibold tracking-tight",
					children: contract.contract_name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-muted-foreground",
					children: [
						"Freight: ",
						contract.freight_basis,
						" · Loading: ",
						contract.loading_basis
					]
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CsvIO, {
					entityLabel: "Entries",
					filename: `${contract.contract_name.replace(/\s+/g, "_")}-entries`,
					columns: entryColumns,
					rows: exportRows,
					onImport
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: onNew,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "New entry"]
				})]
			})]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 rounded-xl" }, i))
		}) : entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "surface-card flex flex-col items-center justify-center px-6 py-16 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "size-6" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm font-medium",
					children: "No entries yet"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Add trip-wise rates for this contract, or import a filled template."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "mt-5",
					onClick: onNew,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "New entry"]
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-3",
			children: entries.map((e, i) => {
				const from = e.from_location_id ? locNames[e.from_location_id] : "";
				const to = e.to_location_id ? locNames[e.to_location_id] : "";
				const firstFreight = freightRanges[0];
				const preview = firstFreight ? `${rangeLabel(firstFreight, freightUnit)}: ${(e.freight_values ?? {})[rangeKey(firstFreight)] ?? "—"}` : "";
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					style: { animationDelay: `${i * 40}ms` },
					className: "surface-card animate-fade-up flex items-center gap-4 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm font-semibold",
							children: (from || "—") + " → " + (to || "—")
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate text-xs text-muted-foreground",
							children: [[e.from_pin_code, e.to_pin_code].filter(Boolean).join(" → "), preview ? " · " + preview : ""]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex shrink-0 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => onEdit(e),
							children: "Edit"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => e.id && remove(e.id),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4 text-destructive" })
						})]
					})]
				}, e.id);
			})
		})]
	});
}
//#endregion
//#region src/routes/masters.tsx?tsr-split=component
var TABS = [
	{
		id: "vehicle",
		label: "Vehicle",
		desc: "Fleet & specifications",
		icon: Truck
	},
	{
		id: "driver",
		label: "Driver",
		desc: "Staff & licences",
		icon: User
	},
	{
		id: "transporter",
		label: "Transporter",
		desc: "Owners & brokers",
		icon: Building2
	},
	{
		id: "location",
		label: "Locations",
		desc: "Pickup & drop points",
		icon: MapPin
	},
	{
		id: "contract",
		label: "Contracts",
		desc: "Rates & slabs",
		icon: FileText
	}
];
function MastersPage() {
	const [tab, setTab] = (0, import_react.useState)("vehicle");
	const active = TABS.find((t) => t.id === tab);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		breadcrumb: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center gap-1.5 text-sm text-muted-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/home",
					className: "hover:text-foreground",
					children: "Workspace"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-3.5" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-foreground",
					children: "Masters"
				})
			]
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-8 lg:grid-cols-[240px_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "lg:sticky lg:top-24 lg:self-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
					children: "Masters"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-1",
					children: TABS.map((t) => {
						const Icon = t.icon;
						const isActive = t.id === tab;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setTab(t.id),
							className: `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-200 ${isActive ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: `size-4 ${isActive ? "text-primary" : ""}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "leading-tight",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-sm font-medium",
									children: t.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-[11px] opacity-70",
									children: t.desc
								})]
							})]
						}) }, t.id);
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "animate-fade-in min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
						className: "mb-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-2xl font-semibold tracking-tight",
							children: active.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm text-muted-foreground",
							children: active.desc
						})]
					}),
					tab === "vehicle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MasterList, { config: VEHICLE_CONFIG }) : null,
					tab === "driver" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MasterList, { config: DRIVER_CONFIG }) : null,
					tab === "transporter" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MasterList, { config: TRANSPORTER_CONFIG }) : null,
					tab === "location" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MasterList, { config: LOCATION_CONFIG }) : null,
					tab === "contract" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Contracts, {}) : null
				]
			}, tab)]
		})
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MastersPage, {}) });
//#endregion
export { SplitComponent as component };

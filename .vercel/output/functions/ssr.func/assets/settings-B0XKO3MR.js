import { i as require_jsx_runtime, p as __toESM, u as require_react } from "./react-dom-Dq4Ayi9w.js";
import { t as Link } from "./link-CKzZ5ILk.js";
import { n as toast } from "./dist-B5LMTscI.js";
import { t as supabase } from "./client-Bkpf2bR_.js";
import { r as useTheme, t as THEMES } from "./theme-BG_D0xOB.js";
import { s as createLucideIcon, t as Button } from "./button-Cg6e1uWQ.js";
import { A as Building2, D as Plus, E as Save, O as ChevronRight, T as Trash2, a as SelectTrigger, i as SelectItem, j as ArrowLeft, k as Check, n as Select, o as SelectValue, r as SelectContent, t as CsvIO } from "./CsvIO-BcC9PDu7.js";
import { n as Input, r as LoaderCircle, t as Label } from "./label-D7-hsNzd.js";
import { n as RequireAuth, r as Skeleton, t as AppShell } from "./AppShell-fbB4GQtd.js";
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Building = createLucideIcon("building", [
	["path", {
		d: "M12 10h.01",
		key: "1nrarc"
	}],
	["path", {
		d: "M12 14h.01",
		key: "1etili"
	}],
	["path", {
		d: "M12 6h.01",
		key: "1vi96p"
	}],
	["path", {
		d: "M16 10h.01",
		key: "1m94wz"
	}],
	["path", {
		d: "M16 14h.01",
		key: "1gbofw"
	}],
	["path", {
		d: "M16 6h.01",
		key: "1x0f13"
	}],
	["path", {
		d: "M8 10h.01",
		key: "19clt8"
	}],
	["path", {
		d: "M8 14h.01",
		key: "6423bh"
	}],
	["path", {
		d: "M8 6h.01",
		key: "1dz90k"
	}],
	["path", {
		d: "M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3",
		key: "cabbwy"
	}],
	["rect", {
		x: "4",
		y: "2",
		width: "16",
		height: "20",
		rx: "2",
		key: "1uxh74"
	}]
]);
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Palette = createLucideIcon("palette", [
	["path", {
		d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",
		key: "e79jfc"
	}],
	["circle", {
		cx: "13.5",
		cy: "6.5",
		r: ".5",
		fill: "currentColor",
		key: "1okk4w"
	}],
	["circle", {
		cx: "17.5",
		cy: "10.5",
		r: ".5",
		fill: "currentColor",
		key: "f64h9f"
	}],
	["circle", {
		cx: "6.5",
		cy: "12.5",
		r: ".5",
		fill: "currentColor",
		key: "qy21gx"
	}],
	["circle", {
		cx: "8.5",
		cy: "7.5",
		r: ".5",
		fill: "currentColor",
		key: "fotxhn"
	}]
]);
//#endregion
//#region src/components/settings/CompanySettings.tsx
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var COMPANY_TYPES = [
	"Proprietorship",
	"Partnership",
	"LLP",
	"Private Limited",
	"Public Limited",
	"Other"
];
var EMPTY$1 = {
	company_name: "",
	legal_business_name: "",
	company_type: "",
	industry: "",
	pan: "",
	gstin: "",
	cin: "",
	msme_udyam: "",
	tan: "",
	transport_license_number: "",
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
function Section$1({ title, hint, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "surface-card p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold tracking-tight",
				children: title
			}),
			hint ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-xs text-muted-foreground",
				children: hint
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
				children
			})
		]
	});
}
function Field({ label, value, onChange, required, placeholder, type = "text", full }) {
	const id = label.replace(/\W+/g, "-").toLowerCase();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `space-y-1.5 ${full ? "sm:col-span-2" : ""}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
			htmlFor: id,
			className: "text-xs font-medium text-muted-foreground",
			children: [label, required ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-destructive",
				children: " *"
			}) : null]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			id,
			type,
			value,
			placeholder,
			required,
			onChange: (e) => onChange(e.target.value),
			className: "h-10"
		})]
	});
}
function CompanySettings() {
	const [form, setForm] = (0, import_react.useState)(EMPTY$1);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		(async () => {
			const { data, error } = await supabase.from("company").select("*").limit(1).maybeSingle();
			if (error) toast.error("Could not load company details");
			if (data) setForm({
				...EMPTY$1,
				...data
			});
			setLoading(false);
		})();
	}, []);
	const set = (k) => (v) => setForm((f) => ({
		...f,
		[k]: v
	}));
	async function onSubmit(e) {
		e.preventDefault();
		setSaving(true);
		const { id, ...rest } = form;
		const payload = rest;
		const res = id ? await supabase.from("company").update(payload).eq("id", id) : await supabase.from("company").insert(payload).select("id").maybeSingle();
		setSaving(false);
		if (res.error) return toast.error(res.error.message);
		if (!id && "data" in res && res.data) setForm((f) => ({
			...f,
			id: res.data.id
		}));
		toast.success("Company details saved");
	}
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-5",
		children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-64 rounded-2xl" }, i))
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit,
		className: "animate-fade-up space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section$1, {
				title: "Company identity",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Company Name",
						required: true,
						value: form.company_name,
						onChange: set("company_name")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Legal Business Name",
						value: form.legal_business_name,
						onChange: set("legal_business_name")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							className: "text-xs font-medium text-muted-foreground",
							children: "Company Type"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: form.company_type || void 0,
							onValueChange: (v) => setForm((f) => ({
								...f,
								company_type: v
							})),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "h-10 w-full",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select type" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: COMPANY_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: t,
								children: t
							}, t)) })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Industry",
						value: form.industry,
						onChange: set("industry")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section$1, {
				title: "Registration details",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "PAN",
						value: form.pan,
						onChange: set("pan")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "GSTIN",
						value: form.gstin,
						onChange: set("gstin")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "CIN (if applicable)",
						value: form.cin,
						onChange: set("cin")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "MSME / Udyam Number",
						value: form.msme_udyam,
						onChange: set("msme_udyam")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "TAN",
						value: form.tan,
						onChange: set("tan")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Transport License Number",
						value: form.transport_license_number,
						onChange: set("transport_license_number")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "IEC (Import Export Code) — optional",
						value: form.iec,
						onChange: set("iec")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section$1, {
				title: "Registered office",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Address Line 1",
						full: true,
						value: form.address_line1,
						onChange: set("address_line1")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Address Line 2",
						full: true,
						value: form.address_line2,
						onChange: set("address_line2")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "City",
						value: form.city,
						onChange: set("city")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "State",
						value: form.state,
						onChange: set("state")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Country",
						value: form.country,
						onChange: set("country")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "PIN Code",
						value: form.pin_code,
						onChange: set("pin_code")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section$1, {
				title: "Contact information",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Mobile Number",
						value: form.mobile_number,
						onChange: set("mobile_number")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Telephone Number",
						value: form.telephone_number,
						onChange: set("telephone_number")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Email",
						type: "email",
						value: form.email,
						onChange: set("email")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Website",
						value: form.website,
						onChange: set("website")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "submit",
					disabled: saving,
					className: "h-10",
					children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), saving ? "Saving…" : "Save company details"]
				})
			})
		]
	});
}
//#endregion
//#region src/components/settings/BranchSettings.tsx
var BRANCH_TYPES = [
	"Head Office",
	"Regional Office",
	"Branch Office",
	"Depot",
	"Warehouse",
	"Yard"
];
var EMPTY = {
	branch_name: "",
	branch_type: "",
	address_line1: "",
	address_line2: "",
	area_locality: "",
	landmark: "",
	city: "",
	district: "",
	state: "",
	country: "",
	pin_code: "",
	branch_phone: "",
	mobile_number: "",
	email_address: "",
	manager_name: "",
	manager_designation: "",
	manager_mobile: "",
	manager_email: "",
	gstin: "",
	pan: "",
	state_code: ""
};
function Section({ title, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "surface-card p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-sm font-semibold tracking-tight",
			children: title
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
			children
		})]
	});
}
function BranchSettings() {
	const [branches, setBranches] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	async function load() {
		setLoading(true);
		const { data, error } = await supabase.from("branches").select("*").order("created_at", { ascending: true });
		if (error) toast.error("Could not load branches");
		setBranches(data ?? []);
		setLoading(false);
	}
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	const set = (k) => (v) => setEditing((f) => f ? {
		...f,
		[k]: v
	} : f);
	async function onSubmit(e) {
		e.preventDefault();
		if (!editing) return;
		setSaving(true);
		const { id, created_at: _c, updated_at: _u, ...rest } = editing;
		const payload = rest;
		const res = id ? await supabase.from("branches").update(payload).eq("id", id) : await supabase.from("branches").insert(payload);
		setSaving(false);
		if (res.error) return toast.error(res.error.message);
		toast.success(id ? "Branch updated" : "Branch created");
		setEditing(null);
		load();
	}
	async function remove(id) {
		const { error } = await supabase.from("branches").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Branch removed");
		load();
	}
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
					children: editing.id ? "Edit branch" : "New branch"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Branch details",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Branch Name",
					required: true,
					value: editing.branch_name,
					onChange: set("branch_name")
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs font-medium text-muted-foreground",
						children: "Branch Type"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: editing.branch_type || void 0,
						onValueChange: (v) => setEditing((f) => f ? {
							...f,
							branch_type: v
						} : f),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "h-10 w-full",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select type" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: BRANCH_TYPES.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: t,
							children: t
						}, t)) })]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Address",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Address Line 1",
						full: true,
						value: editing.address_line1,
						onChange: set("address_line1")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Address Line 2",
						full: true,
						value: editing.address_line2,
						onChange: set("address_line2")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Area / Locality",
						value: editing.area_locality,
						onChange: set("area_locality")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Landmark",
						value: editing.landmark,
						onChange: set("landmark")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "City",
						value: editing.city,
						onChange: set("city")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "District",
						value: editing.district,
						onChange: set("district")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "State",
						value: editing.state,
						onChange: set("state")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Country",
						value: editing.country,
						onChange: set("country")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "PIN Code",
						value: editing.pin_code,
						onChange: set("pin_code")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Contact",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Branch Phone",
						value: editing.branch_phone,
						onChange: set("branch_phone")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Mobile Number",
						value: editing.mobile_number,
						onChange: set("mobile_number")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Email Address",
						type: "email",
						value: editing.email_address,
						onChange: set("email_address")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Branch manager",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Manager Name",
						value: editing.manager_name,
						onChange: set("manager_name")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Designation",
						value: editing.manager_designation,
						onChange: set("manager_designation")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Mobile",
						value: editing.manager_mobile,
						onChange: set("manager_mobile")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Email",
						type: "email",
						value: editing.manager_email,
						onChange: set("manager_email")
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Section, {
				title: "Tax registration",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "GSTIN",
						value: editing.gstin,
						onChange: set("gstin")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "PAN (if separate)",
						value: editing.pan,
						onChange: set("pan")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "State Code",
						value: editing.state_code,
						onChange: set("state_code")
					})
				]
			}),
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
					children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), saving ? "Saving…" : "Save branch"]
				})]
			})
		]
	});
	const BRANCH_COLUMNS = Object.keys(EMPTY);
	async function onImport(rows) {
		const payload = rows.filter((r) => (r.branch_name || "").trim() !== "").map((r) => {
			const o = {};
			for (const k of BRANCH_COLUMNS) o[k] = r[k] ?? "";
			return o;
		});
		if (payload.length === 0) return {
			inserted: 0,
			failed: rows.length
		};
		const { error, count } = await supabase.from("branches").insert(payload, { count: "exact" });
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "animate-fade-up space-y-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-wrap items-center justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg font-semibold tracking-tight",
				children: "Branches"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 text-sm text-muted-foreground",
				children: "Offices, depots, warehouses and yards linked to your company."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CsvIO, {
					entityLabel: "Branches",
					filename: "branches",
					columns: BRANCH_COLUMNS,
					rows: branches,
					onImport
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => setEditing({ ...EMPTY }),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "New branch"]
				})]
			})]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-20 rounded-xl" }, i))
		}) : branches.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "surface-card flex flex-col items-center justify-center px-6 py-16 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "size-6" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-sm font-medium",
					children: "No branches yet"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Create your first branch to get started."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "mt-5",
					onClick: () => setEditing({ ...EMPTY }),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "New branch"]
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-3",
			children: branches.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
				style: { animationDelay: `${i * 45}ms` },
				className: "surface-card animate-fade-up flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-sm font-semibold",
							children: b.branch_name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "truncate text-xs text-muted-foreground",
							children: [
								b.branch_type,
								b.city,
								b.state
							].filter(Boolean).join(" · ") || "No details yet"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex shrink-0 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => setEditing(b),
							children: "Edit"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => b.id && remove(b.id),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4 text-destructive" })
						})]
					})
				]
			}, b.id))
		})]
	});
}
//#endregion
//#region src/routes/settings.tsx?tsr-split=component
var TABS = [
	{
		id: "company",
		label: "Company",
		desc: "Profile & registration",
		icon: Building
	},
	{
		id: "branch",
		label: "Branch",
		desc: "Locations & managers",
		icon: Building2
	},
	{
		id: "theme",
		label: "Theme Settings",
		desc: "Appearance",
		icon: Palette
	}
];
function SettingsPage() {
	const [tab, setTab] = (0, import_react.useState)("company");
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
					children: "Settings"
				})
			]
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-8 lg:grid-cols-[240px_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "lg:sticky lg:top-24 lg:self-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
					children: "Settings"
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
					tab === "company" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CompanySettings, {}) : null,
					tab === "branch" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BranchSettings, {}) : null,
					tab === "theme" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemePanel, {}) : null
				]
			}, tab)]
		})
	});
}
function ThemePanel() {
	const { theme, setTheme, saving } = useTheme();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "animate-fade-up space-y-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-semibold tracking-tight",
					children: "Accent theme"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs text-muted-foreground",
					children: "Applies across the whole workspace and is saved to the cloud."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
					children: THEMES.map((t) => {
						const isActive = t.id === theme;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: saving,
							onClick: () => setTheme(t.id),
							className: `relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${isActive ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "size-9 shrink-0 rounded-lg",
									style: { backgroundColor: t.swatch }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-sm font-medium",
										children: t.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate text-xs text-muted-foreground",
										children: t.hint
									})]
								}),
								isActive ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "absolute right-3 top-3 size-4 text-primary" }) : null
							]
						}, t.id);
					})
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "surface-card p-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-sm font-semibold tracking-tight",
				children: "Preview"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex flex-wrap items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-xl px-5 py-2.5 text-sm font-medium text-primary-foreground",
						style: { backgroundImage: "var(--gradient-brand)" },
						children: "Primary action"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-xl bg-primary-soft px-5 py-2.5 text-sm font-medium text-primary",
						children: "Soft accent"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-xl border border-border px-5 py-2.5 text-sm font-medium",
						children: "Outline"
					})
				]
			})]
		})]
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsPage, {}) });
//#endregion
export { SplitComponent as component };

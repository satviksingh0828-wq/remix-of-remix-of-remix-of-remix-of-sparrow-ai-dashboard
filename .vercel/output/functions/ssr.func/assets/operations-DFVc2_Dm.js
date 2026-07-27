import { i as require_jsx_runtime, p as __toESM, u as require_react } from "./react-dom-Dq4Ayi9w.js";
import { t as Link } from "./link-CKzZ5ILk.js";
import { n as toast } from "./dist-B5LMTscI.js";
import { t as supabase } from "./client-Bkpf2bR_.js";
import { o as cn, s as createLucideIcon, t as Button } from "./button-Cg6e1uWQ.js";
import { D as Plus, E as Save, O as ChevronRight, T as Trash2, a as SelectTrigger, i as SelectItem, j as ArrowLeft, k as Check, n as Select, o as SelectValue, r as SelectContent, t as CsvIO } from "./CsvIO-BcC9PDu7.js";
import { C as CommandList, D as DialogHeader, E as DialogFooter, O as DialogTitle, S as CommandItem, T as DialogContent, _ as PopoverTrigger, a as LocationPinPair, b as CommandGroup, c as basisRanges, g as PopoverContent, h as Popover, i as VEHICLE_CONFIG, j as ChevronsUpDown, k as Search, m as fetchAll, o as useLocations, p as useBranches, r as TRANSPORTER_CONFIG, s as LocationPicker, t as DRIVER_CONFIG, u as rangeKey, v as Command, w as Dialog, x as CommandInput, y as CommandEmpty } from "./configs-BCM5Bo-K.js";
import { n as Input, r as LoaderCircle, t as Label } from "./label-D7-hsNzd.js";
import { t as Lock } from "./lock-DiOVjMVj.js";
import { n as RequireAuth, r as Skeleton, t as AppShell } from "./AppShell-fbB4GQtd.js";
import { t as Truck } from "./truck-B1Qv8gJx.js";
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Archive = createLucideIcon("archive", [
	["rect", {
		width: "20",
		height: "5",
		x: "2",
		y: "3",
		rx: "1",
		key: "1wp1u1"
	}],
	["path", {
		d: "M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8",
		key: "1s80jp"
	}],
	["path", {
		d: "M10 12h4",
		key: "a56b0p"
	}]
]);
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var RotateCcw = createLucideIcon("rotate-ccw", [["path", {
	d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8",
	key: "1357e3"
}], ["path", {
	d: "M3 3v5h5",
	key: "1xhq8a"
}]]);
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Route = createLucideIcon("route", [
	["circle", {
		cx: "6",
		cy: "19",
		r: "3",
		key: "1kj8tv"
	}],
	["path", {
		d: "M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15",
		key: "1d8sl"
	}],
	["circle", {
		cx: "18",
		cy: "5",
		r: "3",
		key: "gq8acd"
	}]
]);
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var TrendingDown = createLucideIcon("trending-down", [["path", {
	d: "M16 17h6v-6",
	key: "t6n2it"
}], ["path", {
	d: "m22 17-8.5-8.5-5 5L2 7",
	key: "x473p"
}]]);
/**
* @license lucide-react v0.575.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var TrendingUp = createLucideIcon("trending-up", [["path", {
	d: "M16 7h6v6",
	key: "box55l"
}], ["path", {
	d: "m22 7-8.5 8.5-5-5L2 17",
	key: "1t1m79"
}]]);
//#endregion
//#region src/lib/trip-calc.ts
var import_react = /* @__PURE__ */ __toESM(require_react());
function num(v) {
	const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
	return Number.isFinite(n) ? n : 0;
}
function inr(n) {
	return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
function findEntry(entries, m) {
	const byId = entries.find((e) => e.from_location_id && e.to_location_id && e.from_location_id === m.from_location_id && e.to_location_id === m.to_location_id);
	if (byId) return byId;
	const fp = (m.from_pin_code ?? "").trim();
	const tp = (m.to_pin_code ?? "").trim();
	if (!fp || !tp) return void 0;
	return entries.find((e) => (e.from_pin_code ?? "").trim() === fp && (e.to_pin_code ?? "").trim() === tp);
}
function matchRange(ranges, value) {
	return ranges.find((r) => {
		const from = num(r.from);
		const to = (r.to ?? "").trim();
		return value >= from && (to === "" || value <= num(to));
	});
}
function manifestCharges(contract, entry, m) {
	if (!contract || !entry) return {
		freight: 0,
		loading: 0,
		fixed: 0,
		matched: false
	};
	const pick = (basis, values) => {
		const value = basis === "weight" ? num(m.weight_kg) : num(m.quantity);
		const r = matchRange(basisRanges(contract, basis), value);
		return (r ? num(values?.[rangeKey(r)]) : 0) * value;
	};
	return {
		freight: pick(contract.freight_basis, entry.freight_values ?? {}),
		loading: pick(contract.loading_basis, entry.loading_values ?? {}),
		fixed: num(entry.per_manifest_amount),
		matched: true
	};
}
function newTripCode() {
	let digits = "";
	for (let i = 0; i < 10; i++) digits += Math.floor(Math.random() * 10);
	return `TR-${digits}`;
}
//#endregion
//#region src/lib/close-trip.ts
/**
* Closes a trip: takes a full snapshot of every record the trip used
* (trip, manifests, other income, expenses, contract + rate entries,
* vehicle, driver, transporter, branch), writes it to `closed_trips`,
* then deletes the live rows so later master changes never alter history.
*/
async function closeTrip(tripId) {
	const { data: trip, error: tripErr } = await supabase.from("trips").select("*").eq("id", tripId).single();
	if (tripErr || !trip) throw new Error(tripErr?.message ?? "Trip not found");
	const t = trip;
	const [manifestsRes, incomeRes, expenseRes] = await Promise.all([
		supabase.from("trip_manifests").select("*").eq("trip_id", tripId).order("created_at"),
		supabase.from("trip_other_income").select("*").eq("trip_id", tripId).order("created_at"),
		supabase.from("trip_expenses").select("*").eq("trip_id", tripId).order("sort_order")
	]);
	const manifests = manifestsRes.data ?? [];
	const otherIncome = incomeRes.data ?? [];
	const expenses = expenseRes.data ?? [];
	const one = async (table, id) => {
		if (!id) return null;
		const { data } = await supabase.from(table).select("*").eq("id", id).single();
		return data ?? null;
	};
	const [vehicle, driver, transporter, branch, contract] = await Promise.all([
		one("vehicles", t.vehicle_id),
		one("drivers", t.driver_id),
		one("transporters", t.transporter_id),
		one("branches", t.branch_id),
		one("contracts", t.contract_id)
	]);
	let entries = [];
	if (t.contract_id) {
		const { data } = await supabase.from("contract_entries").select("*").eq("contract_id", t.contract_id);
		entries = data ?? [];
	}
	const contractLite = contract;
	const manifestLines = manifests.map((m) => {
		const charges = manifestCharges(contractLite ?? void 0, findEntry(entries, m), m);
		return {
			manifest: m,
			...charges,
			total: charges.freight + charges.loading + charges.fixed
		};
	});
	const manifestTotal = manifestLines.reduce((s, l) => s + l.total, 0);
	const otherIncomeTotal = otherIncome.reduce((s, r) => s + num(r.amount), 0);
	const expenseTotal = expenses.reduce((s, r) => s + num(r.amount), 0);
	const monthlyContractCharges = 0;
	const totalIncome = manifestTotal + otherIncomeTotal;
	const insert = await supabase.from("closed_trips").insert({
		trip_code: String(t.trip_code ?? ""),
		branch_id: t.branch_id ?? null,
		branch_name: String(branch?.branch_name ?? ""),
		start_date: String(t.start_date ?? ""),
		end_date: String(t.end_date ?? ""),
		total_income: totalIncome,
		total_expense: expenseTotal,
		net_income: totalIncome - expenseTotal,
		snapshot: {
			trip: t,
			manifests,
			manifest_lines: manifestLines,
			other_income: otherIncome,
			expenses,
			contract,
			contract_entries: entries,
			vehicle,
			driver,
			transporter,
			branch,
			totals: {
				manifest_income: manifestTotal,
				other_income: otherIncomeTotal,
				total_income: totalIncome,
				total_expense: expenseTotal,
				net_income: totalIncome - expenseTotal,
				monthly_contract_charges: monthlyContractCharges
			},
			closed_at: (/* @__PURE__ */ new Date()).toISOString()
		}
	});
	if (insert.error) throw new Error(insert.error.message);
	await Promise.all([
		supabase.from("trip_manifests").delete().eq("trip_id", tripId),
		supabase.from("trip_other_income").delete().eq("trip_id", tripId),
		supabase.from("trip_expenses").delete().eq("trip_id", tripId)
	]);
	const del = await supabase.from("trips").delete().eq("id", tripId);
	if (del.error) throw new Error(del.error.message);
}
//#endregion
//#region src/lib/reopen-trip.ts
/**
* Reopens a closed trip: restores the trip, its manifests, other income and
* expenses from the archived snapshot back into the live tables, then deletes
* the closed_trips row. Rates are NOT copied from the snapshot — the reopened
* trip re-reads the current contract entries, so any rate changes take
* effect. The trip can be closed again afterwards.
*/
async function reopenTrip(closedId) {
	const { data: closed, error } = await supabase.from("closed_trips").select("*").eq("id", closedId).single();
	if (error || !closed) throw new Error(error?.message ?? "Closed trip not found");
	const snap = closed.snapshot ?? {};
	const tripSnap = snap.trip ?? {};
	const manifests = snap.manifests ?? [];
	const otherIncome = snap.other_income ?? [];
	const expenses = snap.expenses ?? [];
	const strip = (r) => {
		const { id, created_at, updated_at, ...rest } = r;
		return rest;
	};
	const tripInsert = await supabase.from("trips").insert(strip(tripSnap)).select("id").single();
	if (tripInsert.error || !tripInsert.data) throw new Error(tripInsert.error?.message ?? "Could not restore trip");
	const newTripId = tripInsert.data.id;
	const rewire = (rows) => rows.map((r) => ({
		...strip(r),
		trip_id: newTripId
	}));
	if (manifests.length) {
		const res = await supabase.from("trip_manifests").insert(rewire(manifests));
		if (res.error) throw new Error(res.error.message);
	}
	if (otherIncome.length) {
		const res = await supabase.from("trip_other_income").insert(rewire(otherIncome));
		if (res.error) throw new Error(res.error.message);
	}
	if (expenses.length) {
		const res = await supabase.from("trip_expenses").insert(rewire(expenses));
		if (res.error) throw new Error(res.error.message);
	}
	const del = await supabase.from("closed_trips").delete().eq("id", closedId);
	if (del.error) throw new Error(del.error.message);
	return newTripId;
}
//#endregion
//#region src/components/EntityPicker.tsx
var import_jsx_runtime = require_jsx_runtime();
function EntityPicker({ label, placeholder = "Select", value, options, onChange, onAdd, addLabel, full }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const selected = options.find((o) => o.id === value);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("space-y-1.5", full && "sm:col-span-2"),
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
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4 shrink-0 text-muted-foreground" }), selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: selected.label
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-muted-foreground",
							children: placeholder
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronsUpDown, { className: "ml-2 size-4 shrink-0 opacity-50" })]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverContent, {
				className: "w-[--radix-popover-trigger-width] p-0",
				align: "start",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Command, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandInput, { placeholder: "Search…" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandList, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CommandEmpty, { children: "Nothing found." }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandGroup, { children: [onAdd ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandItem, {
					value: "__add_new__",
					onSelect: () => {
						setOpen(false);
						onAdd();
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: addLabel ?? "Add new" })]
				}) : null, options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CommandItem, {
					value: `${o.label} ${o.sub ?? ""}`,
					onSelect: () => {
						onChange(o.id);
						setOpen(false);
					},
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: cn("size-4", value === o.id ? "opacity-100" : "opacity-0") }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: o.label
						}),
						o.sub ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-auto text-xs text-muted-foreground",
							children: o.sub
						}) : null
					]
				}, o.id))] })] })] })
			})]
		})]
	});
}
//#endregion
//#region src/components/operations/TransporterQuickCreate.tsx
var FIELDS = TRANSPORTER_CONFIG.sections;
var KEYS = FIELDS.flatMap((s) => s.fields.map((f) => f.key));
function TransporterQuickCreate({ open, onOpenChange, onCreated }) {
	const [form, setForm] = (0, import_react.useState)(Object.fromEntries(KEYS.map((k) => [k, ""])));
	const [saving, setSaving] = (0, import_react.useState)(false);
	async function submit(e) {
		e.preventDefault();
		if (!form.transporter_name.trim()) return;
		setSaving(true);
		const { data, error } = await supabase.from("transporters").insert(form).select("id").single();
		setSaving(false);
		if (error || !data) return toast.error(error?.message ?? "Failed to save");
		toast.success("Transporter created");
		onCreated(data.id);
		setForm(Object.fromEntries(KEYS.map((k) => [k, ""])));
		onOpenChange(false);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-h-[85vh] max-w-2xl overflow-y-auto",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "New transporter" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "space-y-5",
				children: [FIELDS.map((section) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
					className: "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground",
					children: section.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2",
					children: section.fields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `space-y-1.5 ${f.full ? "sm:col-span-2" : ""}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
							className: "text-xs font-medium text-muted-foreground",
							children: [f.label, f.required ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-destructive",
								children: " *"
							}) : null]
						}), f.options ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: form[f.key] || void 0,
							onValueChange: (v) => setForm({
								...form,
								[f.key]: v
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "h-10",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: f.options.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: o,
								children: o
							}, o)) })]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							className: "h-10",
							type: f.type ?? "text",
							required: f.required,
							value: form[f.key] ?? "",
							onChange: (e) => setForm({
								...form,
								[f.key]: e.target.value
							})
						})]
					}, f.key))
				})] }, section.title)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "outline",
					onClick: () => onOpenChange(false),
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "submit",
					disabled: saving,
					children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : null, "Save transporter"]
				})] })]
			})]
		})
	});
}
//#endregion
//#region src/components/operations/TripForm.tsx
var DEFAULT_EXPENSES = [
	"Fuel Expense",
	"Toll Charges",
	"Driver Bata",
	"Morning Exp.",
	"Night Exp.",
	"Sunday",
	"Parking Charges",
	"Dala Charges",
	"Unloading"
];
function emptyTrip() {
	const now = /* @__PURE__ */ new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return {
		trip_code: newTripCode(),
		ownership: "own",
		branch_id: null,
		vehicle_id: null,
		driver_id: null,
		transporter_id: null,
		contract_id: null,
		start_location_id: null,
		end_location_id: null,
		start_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
		start_time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
		end_date: "",
		end_time: "",
		odometer_start: "",
		odometer_end: ""
	};
}
var TABS$1 = [
	{
		id: "manifest",
		label: "Manifest"
	},
	{
		id: "income",
		label: "Other Income"
	},
	{
		id: "expense",
		label: "Expenses"
	},
	{
		id: "vehicle",
		label: "Vehicle"
	},
	{
		id: "driver",
		label: "Driver"
	},
	{
		id: "transporter",
		label: "Transporter"
	},
	{
		id: "contract",
		label: "Contract"
	},
	{
		id: "summary",
		label: "Summary"
	}
];
function TripForm({ initial, onBack, onSaved }) {
	const [trip, setTrip] = (0, import_react.useState)(initial);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [closing, setClosing] = (0, import_react.useState)(false);
	const [tab, setTab] = (0, import_react.useState)("manifest");
	const [vehicles, setVehicles] = (0, import_react.useState)([]);
	const [drivers, setDrivers] = (0, import_react.useState)([]);
	const [transporters, setTransporters] = (0, import_react.useState)([]);
	const [contracts, setContracts] = (0, import_react.useState)([]);
	const [entries, setEntries] = (0, import_react.useState)([]);
	const [showTransporterForm, setShowTransporterForm] = (0, import_react.useState)(false);
	const [manifests, setManifests] = (0, import_react.useState)([]);
	const [incomes, setIncomes] = (0, import_react.useState)([]);
	const [expenses, setExpenses] = (0, import_react.useState)(DEFAULT_EXPENSES.map((name) => ({
		name,
		amount: "",
		note: ""
	})));
	const { locations } = useLocations();
	const branches = useBranches();
	const patch = (p) => setTrip((t) => ({
		...t,
		...p
	}));
	async function loadMasters() {
		const [v, d, t, c] = await Promise.all([
			supabase.from("vehicles").select("*").order("registration_number"),
			supabase.from("drivers").select("*").order("full_name"),
			supabase.from("transporters").select("*").order("transporter_name"),
			supabase.from("contracts").select("*").order("contract_name")
		]);
		setVehicles(v.data ?? []);
		setDrivers(d.data ?? []);
		setTransporters(t.data ?? []);
		setContracts(c.data ?? []);
	}
	(0, import_react.useEffect)(() => {
		loadMasters();
	}, []);
	(0, import_react.useEffect)(() => {
		(async () => {
			if (!trip.contract_id) return setEntries([]);
			const { data } = await supabase.from("contract_entries").select("*").eq("contract_id", trip.contract_id);
			setEntries(data ?? []);
		})();
	}, [trip.contract_id]);
	async function loadChildren(tripId) {
		const [m, i, e] = await Promise.all([
			supabase.from("trip_manifests").select("*").eq("trip_id", tripId).order("created_at"),
			supabase.from("trip_other_income").select("*").eq("trip_id", tripId).order("created_at"),
			supabase.from("trip_expenses").select("*").eq("trip_id", tripId).order("sort_order")
		]);
		setManifests(m.data ?? []);
		setIncomes((i.data ?? []).map((r) => ({
			id: r.id,
			name: r.income_name,
			amount: r.amount ?? "",
			note: r.note ?? ""
		})));
		const exp = (e.data ?? []).map((r) => ({
			id: r.id,
			name: r.expense_name,
			amount: r.amount ?? "",
			note: r.note ?? ""
		}));
		setExpenses(exp.length > 0 ? exp : DEFAULT_EXPENSES.map((name) => ({
			name,
			amount: "",
			note: ""
		})));
	}
	(0, import_react.useEffect)(() => {
		if (initial.id) loadChildren(initial.id);
	}, [initial.id]);
	const contract = contracts.find((c) => c.id === trip.contract_id);
	const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
	const driver = drivers.find((d) => d.id === trip.driver_id);
	const transporter = transporters.find((t) => t.id === trip.transporter_id);
	const distance = trip.odometer_start && trip.odometer_end ? num(trip.odometer_end) - num(trip.odometer_start) : null;
	const lines = manifests.map((m) => ({
		m,
		...manifestCharges(contract, findEntry(entries, m), m)
	}));
	const manifestTotal = lines.reduce((s, l) => s + l.freight + l.loading + l.fixed, 0);
	const otherIncomeTotal = incomes.reduce((s, r) => s + num(r.amount), 0);
	const expenseTotal = expenses.reduce((s, r) => s + num(r.amount), 0);
	const totalWeight = manifests.reduce((s, m) => s + num(m.weight_kg), 0);
	const payload = vehicle ? num(vehicle.payload_capacity_kg) : 0;
	const deadWeight = trip.ownership === "own" && payload > 0 ? payload - totalWeight : null;
	async function saveTrip(e) {
		e?.preventDefault();
		if (!trip.branch_id) {
			toast.error("Branch is required");
			return;
		}
		setSaving(true);
		const { id, ...rest } = trip;
		const res = id ? await supabase.from("trips").update(rest).eq("id", id).select("id").single() : await supabase.from("trips").insert(rest).select("id").single();
		setSaving(false);
		if (res.error) return toast.error(res.error.message);
		const newId = res.data.id;
		if (!id) setTrip((t) => ({
			...t,
			id: newId
		}));
		toast.success(id ? "Trip updated" : "Trip created");
		onSaved();
		return newId;
	}
	async function requireTripId() {
		if (trip.id) return trip.id;
		const id = await saveTrip();
		return typeof id === "string" ? id : null;
	}
	async function saveLines(table, rows, nameCol) {
		const tripId = await requireTripId();
		if (!tripId) return;
		await supabase.from(table).delete().eq("trip_id", tripId);
		const payloadRows = rows.filter((r) => r.name.trim() !== "").map((r, idx) => ({
			trip_id: tripId,
			[nameCol]: r.name,
			amount: r.amount,
			note: r.note,
			...table === "trip_expenses" ? { sort_order: idx } : {}
		}));
		if (payloadRows.length > 0) {
			const { error } = await supabase.from(table).insert(payloadRows);
			if (error) return toast.error(error.message);
		}
		toast.success("Saved");
		loadChildren(tripId);
	}
	async function handleClose() {
		if (!trip.id) return toast.error("Save the trip before closing it");
		if (!window.confirm("Close this trip? A full snapshot is archived and the live trip is removed. This cannot be undone.")) return;
		setClosing(true);
		try {
			await closeTrip(trip.id);
			toast.success("Trip closed and archived");
			onSaved();
			onBack();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not close trip");
		} finally {
			setClosing(false);
		}
	}
	const vehicleOpts = vehicles.map((v) => ({
		id: v.id,
		label: String(v.registration_number ?? ""),
		sub: [v.manufacturer, v.model].filter(Boolean).join(" ") || void 0
	}));
	const driverOpts = drivers.map((d) => ({
		id: d.id,
		label: String(d.full_name ?? ""),
		sub: String(d.mobile_number ?? "") || void 0
	}));
	const transporterOpts = transporters.map((t) => ({
		id: t.id,
		label: String(t.transporter_name ?? ""),
		sub: String(t.city ?? "") || void 0
	}));
	const contractOpts = contracts.map((c) => ({
		id: c.id,
		label: String(c.contract_name ?? ""),
		sub: String(c.company_name ?? "") || void 0
	}));
	const branchOpts = branches.map((b) => ({
		id: b.id,
		label: b.branch_name,
		sub: b.branch_type ?? void 0
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "animate-fade-up space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "ghost",
						size: "sm",
						onClick: onBack,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "size-4" }), "Back to trips"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-semibold tracking-tight",
						children: trip.trip_code
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "ml-auto",
						onClick: () => saveTrip(),
						disabled: saving,
						children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), trip.id ? "Update trip" : "Save trip"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						onClick: handleClose,
						disabled: closing || !trip.id,
						title: "Archive a snapshot of this trip and remove it from live records",
						children: [closing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4" }), "Close trip"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: saveTrip,
				className: "surface-card space-y-5 p-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-semibold tracking-tight",
					children: "Trip details"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs font-medium text-muted-foreground",
								children: "Trip ID"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "h-10",
								value: trip.trip_code,
								readOnly: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs font-medium text-muted-foreground",
								children: "Ownership"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: trip.ownership,
								onValueChange: (v) => patch({
									ownership: v,
									...v === "own" ? { transporter_id: null } : {
										vehicle_id: null,
										driver_id: null
									}
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "h-10",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "own",
									children: "Own vehicle"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "third_party",
									children: "Third party"
								})] })]
							})]
						}),
						trip.ownership === "own" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntityPicker, {
							label: "Vehicle",
							value: trip.vehicle_id,
							options: vehicleOpts,
							onChange: (id) => patch({ vehicle_id: id })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntityPicker, {
							label: "Driver",
							value: trip.driver_id,
							options: driverOpts,
							onChange: (id) => patch({ driver_id: id })
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntityPicker, {
							label: "Transporter",
							value: trip.transporter_id,
							options: transporterOpts,
							onChange: (id) => patch({ transporter_id: id }),
							onAdd: () => setShowTransporterForm(true),
							addLabel: "Add new transporter"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntityPicker, {
							label: "Contract",
							value: trip.contract_id,
							options: contractOpts,
							onChange: (id) => patch({ contract_id: id })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntityPicker, {
							label: "Branch (required)",
							value: trip.branch_id,
							options: branchOpts,
							onChange: (id) => patch({ branch_id: id })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocationPicker, {
							label: "Starting Location",
							value: trip.start_location_id,
							onChange: (id) => patch({ start_location_id: id })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocationPicker, {
							label: "Ending Location",
							value: trip.end_location_id,
							onChange: (id) => patch({ end_location_id: id })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Start Date",
							type: "date",
							value: trip.start_date,
							onChange: (v) => patch({ start_date: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Start Time",
							type: "time",
							value: trip.start_time,
							onChange: (v) => patch({ start_time: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "End Date",
							type: "date",
							value: trip.end_date,
							onChange: (v) => patch({ end_date: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "End Time",
							type: "time",
							value: trip.end_time,
							onChange: (v) => patch({ end_time: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Odometer Start",
							type: "number",
							value: trip.odometer_start,
							onChange: (v) => patch({ odometer_start: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Odometer End",
							type: "number",
							value: trip.odometer_end,
							onChange: (v) => patch({ odometer_end: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl bg-muted px-4 py-3 text-sm sm:col-span-2",
							children: [
								"Distance travelled:",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold",
									children: distance === null ? "—" : `${distance.toLocaleString("en-IN")} km`
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "surface-card overflow-hidden",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-1 border-b border-border p-2",
					children: TABS$1.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTab(t.id),
						className: `rounded-lg px-3 py-1.5 text-sm transition-colors ${tab === t.id ? "bg-primary-soft font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`,
						children: t.label
					}, t.id))
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-6",
					children: [
						tab === "manifest" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ManifestTab, {
							tripId: trip.id ?? null,
							requireTripId,
							manifests,
							lines,
							total: manifestTotal,
							locations,
							reload: (id) => loadChildren(id)
						}) : null,
						tab === "income" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LineTab, {
							title: "Other income",
							nameLabel: "Income name",
							rows: incomes,
							setRows: setIncomes,
							total: otherIncomeTotal,
							onSave: () => saveLines("trip_other_income", incomes, "income_name")
						}) : null,
						tab === "expense" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LineTab, {
							title: "Expenses",
							nameLabel: "Expense name",
							rows: expenses,
							setRows: setExpenses,
							total: expenseTotal,
							onSave: () => saveLines("trip_expenses", expenses, "expense_name")
						}) : null,
						tab === "vehicle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Details, {
							record: vehicle,
							sections: VEHICLE_CONFIG.sections,
							empty: "No vehicle selected."
						}) : null,
						tab === "driver" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Details, {
							record: driver,
							sections: DRIVER_CONFIG.sections,
							empty: "No driver selected."
						}) : null,
						tab === "transporter" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Details, {
							record: transporter,
							sections: TRANSPORTER_CONFIG.sections,
							empty: "No transporter selected."
						}) : null,
						tab === "contract" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContractDetails, {
							contract,
							entryCount: entries.length,
							monthlyCharges: 0
						}) : null,
						tab === "summary" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Summary, {
							manifestTotal,
							otherIncomeTotal,
							expenseTotal,
							totalWeight,
							payload,
							deadWeight,
							manifestCount: manifests.length,
							distance
						}) : null
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TransporterQuickCreate, {
				open: showTransporterForm,
				onOpenChange: setShowTransporterForm,
				onCreated: async (id) => {
					await loadMasters();
					patch({ transporter_id: id });
				}
			})
		]
	});
}
function Field({ label, value, onChange, type = "text" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
			className: "text-xs font-medium text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			className: "h-10",
			type,
			value: value ?? "",
			onChange: (e) => onChange(e.target.value)
		})]
	});
}
function emptyManifest(tripId) {
	return {
		trip_id: tripId,
		manifest_number: "",
		from_location_id: null,
		from_pin_code: "",
		to_location_id: null,
		to_pin_code: "",
		weight_kg: "",
		quantity: ""
	};
}
function ManifestTab({ tripId, requireTripId, manifests, lines, total, locations, reload }) {
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const csvColumns = [
		"manifest_number",
		"from_location",
		"from_pin_code",
		"to_location",
		"to_pin_code",
		"weight_kg",
		"quantity"
	];
	const nameById = (0, import_react.useMemo)(() => new Map(locations.map((l) => [l.id, l.location_name])), [locations]);
	const idByName = (0, import_react.useMemo)(() => new Map(locations.map((l) => [l.location_name.toLowerCase(), l.id])), [locations]);
	const idByPin = (0, import_react.useMemo)(() => new Map(locations.filter((l) => (l.pin_code ?? "").trim() !== "").map((l) => [(l.pin_code ?? "").trim(), l.id])), [locations]);
	const csvRows = manifests.map((m) => ({
		manifest_number: m.manifest_number,
		from_location: nameById.get(m.from_location_id ?? "") ?? "",
		from_pin_code: m.from_pin_code,
		to_location: nameById.get(m.to_location_id ?? "") ?? "",
		to_pin_code: m.to_pin_code,
		weight_kg: m.weight_kg,
		quantity: m.quantity
	}));
	async function openNew() {
		const id = await requireTripId();
		if (!id) return;
		setEditing(emptyManifest(id));
	}
	async function save(e) {
		e.preventDefault();
		if (!editing) return;
		setSaving(true);
		const { id, ...rest } = editing;
		const res = id ? await supabase.from("trip_manifests").update(rest).eq("id", id) : await supabase.from("trip_manifests").insert(rest);
		setSaving(false);
		if (res.error) return toast.error(res.error.message);
		toast.success(id ? "Manifest updated" : "Manifest added");
		setEditing(null);
		reload(rest.trip_id);
	}
	async function remove(id) {
		const { error } = await supabase.from("trip_manifests").delete().eq("id", id);
		if (error) return toast.error(error.message);
		if (tripId) reload(tripId);
	}
	async function onImport(rows) {
		const id = await requireTripId();
		if (!id) return {
			inserted: 0,
			failed: rows.length
		};
		const payload = rows.map((r) => ({
			trip_id: id,
			manifest_number: r.manifest_number ?? "",
			from_location_id: idByName.get((r.from_location ?? "").toLowerCase()) ?? idByPin.get((r.from_pin_code ?? "").trim()) ?? null,
			from_pin_code: r.from_pin_code ?? "",
			to_location_id: idByName.get((r.to_location ?? "").toLowerCase()) ?? idByPin.get((r.to_pin_code ?? "").trim()) ?? null,
			to_pin_code: r.to_pin_code ?? "",
			weight_kg: r.weight_kg ?? "",
			quantity: r.quantity ?? ""
		}));
		const { error } = await supabase.from("trip_manifests").insert(payload);
		if (error) {
			toast.error(error.message);
			return {
				inserted: 0,
				failed: rows.length
			};
		}
		reload(id);
		return {
			inserted: payload.length,
			failed: 0
		};
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "button",
					size: "sm",
					onClick: openNew,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Create manifest"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ml-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CsvIO, {
						entityLabel: "Manifests",
						filename: "manifests",
						columns: csvColumns,
						rows: csvRows,
						onImport
					})
				})]
			}),
			manifests.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground",
				children: "No manifests yet. Freight, loading and fixed charges are calculated from the selected contract once you add manifest lines."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[860px] text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Manifest"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "From"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "To"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3 text-right",
								children: "Weight"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3 text-right",
								children: "Qty"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3 text-right",
								children: "Freight"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3 text-right",
								children: "Loading"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3 text-right",
								children: "Fixed"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3 text-right",
								children: "Line total"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "py-2" })
						]
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [lines.map((l) => {
						const lineTotal = l.freight + l.loading + l.fixed;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border/60",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 font-medium",
									children: l.m.manifest_number || "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3",
									children: nameById.get(l.m.from_location_id ?? "") ?? (l.m.from_pin_code || "—")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3",
									children: nameById.get(l.m.to_location_id ?? "") ?? (l.m.to_pin_code || "—")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-right",
									children: l.m.weight_kg || "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-right",
									children: l.m.quantity || "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-right",
									children: inr(l.freight)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-right",
									children: inr(l.loading)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-right",
									children: inr(l.fixed)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-right font-semibold",
									children: inr(lineTotal)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "py-2 text-right",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										variant: "ghost",
										size: "sm",
										onClick: () => setEditing(l.m),
										children: "Edit"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										variant: "ghost",
										size: "sm",
										onClick: () => l.m.id && remove(l.m.id),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
									})]
								})
							]
						}, l.m.id);
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							colSpan: 8,
							className: "py-3 text-right font-semibold",
							children: "Total manifest income"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "py-3 pr-3 text-right font-semibold",
							children: inr(total)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {})
					] })] })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editing !== null,
				onOpenChange: (v) => !v && setEditing(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-h-[85vh] max-w-2xl overflow-y-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: editing?.id ? "Edit manifest" : "New manifest" }) }), editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: save,
						className: "grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5 sm:col-span-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs font-medium text-muted-foreground",
									children: "Manifest Number"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "h-10",
									value: editing.manifest_number,
									onChange: (e) => setEditing({
										...editing,
										manifest_number: e.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocationPinPair, {
								label: "From",
								locationId: editing.from_location_id,
								pinCode: editing.from_pin_code,
								onChange: (n) => setEditing({
									...editing,
									from_location_id: n.location_id,
									from_pin_code: n.pin_code
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocationPinPair, {
								label: "To",
								locationId: editing.to_location_id,
								pinCode: editing.to_pin_code,
								onChange: (n) => setEditing({
									...editing,
									to_location_id: n.location_id,
									to_pin_code: n.pin_code
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Weight (kg)",
								type: "number",
								value: editing.weight_kg,
								onChange: (v) => setEditing({
									...editing,
									weight_kg: v
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
								label: "Quantity (units)",
								type: "number",
								value: editing.quantity,
								onChange: (v) => setEditing({
									...editing,
									quantity: v
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
								className: "sm:col-span-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "outline",
									onClick: () => setEditing(null),
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "submit",
									disabled: saving,
									children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : null, "Save manifest"]
								})]
							})
						]
					}) : null]
				})
			})
		]
	});
}
function LineTab({ title, nameLabel, rows, setRows, total, onSave }) {
	const update = (i, p) => setRows(rows.map((r, idx) => idx === i ? {
		...r,
		...p
	} : r));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-sm font-semibold tracking-tight",
						children: title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						size: "sm",
						variant: "outline",
						className: "ml-auto",
						onClick: () => setRows([...rows, {
							name: "",
							amount: "",
							note: ""
						}]),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Add field"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						size: "sm",
						onClick: onSave,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "size-4" }), "Save"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: rows.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 items-end gap-3 rounded-xl bg-muted/50 p-3 sm:grid-cols-[1.2fr_0.8fr_1.4fr_auto]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs font-medium text-muted-foreground",
								children: nameLabel
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "h-10",
								value: r.name,
								onChange: (e) => update(i, { name: e.target.value })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs font-medium text-muted-foreground",
								children: "Amount (₹)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "h-10",
								type: "number",
								value: r.amount,
								onChange: (e) => update(i, { amount: e.target.value })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs font-medium text-muted-foreground",
								children: "Note"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								className: "h-10",
								value: r.note,
								onChange: (e) => update(i, { note: e.target.value })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "ghost",
							size: "sm",
							onClick: () => setRows(rows.filter((_, idx) => idx !== i)),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
						})
					]
				}, i))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-end border-t border-border pt-3 text-sm font-semibold",
				children: ["Total: ", inr(total)]
			})
		]
	});
}
function Details({ record, sections, empty }) {
	if (!record) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: empty
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-5",
		children: sections.map((s) => {
			const filled = s.fields.filter((f) => String(record[f.key] ?? "").trim() !== "");
			if (filled.length === 0) return null;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
				className: "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground",
				children: s.title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
				className: "mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2",
				children: filled.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex justify-between gap-4 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
						className: "text-muted-foreground",
						children: f.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
						className: "text-right font-medium",
						children: String(record[f.key])
					})]
				}, f.key))
			})] }, s.title);
		})
	});
}
function ContractDetails({ contract, entryCount, monthlyCharges }) {
	if (!contract) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-muted-foreground",
		children: "No contract selected."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dl", {
		className: "grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2",
		children: [
			["Contract name", contract.contract_name],
			["Company", String(contract.company_name ?? "")],
			["GSTIN", String(contract.gstin ?? "")],
			["Freight basis", contract.freight_basis],
			["Loading basis", contract.loading_basis],
			["Rate entries (routes)", String(entryCount)]
		].filter(([, v]) => v.trim() !== "").map(([k, v]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex justify-between gap-4 text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
				className: "text-muted-foreground",
				children: k
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
				className: "text-right font-medium",
				children: v
			})]
		}, k))
	});
}
function Summary({ manifestTotal, otherIncomeTotal, expenseTotal, totalWeight, payload, deadWeight, manifestCount, distance }) {
	const income = manifestTotal + otherIncomeTotal;
	const net = income - expenseTotal;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "grid grid-cols-2 gap-3 sm:grid-cols-3",
		children: [
			{
				label: "Manifests",
				value: String(manifestCount)
			},
			{
				label: "Manifest income",
				value: inr(manifestTotal)
			},
			{
				label: "Other income",
				value: inr(otherIncomeTotal)
			},
			{
				label: "Total income",
				value: inr(income),
				strong: true
			},
			{
				label: "Total expense",
				value: inr(expenseTotal)
			},
			{
				label: "Net income",
				value: inr(net),
				strong: true
			},
			{
				label: "Total weight",
				value: `${totalWeight.toLocaleString("en-IN")} kg`
			},
			{
				label: "Vehicle payload",
				value: payload > 0 ? `${payload.toLocaleString("en-IN")} kg` : "—"
			},
			{
				label: "Dead weight",
				value: deadWeight === null ? "—" : `${deadWeight.toLocaleString("en-IN")} kg`
			},
			{
				label: "Distance",
				value: distance === null ? "—" : `${distance.toLocaleString("en-IN")} km`
			}
		].map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-xl bg-muted/60 p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] uppercase tracking-[0.14em] text-muted-foreground",
				children: c.label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: `mt-1 ${c.strong ? "text-lg font-semibold" : "text-base font-medium"}`,
				children: c.value
			})]
		}, c.label))
	});
}
//#endregion
//#region src/components/operations/Trips.tsx
function Trips() {
	const [trips, setTrips] = (0, import_react.useState)([]);
	const [closed, setClosed] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [closingId, setClosingId] = (0, import_react.useState)(null);
	const [reopeningId, setReopeningId] = (0, import_react.useState)(null);
	async function load() {
		setLoading(true);
		try {
			const [live, archived] = await Promise.all([fetchAll(() => supabase.from("trips").select("*").order("created_at", { ascending: false })), fetchAll(() => supabase.from("closed_trips").select("id,trip_code,branch_name,start_date,end_date,net_income,closed_at").order("closed_at", { ascending: false }))]);
			setTrips(live);
			setClosed(archived);
		} catch {
			toast.error("Could not load trips");
		}
		setLoading(false);
	}
	(0, import_react.useEffect)(() => {
		load();
	}, []);
	async function remove(id) {
		const { error } = await supabase.from("trips").delete().eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Trip removed");
		load();
	}
	async function close(id) {
		if (!window.confirm("Close this trip? A full snapshot is archived and the live trip is removed. This cannot be undone.")) return;
		setClosingId(id);
		try {
			await closeTrip(id);
			toast.success("Trip closed and archived");
			load();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not close trip");
		} finally {
			setClosingId(null);
		}
	}
	async function reopen(id) {
		if (!window.confirm("Reopen this trip? It moves back to live trips and current contract rates apply. You can close it again later.")) return;
		setReopeningId(id);
		try {
			await reopenTrip(id);
			toast.success("Trip reopened with current rates");
			load();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Could not reopen trip");
		} finally {
			setReopeningId(null);
		}
	}
	if (editing) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TripForm, {
		initial: editing,
		onBack: () => {
			setEditing(null);
			load();
		},
		onSaved: load
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					onClick: () => setEditing(emptyTrip()),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "New trip"]
				})
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 w-full" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-16 w-full" })]
			}) : trips.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground",
				children: "No trips yet. Create a trip to record manifests, income and expenses."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2",
				children: trips.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "surface-card flex items-center gap-3 p-4 transition-colors hover:bg-muted/40",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Truck, { className: "size-4 text-primary" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "min-w-0 flex-1 text-left",
							onClick: () => setEditing(t),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-sm font-medium",
								children: t.trip_code
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-xs text-muted-foreground",
								children: [
									t.ownership === "own" ? "Own vehicle" : "Third party",
									t.start_date,
									t.start_time
								].filter(Boolean).join(" · ")
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => t.id && remove(t.id),
							"aria-label": "Delete trip",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							disabled: closingId === t.id,
							onClick: () => t.id && close(t.id),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "size-4" }), "Close"]
						})
					]
				}, t.id))
			}),
			closed.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "space-y-2 pt-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
						className: "flex items-center gap-2 text-sm font-semibold tracking-tight",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { className: "size-4 text-muted-foreground" }), "Closed trips"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "Archived snapshots. Later changes to masters, contracts or rates never affect these."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-2",
						children: closed.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
							className: "surface-card flex items-center gap-3 p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Archive, { className: "size-4 text-muted-foreground" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-sm font-medium",
										children: c.trip_code
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block text-xs text-muted-foreground",
										children: [
											c.branch_name,
											c.start_date,
											c.end_date
										].filter(Boolean).join(" · ") || "—"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold",
									children: inr(Number(c.net_income ?? 0))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "outline",
									size: "sm",
									disabled: reopeningId === c.id,
									onClick: () => reopen(c.id),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "size-4" }), "Reopen"]
								})
							]
						}, c.id))
					})
				]
			}) : null
		]
	});
}
//#endregion
//#region src/lib/finance.ts
var FINANCE_CONFIG = {
	income: {
		table: "incomes",
		nameCol: "income_name",
		statusCol: "is_received",
		statusDateCol: "received_date",
		title: "Income",
		single: "income",
		nameLabel: "Income name",
		doneLabel: "Received",
		pendingLabel: "Not received",
		actionLabel: "Mark received",
		filename: "income"
	},
	expenditure: {
		table: "expenditures",
		nameCol: "expenditure_name",
		statusCol: "is_paid",
		statusDateCol: "paid_date",
		title: "Expenditure",
		single: "expenditure",
		nameLabel: "Expenditure name",
		doneLabel: "Paid",
		pendingLabel: "Unpaid",
		actionLabel: "Mark paid",
		filename: "expenditure"
	}
};
var MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December"
];
function emptyFinanceRow() {
	return {
		name: "",
		amount: "",
		note: "",
		entry_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
		branch_id: null,
		vehicle_id: null,
		driver_id: null,
		transporter_id: null,
		settled: false,
		settled_date: ""
	};
}
function yearOf(date) {
	return (date || "").slice(0, 4);
}
function monthOf(date) {
	return (date || "").slice(5, 7);
}
//#endregion
//#region src/components/operations/FinanceList.tsx
var CSV_COLUMNS = [
	"entry_date",
	"name",
	"amount",
	"note",
	"branch",
	"vehicle",
	"driver",
	"transporter",
	"status",
	"status_date"
];
function FinanceList({ kind }) {
	const cfg = FINANCE_CONFIG[kind];
	const branches = useBranches();
	const [rows, setRows] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [vehicles, setVehicles] = (0, import_react.useState)([]);
	const [drivers, setDrivers] = (0, import_react.useState)([]);
	const [transporters, setTransporters] = (0, import_react.useState)([]);
	const [year, setYear] = (0, import_react.useState)("all");
	const [month, setMonth] = (0, import_react.useState)("all");
	const [status, setStatus] = (0, import_react.useState)("all");
	async function load() {
		setLoading(true);
		try {
			setRows((await fetchAll(() => supabase.from(cfg.table).select("*").order("entry_date", { ascending: false }))).map((r) => ({
				id: r.id,
				name: String(r[cfg.nameCol] ?? ""),
				amount: String(r.amount ?? ""),
				note: String(r.note ?? ""),
				entry_date: String(r.entry_date ?? ""),
				branch_id: r.branch_id ?? null,
				vehicle_id: r.vehicle_id ?? null,
				driver_id: r.driver_id ?? null,
				transporter_id: r.transporter_id ?? null,
				settled: Boolean(r[cfg.statusCol]),
				settled_date: String(r[cfg.statusDateCol] ?? "")
			})));
		} catch {
			toast.error(`Could not load ${cfg.title.toLowerCase()}`);
		}
		setLoading(false);
	}
	async function loadMasters() {
		const [v, d, t] = await Promise.all([
			fetchAll(() => supabase.from("vehicles").select("*").order("registration_number")),
			fetchAll(() => supabase.from("drivers").select("*").order("full_name")),
			fetchAll(() => supabase.from("transporters").select("*").order("transporter_name"))
		]);
		setVehicles(v);
		setDrivers(d);
		setTransporters(t);
	}
	(0, import_react.useEffect)(() => {
		load();
		loadMasters();
	}, [kind]);
	const branchOpts = branches.map((b) => ({
		id: b.id,
		label: b.branch_name,
		sub: b.branch_type ?? void 0
	}));
	const vehicleOpts = vehicles.map((v) => ({
		id: v.id,
		label: String(v.registration_number ?? "")
	}));
	const driverOpts = drivers.map((d) => ({
		id: d.id,
		label: String(d.full_name ?? "")
	}));
	const transporterOpts = transporters.map((t) => ({
		id: t.id,
		label: String(t.transporter_name ?? "")
	}));
	const nameOf = (opts, id) => (id ? opts.find((o) => o.id === id)?.label : "") ?? "";
	const years = (0, import_react.useMemo)(() => {
		const set = new Set(rows.map((r) => yearOf(r.entry_date)).filter(Boolean));
		set.add(String((/* @__PURE__ */ new Date()).getFullYear()));
		return Array.from(set).sort().reverse();
	}, [rows]);
	const filtered = rows.filter((r) => {
		if (year !== "all" && yearOf(r.entry_date) !== year) return false;
		if (month !== "all" && monthOf(r.entry_date) !== month) return false;
		if (status === "done" && !r.settled) return false;
		if (status === "pending" && r.settled) return false;
		return true;
	});
	const total = filtered.reduce((s, r) => s + num(r.amount), 0);
	const pendingTotal = filtered.filter((r) => !r.settled).reduce((s, r) => s + num(r.amount), 0);
	async function save(e) {
		e.preventDefault();
		if (!editing) return;
		if (!editing.name.trim()) return toast.error(`${cfg.nameLabel} is required`);
		if (!editing.branch_id) return toast.error("Branch is required");
		setSaving(true);
		const payload = {
			[cfg.nameCol]: editing.name,
			amount: editing.amount,
			note: editing.note,
			entry_date: editing.entry_date,
			branch_id: editing.branch_id,
			vehicle_id: editing.vehicle_id,
			driver_id: editing.driver_id,
			transporter_id: editing.transporter_id,
			[cfg.statusCol]: editing.settled,
			[cfg.statusDateCol]: editing.settled_date
		};
		const res = editing.id ? await supabase.from(cfg.table).update(payload).eq("id", editing.id) : await supabase.from(cfg.table).insert(payload);
		setSaving(false);
		if (res.error) return toast.error(res.error.message);
		toast.success("Saved");
		setEditing(null);
		load();
	}
	async function settle(row) {
		const { error } = await supabase.from(cfg.table).update({
			[cfg.statusCol]: true,
			[cfg.statusDateCol]: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
		}).eq("id", row.id);
		if (error) return toast.error(error.message);
		toast.success(cfg.doneLabel);
		load();
	}
	async function remove(id) {
		const { error } = await supabase.from(cfg.table).delete().eq("id", id);
		if (error) return toast.error(error.message);
		load();
	}
	const csvRows = filtered.map((r) => ({
		entry_date: r.entry_date,
		name: r.name,
		amount: r.amount,
		note: r.note,
		branch: nameOf(branchOpts, r.branch_id),
		vehicle: nameOf(vehicleOpts, r.vehicle_id),
		driver: nameOf(driverOpts, r.driver_id),
		transporter: nameOf(transporterOpts, r.transporter_id),
		status: r.settled ? cfg.doneLabel : cfg.pendingLabel,
		status_date: r.settled_date
	}));
	async function onImport(imported) {
		const idBy = (opts, label) => opts.find((o) => o.label.trim().toLowerCase() === label.trim().toLowerCase())?.id ?? null;
		const payload = imported.filter((r) => (r.name || "").trim() !== "").map((r) => {
			const done = /^(yes|true|paid|received|1)$/i.test((r.status || "").trim());
			return {
				[cfg.nameCol]: r.name,
				amount: r.amount ?? "",
				note: r.note ?? "",
				entry_date: r.entry_date ?? "",
				branch_id: idBy(branchOpts, r.branch ?? ""),
				vehicle_id: idBy(vehicleOpts, r.vehicle ?? ""),
				driver_id: idBy(driverOpts, r.driver ?? ""),
				transporter_id: idBy(transporterOpts, r.transporter ?? ""),
				[cfg.statusCol]: done,
				[cfg.statusDateCol]: r.status_date ?? ""
			};
		});
		if (payload.length === 0) return {
			inserted: 0,
			failed: imported.length
		};
		const { error } = await supabase.from(cfg.table).insert(payload);
		if (error) {
			toast.error(error.message);
			return {
				inserted: 0,
				failed: payload.length
			};
		}
		await load();
		return {
			inserted: payload.length,
			failed: imported.length - payload.length
		};
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					onClick: () => setEditing(emptyFinanceRow()),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }),
						"New ",
						cfg.single
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ml-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CsvIO, {
						entityLabel: cfg.title,
						filename: cfg.filename,
						columns: CSV_COLUMNS,
						rows: csvRows,
						onImport
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: year,
						onValueChange: setYear,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "h-9 w-32",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Year" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "all",
							children: "All years"
						}), years.map((y) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: y,
							children: y
						}, y))] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: month,
						onValueChange: setMonth,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "h-9 w-36",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Month" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "all",
							children: "All months"
						}), MONTHS.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: String(i + 1).padStart(2, "0"),
							children: m
						}, m))] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: status,
						onValueChange: (v) => setStatus(v),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "h-9 w-40",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "All statuses"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "done",
								children: cfg.doneLabel
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "pending",
								children: cfg.pendingLabel
							})
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-auto text-sm text-muted-foreground",
						children: [
							"Total ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-foreground",
								children: inr(total)
							}),
							" ·",
							" ",
							cfg.pendingLabel.toLowerCase(),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-semibold text-foreground",
								children: inr(pendingTotal)
							})
						]
					})
				]
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-14 w-full" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-14 w-full" })]
			}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "rounded-xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground",
				children: [
					"No ",
					cfg.title.toLowerCase(),
					" records for this filter."
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "overflow-x-auto",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full min-w-[860px] text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Date"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: cfg.nameLabel
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Branch"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Linked to"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3 text-right",
								children: "Amount"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "py-2 pr-3",
								children: "Status"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "py-2" })
						]
					}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: filtered.map((r) => {
						const linked = nameOf(vehicleOpts, r.vehicle_id) || nameOf(driverOpts, r.driver_id) || nameOf(transporterOpts, r.transporter_id) || "—";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
							className: "border-b border-border/60",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3",
									children: r.entry_date || "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 font-medium",
									children: r.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3",
									children: nameOf(branchOpts, r.branch_id) || "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3",
									children: linked
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3 text-right",
									children: inr(num(r.amount))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "py-2 pr-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: r.settled ? "rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary" : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground",
										children: r.settled ? cfg.doneLabel : cfg.pendingLabel
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									className: "py-2 text-right whitespace-nowrap",
									children: [
										!r.settled ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											variant: "outline",
											size: "sm",
											onClick: () => settle(r),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "size-4" }), cfg.actionLabel]
										}) : null,
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "sm",
											onClick: () => setEditing(r),
											children: "Edit"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "sm",
											onClick: () => r.id && remove(r.id),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" })
										})
									]
								})
							]
						}, r.id);
					}) })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: editing !== null,
				onOpenChange: (v) => !v && setEditing(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "max-h-[85vh] max-w-2xl overflow-y-auto",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: editing?.id ? `Edit ${cfg.single}` : `New ${cfg.single}` }) }), editing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: save,
						className: "grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs font-medium text-muted-foreground",
									children: cfg.nameLabel
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "h-10",
									value: editing.name,
									onChange: (e) => setEditing({
										...editing,
										name: e.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs font-medium text-muted-foreground",
									children: "Amount (₹)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "h-10",
									type: "number",
									value: editing.amount,
									onChange: (e) => setEditing({
										...editing,
										amount: e.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs font-medium text-muted-foreground",
									children: "Date"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "h-10",
									type: "date",
									value: editing.entry_date,
									onChange: (e) => setEditing({
										...editing,
										entry_date: e.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntityPicker, {
								label: "Branch (required)",
								value: editing.branch_id,
								options: branchOpts,
								onChange: (id) => setEditing({
									...editing,
									branch_id: id
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted-foreground sm:col-span-2",
								children: [
									"Optionally link this ",
									cfg.single,
									" to one vehicle, driver or transporter."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntityPicker, {
								label: "Vehicle",
								value: editing.vehicle_id,
								options: vehicleOpts,
								onChange: (id) => setEditing({
									...editing,
									vehicle_id: id,
									driver_id: null,
									transporter_id: null
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntityPicker, {
								label: "Driver",
								value: editing.driver_id,
								options: driverOpts,
								onChange: (id) => setEditing({
									...editing,
									driver_id: id,
									vehicle_id: null,
									transporter_id: null
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EntityPicker, {
								label: "Transporter",
								value: editing.transporter_id,
								options: transporterOpts,
								onChange: (id) => setEditing({
									...editing,
									transporter_id: id,
									vehicle_id: null,
									driver_id: null
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5 sm:col-span-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs font-medium text-muted-foreground",
									children: "Note"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "h-10",
									value: editing.note,
									onChange: (e) => setEditing({
										...editing,
										note: e.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									className: "text-xs font-medium text-muted-foreground",
									children: "Status"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: editing.settled ? "done" : "pending",
									onValueChange: (v) => setEditing({
										...editing,
										settled: v === "done",
										settled_date: v === "done" ? editing.settled_date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) : ""
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
										className: "h-10",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "pending",
										children: cfg.pendingLabel
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "done",
										children: cfg.doneLabel
									})] })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
									className: "text-xs font-medium text-muted-foreground",
									children: [cfg.doneLabel, " on"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									className: "h-10",
									type: "date",
									value: editing.settled_date,
									onChange: (e) => setEditing({
										...editing,
										settled_date: e.target.value
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
								className: "sm:col-span-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "outline",
									onClick: () => setEditing(null),
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "submit",
									disabled: saving,
									children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "size-4 animate-spin" }) : null, "Save"]
								})]
							})
						]
					}) : null]
				})
			})
		]
	});
}
//#endregion
//#region src/routes/operations.tsx?tsr-split=component
var TABS = [
	{
		id: "trip",
		label: "Trip",
		desc: "Manifests, income & expenses",
		icon: Route
	},
	{
		id: "income",
		label: "Income",
		desc: "Other income, branch-wise",
		icon: TrendingUp
	},
	{
		id: "expenditure",
		label: "Expenditure",
		desc: "Other spend, branch-wise",
		icon: TrendingDown
	}
];
function OperationsPage() {
	const [tab, setTab] = (0, import_react.useState)("trip");
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
					children: "Operations"
				})
			]
		}),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-8 lg:grid-cols-[240px_1fr]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "lg:sticky lg:top-24 lg:self-start",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
					children: "Operations"
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
					tab === "trip" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trips, {}) : null,
					tab === "income" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinanceList, { kind: "income" }) : null,
					tab === "expenditure" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FinanceList, { kind: "expenditure" }) : null
				]
			}, tab)]
		})
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RequireAuth, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OperationsPage, {}) });
//#endregion
export { SplitComponent as component };

import { t as supabase } from "./client-B1QWR90o.js";
import { n as cn, t as Button } from "./button-BpE9Czok.js";
import { n as Input, t as Label } from "./label-CwWTNQoo.js";
import { a as SelectTrigger, i as SelectItem, n as Select, o as SelectValue, r as SelectContent } from "./CsvIO-CP89IxcQ.js";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Building2, Check, ChevronsUpDown, Loader2, MapPin, Plus, Search, Truck, User, X } from "lucide-react";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
//#region src/components/ui/dialog.tsx
var Dialog = DialogPrimitive.Root;
var DialogPortal = DialogPrimitive.Portal;
var DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DialogPrimitive.Overlay, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
var DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [/* @__PURE__ */ jsx(DialogOverlay, {}), /* @__PURE__ */ jsxs(DialogPrimitive.Content, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, /* @__PURE__ */ jsxs(DialogPrimitive.Close, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ jsx(X, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("span", {
			className: "sr-only",
			children: "Close"
		})]
	})]
})] }));
DialogContent.displayName = DialogPrimitive.Content.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
});
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
DialogFooter.displayName = "DialogFooter";
var DialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DialogPrimitive.Title, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
var DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(DialogPrimitive.Description, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
//#endregion
//#region src/components/ui/command.tsx
var Command$1 = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(Command, {
	ref,
	className: cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className),
	...props
}));
Command$1.displayName = Command.displayName;
var CommandInput = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxs("div", {
	className: "flex items-center border-b px-3",
	"cmdk-input-wrapper": "",
	children: [/* @__PURE__ */ jsx(Search, { className: "mr-2 h-4 w-4 shrink-0 opacity-50" }), /* @__PURE__ */ jsx(Command.Input, {
		ref,
		className: cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className),
		...props
	})]
}));
CommandInput.displayName = Command.Input.displayName;
var CommandList = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(Command.List, {
	ref,
	className: cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className),
	...props
}));
CommandList.displayName = Command.List.displayName;
var CommandEmpty = React.forwardRef((props, ref) => /* @__PURE__ */ jsx(Command.Empty, {
	ref,
	className: "py-6 text-center text-sm",
	...props
}));
CommandEmpty.displayName = Command.Empty.displayName;
var CommandGroup = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(Command.Group, {
	ref,
	className: cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className),
	...props
}));
CommandGroup.displayName = Command.Group.displayName;
var CommandSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(Command.Separator, {
	ref,
	className: cn("-mx-1 h-px bg-border", className),
	...props
}));
CommandSeparator.displayName = Command.Separator.displayName;
var CommandItem = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(Command.Item, {
	ref,
	className: cn("relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className),
	...props
}));
CommandItem.displayName = Command.Item.displayName;
var CommandShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ jsx("span", {
		className: cn("ml-auto text-xs tracking-widest text-muted-foreground", className),
		...props
	});
};
CommandShortcut.displayName = "CommandShortcut";
//#endregion
//#region src/components/ui/popover.tsx
var Popover = PopoverPrimitive.Root;
var PopoverTrigger = PopoverPrimitive.Trigger;
var PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx(PopoverPrimitive.Content, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)", className),
	...props
}) }));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
//#endregion
//#region src/lib/fetch-all.ts
async function fetchAll(buildQuery, pageSize = 1e3) {
	const out = [];
	let from = 0;
	const HARD_CAP = 5e5;
	while (from < HARD_CAP) {
		const to = from + pageSize - 1;
		const res = await buildQuery().range(from, to);
		if (res.error) throw new Error(res.error.message);
		const batch = res.data ?? [];
		out.push(...batch);
		if (batch.length < pageSize) break;
		from += pageSize;
	}
	return out;
}
//#endregion
//#region src/lib/use-branches.ts
function useBranches() {
	const [branches, setBranches] = useState([]);
	useEffect(() => {
		(async () => {
			setBranches(await fetchAll(() => supabase.from("branches").select("id,branch_name,branch_type").order("branch_name", { ascending: true })));
		})();
	}, []);
	return branches;
}
function branchName(branches, id) {
	if (!id) return "";
	return branches.find((b) => b.id === id)?.branch_name ?? "";
}
//#endregion
//#region src/lib/contract-ranges.ts
function rangeLabel(r, unit) {
	const from = (r.from || "0").trim();
	const to = (r.to || "").trim();
	return to ? `${from}-${to} ${unit}` : `${from}+ ${unit}`;
}
function rangeKey(r) {
	const from = (r.from || "0").trim();
	const to = (r.to || "").trim();
	return to ? `${from}-${to}` : `${from}+`;
}
function basisRanges(contract, basis) {
	return basis === "weight" ? contract.weight_ranges : contract.quantity_ranges;
}
function basisUnit(basis) {
	return basis === "weight" ? "kg" : "qty";
}
//#endregion
//#region src/components/LocationPicker.tsx
var EMPTY_LOC = {
	location_name: "",
	location_type: "",
	city: "",
	district: "",
	state: "",
	country: "",
	pin_code: ""
};
function LocationPicker({ label, value, onChange, onPinCode }) {
	const [locations, setLocations] = useState([]);
	const [open, setOpen] = useState(false);
	const [showDialog, setShowDialog] = useState(false);
	const [form, setForm] = useState({ ...EMPTY_LOC });
	const [saving, setSaving] = useState(false);
	async function load() {
		const { data } = await supabase.from("locations").select("id,location_name,location_type,city,state,pin_code").order("location_name", { ascending: true });
		setLocations(data ?? []);
	}
	useEffect(() => {
		load();
	}, []);
	const selected = locations.find((l) => l.id === value);
	async function saveNew(e) {
		e.preventDefault();
		if (!form.location_name.trim()) return;
		setSaving(true);
		const { data, error } = await supabase.from("locations").insert(form).select("id,location_name,location_type,city,state,pin_code").single();
		setSaving(false);
		if (error || !data) return toast.error(error?.message ?? "Failed to save");
		toast.success("Location created");
		const loc = data;
		setLocations((prev) => [...prev, loc].sort((a, b) => a.location_name.localeCompare(b.location_name)));
		onChange(loc.id, loc);
		if (onPinCode && loc.pin_code) onPinCode(loc.pin_code);
		setShowDialog(false);
		setForm({ ...EMPTY_LOC });
	}
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ jsx(Label, {
			className: "text-xs font-medium text-muted-foreground",
			children: label
		}), /* @__PURE__ */ jsxs(Popover, {
			open,
			onOpenChange: setOpen,
			children: [/* @__PURE__ */ jsx(PopoverTrigger, {
				asChild: true,
				children: /* @__PURE__ */ jsxs(Button, {
					type: "button",
					variant: "outline",
					role: "combobox",
					className: "h-10 w-full justify-between font-normal",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "flex min-w-0 items-center gap-2 truncate",
						children: [/* @__PURE__ */ jsx(Search, { className: "size-4 shrink-0 text-muted-foreground" }), selected ? /* @__PURE__ */ jsx("span", {
							className: "truncate",
							children: selected.location_name
						}) : /* @__PURE__ */ jsx("span", {
							className: "text-muted-foreground",
							children: "Select location"
						})]
					}), /* @__PURE__ */ jsx(ChevronsUpDown, { className: "ml-2 size-4 shrink-0 opacity-50" })]
				})
			}), /* @__PURE__ */ jsx(PopoverContent, {
				className: "w-[--radix-popover-trigger-width] p-0",
				align: "start",
				children: /* @__PURE__ */ jsxs(Command$1, { children: [/* @__PURE__ */ jsx(CommandInput, { placeholder: "Search locations…" }), /* @__PURE__ */ jsxs(CommandList, { children: [/* @__PURE__ */ jsx(CommandEmpty, { children: "No locations found." }), /* @__PURE__ */ jsxs(CommandGroup, { children: [/* @__PURE__ */ jsxs(CommandItem, {
					value: "__add_new__",
					onSelect: () => {
						setOpen(false);
						setShowDialog(true);
					},
					children: [/* @__PURE__ */ jsx(Plus, { className: "size-4" }), /* @__PURE__ */ jsx("span", { children: "Add new location" })]
				}), locations.map((l) => /* @__PURE__ */ jsxs(CommandItem, {
					value: `${l.location_name} ${l.city ?? ""} ${l.pin_code ?? ""}`,
					onSelect: () => {
						onChange(l.id, l);
						if (onPinCode) onPinCode(l.pin_code ?? "");
						setOpen(false);
					},
					children: [
						/* @__PURE__ */ jsx(Check, { className: cn("size-4", value === l.id ? "opacity-100" : "opacity-0") }),
						/* @__PURE__ */ jsx("span", {
							className: "truncate",
							children: l.location_name
						}),
						l.city ? /* @__PURE__ */ jsx("span", {
							className: "ml-auto text-xs text-muted-foreground",
							children: l.city
						}) : null
					]
				}, l.id))] })] })] })
			})]
		})]
	}), /* @__PURE__ */ jsx(Dialog, {
		open: showDialog,
		onOpenChange: setShowDialog,
		children: /* @__PURE__ */ jsxs(DialogContent, {
			className: "max-w-lg",
			children: [/* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Add new location" }) }), /* @__PURE__ */ jsxs("form", {
				onSubmit: saveNew,
				className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
				children: [
					/* @__PURE__ */ jsx(FieldInput, {
						label: "Location Name",
						required: true,
						full: true,
						value: form.location_name,
						onChange: (v) => setForm({
							...form,
							location_name: v
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ jsx(Label, {
							className: "text-xs font-medium text-muted-foreground",
							children: "Type"
						}), /* @__PURE__ */ jsxs(Select, {
							value: form.location_type || void 0,
							onValueChange: (v) => setForm({
								...form,
								location_type: v
							}),
							children: [/* @__PURE__ */ jsx(SelectTrigger, {
								className: "h-10",
								children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Select" })
							}), /* @__PURE__ */ jsxs(SelectContent, { children: [/* @__PURE__ */ jsx(SelectItem, {
								value: "Domestic",
								children: "Domestic"
							}), /* @__PURE__ */ jsx(SelectItem, {
								value: "International",
								children: "International"
							})] })]
						})]
					}),
					/* @__PURE__ */ jsx(FieldInput, {
						label: "City",
						value: form.city,
						onChange: (v) => setForm({
							...form,
							city: v
						})
					}),
					/* @__PURE__ */ jsx(FieldInput, {
						label: "District",
						value: form.district,
						onChange: (v) => setForm({
							...form,
							district: v
						})
					}),
					/* @__PURE__ */ jsx(FieldInput, {
						label: "State",
						value: form.state,
						onChange: (v) => setForm({
							...form,
							state: v
						})
					}),
					/* @__PURE__ */ jsx(FieldInput, {
						label: "Country",
						value: form.country,
						onChange: (v) => setForm({
							...form,
							country: v
						})
					}),
					/* @__PURE__ */ jsx(FieldInput, {
						label: "PIN Code",
						value: form.pin_code,
						onChange: (v) => setForm({
							...form,
							pin_code: v
						})
					}),
					/* @__PURE__ */ jsxs(DialogFooter, {
						className: "sm:col-span-2",
						children: [/* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "outline",
							onClick: () => setShowDialog(false),
							children: "Cancel"
						}), /* @__PURE__ */ jsxs(Button, {
							type: "submit",
							disabled: saving,
							children: [saving ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : null, "Save location"]
						})]
					})
				]
			})]
		})
	})] });
}
function FieldInput({ label, value, onChange, required, full }) {
	return /* @__PURE__ */ jsxs("div", {
		className: `space-y-1.5 ${full ? "sm:col-span-2" : ""}`,
		children: [/* @__PURE__ */ jsxs(Label, {
			className: "text-xs font-medium text-muted-foreground",
			children: [label, required ? /* @__PURE__ */ jsx("span", {
				className: "text-destructive",
				children: " *"
			}) : null]
		}), /* @__PURE__ */ jsx(Input, {
			value,
			required,
			onChange: (e) => onChange(e.target.value),
			className: "h-10"
		})]
	});
}
//#endregion
//#region src/lib/use-locations.ts
function useLocations() {
	const [locations, setLocations] = useState([]);
	const reload = useCallback(async () => {
		setLocations(await fetchAll(() => supabase.from("locations").select("id,location_name,location_type,city,state,pin_code").order("location_name", { ascending: true })));
	}, []);
	useEffect(() => {
		reload();
	}, [reload]);
	return {
		locations,
		reload
	};
}
function locationById(list, id) {
	if (!id) return void 0;
	return list.find((l) => l.id === id);
}
function locationByPin(list, pin) {
	const p = (pin || "").trim();
	if (!p) return void 0;
	return list.find((l) => (l.pin_code ?? "").trim() === p);
}
//#endregion
//#region src/components/LocationPinPair.tsx
/**
* Location + PIN code pair with two-way auto-fill:
* picking a location fills its PIN, typing a known PIN fills the location.
*/
function LocationPinPair({ label, locationId, pinCode, onChange }) {
	const { locations } = useLocations();
	function handleLocation(id, picked) {
		onChange({
			location_id: id,
			pin_code: (picked ?? locationById(locations, id))?.pin_code ?? (id ? pinCode : "")
		});
	}
	function handlePin(pin) {
		const match = locationByPin(locations, pin);
		if (match) onChange({
			location_id: match.id,
			pin_code: pin
		});
		else onChange({
			location_id: locationId ?? null,
			pin_code: pin
		});
	}
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(LocationPicker, {
		label: `${label} Location`,
		value: locationId,
		onChange: (id, loc) => handleLocation(id, loc)
	}), /* @__PURE__ */ jsxs("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ jsxs(Label, {
			className: "text-xs font-medium text-muted-foreground",
			children: [label, " PIN Code"]
		}), /* @__PURE__ */ jsx(Input, {
			className: "h-10",
			value: pinCode,
			placeholder: "PIN auto-fills the location",
			onChange: (e) => handlePin(e.target.value)
		})]
	})] });
}
//#endregion
//#region src/components/masters/configs.ts
var VEHICLE_CONFIG = {
	table: "vehicles",
	entityLabel: "Vehicles",
	singular: "vehicle",
	icon: Truck,
	hasBranch: true,
	titleKey: "registration_number",
	subtitleKeys: [
		"manufacturer",
		"model",
		"branch_name"
	],
	emptyMsg: "Registered vehicles in your fleet, linked to a controlling department.",
	sections: [
		{
			title: "Identification",
			fields: [
				{
					key: "registration_number",
					label: "Vehicle Number (Registration Number)",
					required: true
				},
				{
					key: "internal_code",
					label: "Internal Vehicle Code"
				},
				{
					key: "nickname",
					label: "Vehicle Name / Nickname",
					full: true
				}
			]
		},
		{
			title: "Specifications",
			fields: [
				{
					key: "manufacturer",
					label: "Manufacturer"
				},
				{
					key: "model",
					label: "Model"
				},
				{
					key: "year_of_manufacture",
					label: "Year of Manufacture",
					type: "number"
				},
				{
					key: "fuel_type",
					label: "Fuel Type",
					options: [
						"Diesel",
						"Petrol",
						"CNG",
						"LNG",
						"Electric"
					]
				},
				{
					key: "payload_capacity_kg",
					label: "Payload Capacity (kg)",
					type: "number"
				}
			]
		},
		{
			title: "Purchase",
			fields: [{
				key: "purchase_date",
				label: "Purchase Date",
				type: "date"
			}, {
				key: "purchase_cost",
				label: "Purchase Cost",
				type: "number"
			}]
		}
	]
};
var DRIVER_CONFIG = {
	table: "drivers",
	entityLabel: "Drivers",
	singular: "driver",
	icon: User,
	hasBranch: true,
	titleKey: "full_name",
	subtitleKeys: [
		"driver_code",
		"mobile_number",
		"branch_name"
	],
	emptyMsg: "Driving staff with licence, contact and payroll details.",
	sections: [
		{
			title: "Personal details",
			fields: [
				{
					key: "driver_code",
					label: "Driver Code",
					required: true
				},
				{
					key: "full_name",
					label: "Full Name",
					required: true
				},
				{
					key: "guardian_name",
					label: "Father's / Guardian's Name"
				},
				{
					key: "date_of_birth",
					label: "Date of Birth",
					type: "date"
				},
				{
					key: "gender",
					label: "Gender",
					options: [
						"Male",
						"Female",
						"Other"
					]
				},
				{
					key: "marital_status",
					label: "Marital Status",
					options: [
						"Single",
						"Married",
						"Divorced",
						"Widowed"
					]
				},
				{
					key: "blood_group",
					label: "Blood Group",
					options: [
						"A+",
						"A-",
						"B+",
						"B-",
						"AB+",
						"AB-",
						"O+",
						"O-"
					]
				}
			]
		},
		{
			title: "Contact",
			fields: [
				{
					key: "mobile_number",
					label: "Mobile Number",
					required: true
				},
				{
					key: "alternate_mobile",
					label: "Alternate Mobile"
				},
				{
					key: "email",
					label: "Email",
					type: "email"
				},
				{
					key: "emergency_contact_name",
					label: "Emergency Contact Name"
				},
				{
					key: "emergency_contact_number",
					label: "Emergency Contact Number"
				},
				{
					key: "emergency_contact_relationship",
					label: "Emergency Contact Relationship"
				}
			]
		},
		{
			title: "Permanent address",
			fields: [
				{
					key: "perm_address_line1",
					label: "Address Line 1",
					full: true
				},
				{
					key: "perm_address_line2",
					label: "Address Line 2",
					full: true
				},
				{
					key: "perm_city",
					label: "City"
				},
				{
					key: "perm_state",
					label: "State"
				},
				{
					key: "perm_country",
					label: "Country"
				},
				{
					key: "perm_pin_code",
					label: "PIN Code"
				}
			]
		},
		{
			title: "Current address",
			fields: [
				{
					key: "curr_same_as_perm",
					label: "Same as Permanent",
					options: ["Yes", "No"]
				},
				{
					key: "curr_address_line1",
					label: "Address Line 1",
					full: true
				},
				{
					key: "curr_address_line2",
					label: "Address Line 2",
					full: true
				},
				{
					key: "curr_city",
					label: "City"
				},
				{
					key: "curr_state",
					label: "State"
				},
				{
					key: "curr_country",
					label: "Country"
				},
				{
					key: "curr_pin_code",
					label: "PIN Code"
				}
			]
		},
		{
			title: "Driving licence",
			fields: [
				{
					key: "licence_number",
					label: "Driving Licence Number",
					required: true
				},
				{
					key: "licence_type",
					label: "Licence Type (LMV, HMV, etc.)"
				},
				{
					key: "licence_authority",
					label: "Issuing Authority (RTO)"
				},
				{
					key: "licence_issue_date",
					label: "Issue Date",
					type: "date"
				},
				{
					key: "licence_expiry_date",
					label: "Expiry Date",
					type: "date"
				}
			]
		},
		{
			title: "Salary",
			fields: [{
				key: "salary_type",
				label: "Salary Type",
				options: [
					"Monthly",
					"Per Trip",
					"Per KM",
					"Daily"
				]
			}, {
				key: "salary_amount",
				label: "Salary / Wage Amount",
				type: "number"
			}]
		},
		{
			title: "Bank details",
			fields: [
				{
					key: "bank_name",
					label: "Bank Name"
				},
				{
					key: "bank_branch",
					label: "Branch"
				},
				{
					key: "bank_account_holder",
					label: "Account Holder Name"
				},
				{
					key: "bank_account_number",
					label: "Account Number"
				},
				{
					key: "bank_ifsc",
					label: "IFSC Code"
				},
				{
					key: "upi_id",
					label: "UPI ID"
				}
			]
		},
		{
			title: "Identity",
			fields: [{
				key: "aadhaar_number",
				label: "Aadhaar Number"
			}, {
				key: "pan_number",
				label: "PAN Number"
			}]
		}
	]
};
var TRANSPORTER_CONFIG = {
	table: "transporters",
	entityLabel: "Transporters",
	singular: "transporter",
	icon: Building2,
	hasBranch: true,
	titleKey: "transporter_name",
	subtitleKeys: [
		"transporter_type",
		"city",
		"branch_name"
	],
	emptyMsg: "Fleet owners, brokers and transport companies you work with.",
	sections: [
		{
			title: "Business identity",
			fields: [
				{
					key: "transporter_name",
					label: "Transporter Name",
					required: true
				},
				{
					key: "legal_business_name",
					label: "Legal Business Name"
				},
				{
					key: "transporter_type",
					label: "Transporter Type",
					options: [
						"Fleet Owner",
						"Broker",
						"Transport Company",
						"Individual Owner"
					]
				}
			]
		},
		{
			title: "Tax registration",
			fields: [
				{
					key: "gstin",
					label: "GSTIN"
				},
				{
					key: "pan",
					label: "PAN"
				},
				{
					key: "msme_udyam",
					label: "MSME / Udyam Number (Optional)"
				},
				{
					key: "tan",
					label: "TAN (Optional)"
				}
			]
		},
		{
			title: "Address",
			fields: [
				{
					key: "address_line1",
					label: "Address Line 1",
					full: true
				},
				{
					key: "address_line2",
					label: "Address Line 2",
					full: true
				},
				{
					key: "city",
					label: "City"
				},
				{
					key: "state",
					label: "State"
				},
				{
					key: "country",
					label: "Country"
				},
				{
					key: "pin_code",
					label: "PIN Code"
				}
			]
		},
		{
			title: "Contact",
			fields: [
				{
					key: "primary_contact_name",
					label: "Primary Contact Person"
				},
				{
					key: "primary_contact_designation",
					label: "Designation"
				},
				{
					key: "mobile_number",
					label: "Mobile Number"
				},
				{
					key: "alternate_mobile",
					label: "Alternate Mobile"
				},
				{
					key: "email",
					label: "Email",
					type: "email"
				},
				{
					key: "telephone",
					label: "Telephone"
				},
				{
					key: "website",
					label: "Website (Optional)"
				}
			]
		},
		{
			title: "Bank details",
			fields: [
				{
					key: "bank_name",
					label: "Bank Name"
				},
				{
					key: "bank_branch",
					label: "Branch"
				},
				{
					key: "bank_account_holder",
					label: "Account Holder Name"
				},
				{
					key: "bank_account_number",
					label: "Account Number"
				},
				{
					key: "bank_ifsc",
					label: "IFSC Code"
				},
				{
					key: "upi_id",
					label: "UPI ID"
				}
			]
		}
	]
};
var LOCATION_CONFIG = {
	table: "locations",
	entityLabel: "Locations",
	singular: "location",
	icon: MapPin,
	hasBranch: false,
	titleKey: "location_name",
	subtitleKeys: [
		"location_type",
		"city",
		"state",
		"country"
	],
	emptyMsg: "Pickup, drop and hub locations used across operations.",
	sections: [{
		title: "Location",
		fields: [
			{
				key: "location_name",
				label: "Location Name",
				required: true
			},
			{
				key: "location_type",
				label: "Location Type",
				options: ["Domestic", "International"]
			},
			{
				key: "city",
				label: "City"
			},
			{
				key: "district",
				label: "District"
			},
			{
				key: "state",
				label: "State"
			},
			{
				key: "country",
				label: "Country"
			},
			{
				key: "pin_code",
				label: "PIN Code"
			}
		]
	}]
};
//#endregion
export { CommandList as C, DialogHeader as D, DialogFooter as E, DialogTitle as O, CommandItem as S, DialogContent as T, PopoverTrigger as _, LocationPinPair as a, CommandGroup as b, basisRanges as c, rangeLabel as d, branchName as f, PopoverContent as g, Popover as h, VEHICLE_CONFIG as i, basisUnit as l, fetchAll as m, LOCATION_CONFIG as n, useLocations as o, useBranches as p, TRANSPORTER_CONFIG as r, LocationPicker as s, DRIVER_CONFIG as t, rangeKey as u, Command$1 as v, Dialog as w, CommandInput as x, CommandEmpty as y };

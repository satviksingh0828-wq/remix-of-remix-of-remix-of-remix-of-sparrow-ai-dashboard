import { n as cn, t as Button } from "./button-BpE9Czok.js";
import * as React from "react";
import { useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronUp, Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import * as SelectPrimitive from "@radix-ui/react-select";
//#region src/components/ui/select.tsx
var Select = SelectPrimitive.Root;
var SelectValue = SelectPrimitive.Value;
var SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SelectPrimitive.Trigger, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ jsx(SelectPrimitive.Icon, {
		asChild: true,
		children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
var SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollUpButton, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ jsx(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;
var SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.ScrollDownButton, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;
var SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Portal, { children: /* @__PURE__ */ jsxs(SelectPrimitive.Content, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ jsx(SelectScrollUpButton, {}),
		/* @__PURE__ */ jsx(SelectPrimitive.Viewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ jsx(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectPrimitive.Content.displayName;
var SelectLabel = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Label, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
var SelectItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SelectPrimitive.Item, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ jsx("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ jsx(SelectPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ jsx(SelectPrimitive.ItemText, { children })]
}));
SelectItem.displayName = SelectPrimitive.Item.displayName;
var SelectSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SelectPrimitive.Separator, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
//#endregion
//#region src/lib/csv.ts
function toCsv(rows, columns) {
	const esc = (v) => {
		const s = v == null ? "" : String(v);
		return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
	};
	const header = columns.join(",");
	const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
	return header + "\n" + body;
}
function parseCsv(text) {
	const rows = [];
	let cur = [];
	let field = "";
	let inQuotes = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (inQuotes) if (ch === "\"") if (text[i + 1] === "\"") {
			field += "\"";
			i++;
		} else inQuotes = false;
		else field += ch;
		else if (ch === "\"") inQuotes = true;
		else if (ch === ",") {
			cur.push(field);
			field = "";
		} else if (ch === "\n") {
			cur.push(field);
			rows.push(cur);
			cur = [];
			field = "";
		} else if (ch === "\r") {} else field += ch;
	}
	if (field.length || cur.length) {
		cur.push(field);
		rows.push(cur);
	}
	const clean = rows.filter((r) => r.some((c) => c.trim() !== ""));
	if (clean.length === 0) return [];
	const header = clean[0].map((h) => h.trim());
	return clean.slice(1).map((r) => {
		const obj = {};
		header.forEach((h, i) => obj[h] = (r[i] ?? "").trim());
		return obj;
	});
}
function downloadCsv(filename, csv) {
	const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 500);
}
function readCsvFile(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(parseCsv(String(reader.result ?? "")));
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}
//#endregion
//#region src/components/CsvIO.tsx
function CsvIO({ entityLabel, filename, columns, rows, onImport }) {
	const fileRef = useRef(null);
	const [busy, setBusy] = useState(null);
	function handleTemplate() {
		setBusy("template");
		const csv = toCsv([], columns);
		downloadCsv(`${filename}-template.csv`, csv);
		setBusy(null);
	}
	function handleExport() {
		setBusy("export");
		const csv = toCsv(rows, columns);
		downloadCsv(`${filename}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`, csv);
		setBusy(null);
	}
	async function handleFile(e) {
		const f = e.target.files?.[0];
		e.target.value = "";
		if (!f) return;
		setBusy("import");
		try {
			const parsed = await readCsvFile(f);
			if (parsed.length === 0) {
				toast.error("File has no rows");
				return;
			}
			const res = await onImport(parsed);
			if (res.failed > 0) toast.warning(`Imported ${res.inserted} row(s); ${res.failed} failed`);
			else toast.success(`Imported ${res.inserted} ${entityLabel.toLowerCase()}`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Import failed");
		} finally {
			setBusy(null);
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-wrap items-center gap-2",
		children: [
			/* @__PURE__ */ jsx("input", {
				ref: fileRef,
				type: "file",
				accept: ".csv,text/csv",
				className: "hidden",
				onChange: handleFile
			}),
			/* @__PURE__ */ jsxs(Button, {
				type: "button",
				variant: "outline",
				size: "sm",
				onClick: handleTemplate,
				disabled: busy !== null,
				children: [/* @__PURE__ */ jsx(FileSpreadsheet, { className: "size-4" }), "Template"]
			}),
			/* @__PURE__ */ jsxs(Button, {
				type: "button",
				variant: "outline",
				size: "sm",
				onClick: () => fileRef.current?.click(),
				disabled: busy !== null,
				children: [busy === "import" ? /* @__PURE__ */ jsx(Loader2, { className: "size-4 animate-spin" }) : /* @__PURE__ */ jsx(Upload, { className: "size-4" }), "Import"]
			}),
			/* @__PURE__ */ jsxs(Button, {
				type: "button",
				variant: "outline",
				size: "sm",
				onClick: handleExport,
				disabled: busy !== null || rows.length === 0,
				children: [/* @__PURE__ */ jsx(Download, { className: "size-4" }), "Export"]
			})
		]
	});
}
//#endregion
export { SelectTrigger as a, SelectItem as i, Select as n, SelectValue as o, SelectContent as r, CsvIO as t };

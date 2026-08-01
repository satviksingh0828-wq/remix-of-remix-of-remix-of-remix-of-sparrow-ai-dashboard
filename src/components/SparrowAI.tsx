import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Bot, ChevronRight, Loader2, Mic, MicOff, Play, Send, Trash2, X } from "lucide-react";
import { useSession } from "@/lib/session";
import { useSparrowAI } from "@/lib/sparrow-context";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";

type ReadOnlyRow = {
  id?: string;
  branch_id?: string | null;
  amount?: string | number | null;
  [key: string]: unknown;
};

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return {
    start: fmt(start),
    end: fmt(end),
    label: start.toLocaleString("en-IN", { month: "long", year: "numeric" }),
  };
}


type SparrowSearchFilter = {
  start?: string;
  end?: string;
  tripCode?: string;
  vehicleText?: string;
  driverText?: string;
  minAmount?: number;
};

const SPARROW_APP_MAP = `
━━━ COMPLETE APP MAP ━━━
Operations (/operations):
- Trip tab: live/open trips from trips. Trip editor has tabs Manifest, Other Income, Expenses, Vehicle, Driver, Transporter, Summary. Buttons include New trip, Edit, Delete, Close trip, View logs. Manifest fields: Cnmt No., Source, Weight (kg), Quantity (units), Freight, Loading, remarks. Other Income and Expenses are trip-specific rows.
- Expenditure tab: general expenses with Branch, Vehicle, Driver, Transporter, Expenditure name, Amount, Date, Paid date, Note, insurance/road-tax/fastag flags, settle/delete/import/export/log actions.
- Income tab: general non-trip income with Branch, Vehicle, Driver, Transporter, Income name, Amount, Date, Received date, Note, settle/delete/import/export/log actions.
- Driver Payroll tab: payroll summaries, Generate Payroll, Give Advance, payroll month, salary, deduction and advance schedule fields.
- Fixed Incomes tab: admin-only fixed-income list with filters and Excel export.
Masters (/masters): Driver, Vehicle, Transporter, Locations, Sources. Each master supports create/edit/delete/import/export and admin log viewing. Source forms include rate contract entries, fixed monthly charges and quantity slabs.
Dashboard (/dashboard): admin-only stat cards, P&L, trip summary, entity P&L and branch/date/month/year filters.
Reports (/reports): admin-only P&L reports, trip averages, vehicle/driver/other expense reports, Fastag Balance and date/entity filters.
Users (/users): admin-only user management, roles, branch access, device/session controls and Logs tab.
Settings (/settings): admin-only theme/login UI settings that sync through Supabase realtime.
Import Trips (/import-trips): admin import for historical trips, manifests, expenses and income CSVs.

━━━ DATA SEMANTICS ━━━
- trips = open/live/in-progress trips that are not finalized yet.
- closed_trips = completed, archived and finalized trips with snapshot totals.
- trip_manifests = consignments inside an open trip.
- trip_other_income = extra income attached to an open trip.
- trip_expenses = expenses attached to an open trip.
- incomes/expenditures = general income/expense rows not necessarily tied to a trip.
- app_logs = audit trail for user/module actions.
- vehicle_trip_logs, driver_expense_logs, other_expense_logs and fastag_transactions = close-trip ledgers used by reports.
`;

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inferSearchFilter(text: string): SparrowSearchFilter {
  const now = new Date();
  const lower = text.toLowerCase();
  const filter: SparrowSearchFilter = {};
  if (/last\s+30\s+days/.test(lower)) {
    const start = new Date(now); start.setDate(start.getDate() - 30);
    filter.start = isoDate(start); filter.end = isoDate(now);
  } else if (/this\s+year/.test(lower)) {
    filter.start = `${now.getFullYear()}-01-01`; filter.end = isoDate(now);
  } else if (/last\s+quarter/.test(lower)) {
    const q = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), (q - 1) * 3, 1);
    const end = new Date(now.getFullYear(), q * 3, 1);
    filter.start = isoDate(start); filter.end = isoDate(end);
  } else if (/this\s+week/.test(lower)) {
    const start = new Date(now); start.setDate(now.getDate() - now.getDay());
    filter.start = isoDate(start); filter.end = isoDate(now);
  } else {
    const range = lower.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|through|-)\s*(\d{4}-\d{2}-\d{2})/);
    if (range) { filter.start = range[1]; filter.end = range[2]; }
  }
  const trip = text.match(/\b(?:trip\s*)?([A-Z]{2,}[-/]?\d{2,}[-/]?\d*)\b/i);
  if (trip) filter.tripCode = trip[1];
  const vehicle = text.match(/vehicle\s+([A-Z0-9 -]{4,15})/i);
  if (vehicle) filter.vehicleText = vehicle[1].trim();
  const driver = text.match(/driver\s+([A-Za-z ]{3,30})/i);
  if (driver) filter.driverText = driver[1].trim();
  const amount = lower.match(/(?:above|over|greater than|more than)\s*₹?\s*([\d,]+)/);
  if (amount) filter.minAmount = Number(amount[1].replace(/,/g, ""));
  return filter;
}


async function safeFetchAll<T = ReadOnlyRow>(buildQuery: Parameters<typeof fetchAll<T>>[0]) {
  try {
    return await fetchAll<T>(buildQuery);
  } catch {
    return [];
  }
}

function summarizeRows(label: string, rows: ReadOnlyRow[], fields: string[]) {
  const sample = rows.slice(0, 8).map((row) =>
    fields.map((f) => `${f}=${String(row[f] ?? "—")}`).join(", "),
  ).join("; ");
  return `${label}: ${rows.length} row(s)${sample ? ` | ${sample}` : ""}.`;
}

function sumAmounts(rows: ReadOnlyRow[]) {
  return rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
}

function applyBranchFilter<T extends { branch_id?: string | null }>(
  rows: T[],
  branchIds: string[] | null,
) {
  if (branchIds === null) return rows;
  return rows.filter((row) => row.branch_id && branchIds.includes(row.branch_id));
}

function asksCurrentMonthInsurancePremium(text: string) {
  return (
    /insurance|premium/i.test(text) &&
    /(this month|current month|month|how much|total|sum)/i.test(text)
  );
}

async function answerCurrentMonthInsurancePremium(role: string, branchIds: string[] | undefined) {
  const allowedBranchIds = role === "basic" ? (branchIds ?? []) : null;
  if (allowedBranchIds !== null && allowedBranchIds.length === 0) {
    return "No insurance premium data is accessible because your account has no assigned branches.";
  }

  const { start, end, label } = currentMonthRange();
  const rows = await fetchAll<ReadOnlyRow>(() => {
    let query = supabase
      .from("expenditures")
      .select("id,expenditure_name,amount,entry_date,branch_id,is_insurance,note")
      .gte("entry_date", start)
      .lt("entry_date", end)
      .order("entry_date", { ascending: false });

    if (allowedBranchIds !== null) {
      query = query.in("branch_id", allowedBranchIds) as typeof query;
    }
    return query;
  });
  const insuranceRows = rows.filter(
    (row) =>
      row.is_insurance === true || /insurance|premium/i.test(String(row.expenditure_name ?? "")),
  );
  const total = sumAmounts(insuranceRows);
  const details = insuranceRows
    .slice(0, 5)
    .map(
      (row) =>
        `• ${row.entry_date ?? "No date"}: ${row.expenditure_name ?? "Insurance Premium"} — ${money(Number(row.amount ?? 0))}${row.note ? ` (${row.note})` : ""}`,
    )
    .join("\n");

  return `Insurance premium expenditure for ${label} is ${money(total)} across ${insuranceRows.length} row(s).${details ? `\n${details}` : ""}`;
}


function wantsFileGeneration(text: string) {
  return /(excel|xlsx|spreadsheet|csv|file|download|export)/i.test(text) && /(expense|expenditure|income|trip|manifest|log|fastag|report)/i.test(text);
}

function reportKind(text: string) {
  const lower = text.toLowerCase();
  if (/manifest/.test(lower)) return "manifests";
  if (/fastag/.test(lower)) return "fastag";
  if (/log/.test(lower)) return "logs";
  if (/closed\s+trip|completed\s+trip/.test(lower)) return "closed_trips";
  if (/open\s+trip|live\s+trip|\btrip/.test(lower)) return "trips";
  if (/income/.test(lower)) return "incomes";
  return "expenditures";
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function downloadRowsFile(rows: ReadOnlyRow[], filename: string, sheetName: string) {
  if (rows.length === 0) throw new Error("No rows found for that file request.");
  try {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  } catch {
    const headers = Object.keys(rows[0] ?? {});
    const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.replace(/\.xlsx$/i, ".csv");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

async function generateReportFile(text: string, role: string, branchIds: string[] | undefined) {
  const allowedBranchIds = role === "basic" ? (branchIds ?? []) : null;
  if (allowedBranchIds !== null && allowedBranchIds.length === 0) {
    return "I couldn't create the file because your account has no assigned branches.";
  }

  const filter = inferSearchFilter(text);
  const { start: monthStart, end: monthEnd, label } = currentMonthRange();
  const start = filter.start ?? monthStart;
  const end = filter.end ?? monthEnd;
  const kind = reportKind(text);
  const db = supabase as any;

  const withBranch = (query: any) => allowedBranchIds === null ? query : query.in("branch_id", allowedBranchIds);
  let rows: ReadOnlyRow[] = [];
  let sheet = kind;

  if (kind === "incomes") {
    rows = await fetchAll<ReadOnlyRow>(() => withBranch(supabase.from("incomes").select("id,income_name,amount,entry_date,received_date,branch_id,vehicle_id,driver_id,transporter_id,note").gte("entry_date", start).lt("entry_date", end).order("entry_date", { ascending: false })));
    sheet = "Incomes";
  } else if (kind === "trips") {
    rows = await fetchAll<ReadOnlyRow>(() => withBranch(supabase.from("trips").select("id,trip_code,branch_id,ownership,start_date,start_time,vehicle_id,driver_id,transporter_id,created_at").order("created_at", { ascending: false })));
    sheet = "Open Trips";
  } else if (kind === "closed_trips") {
    rows = await fetchAll<ReadOnlyRow>(() => withBranch(supabase.from("closed_trips").select("id,trip_code,branch_id,branch_name,start_date,end_date,closed_at,total_income,total_expense,net_income,vehicle_id,driver_id,transporter_id").gte("closed_at", start).lt("closed_at", end).order("closed_at", { ascending: false })));
    sheet = "Closed Trips";
  } else if (kind === "manifests") {
    rows = await fetchAll<ReadOnlyRow>(() => supabase.from("trip_manifests").select("id,trip_id,source_id,manifest_number,weight,quantity,freight_amount,loading_amount,created_at").order("created_at", { ascending: false }));
    sheet = "Manifests";
  } else if (kind === "fastag") {
    rows = await safeFetchAll<ReadOnlyRow>(() => db.from("fastag_transactions").select("id,vehicle_id,amount,transaction_type,transaction_date,description,trip_code").gte("transaction_date", start).lt("transaction_date", end).order("transaction_date", { ascending: false }));
    sheet = "Fastag";
  } else if (kind === "logs") {
    if (role !== "admin") return "Audit and ledger log files are admin-only.";
    rows = await safeFetchAll<ReadOnlyRow>(() => db.from("app_logs").select("id,created_at,username,entity_type,action,entity_label,details").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false }));
    sheet = "Audit Logs";
  } else {
    rows = await fetchAll<ReadOnlyRow>(() => withBranch(supabase.from("expenditures").select("id,expenditure_name,amount,entry_date,paid_date,branch_id,vehicle_id,driver_id,transporter_id,is_insurance,is_road_tax,is_fastag_recharge,note").gte("entry_date", start).lt("entry_date", end).order("entry_date", { ascending: false })));
    sheet = "Expenditures";
  }

  rows = rows.filter((row) =>
    (!filter.tripCode || String(row.trip_code ?? "").toLowerCase().includes(filter.tripCode.toLowerCase())) &&
    (!filter.minAmount || Number(row.amount ?? row.total_expense ?? row.total_income ?? 0) > filter.minAmount)
  );

  const filename = `sparrow-${sheet.toLowerCase().replace(/\s+/g, "-")}-${start}-to-${end}.xlsx`;
  await downloadRowsFile(rows, filename, sheet);
  return `Done — I generated ${filename} with ${rows.length} ${sheet.toLowerCase()} row(s) for ${filter.start || filter.end ? `${start} to ${end}` : label}. If your browser asks, allow the download.`;
}

function wantsReadOnlyData(text: string) {
  return /(how much|total|sum|report|filter|find|show|list|count|insurance|premium|income|expenditure|expense|vehicle|driver|trip|closed trip|open trip)/i.test(
    text,
  );
}

async function buildReadOnlyDataContext(text: string, role: string, branchIds: string[] | undefined) {
  if (!wantsReadOnlyData(text)) return "";

  const allowedBranchIds = role === "basic" ? (branchIds ?? []) : null;
  if (allowedBranchIds !== null && allowedBranchIds.length === 0) {
    return "READ-ONLY DATA: Basic user has no assigned branches, so no business rows are accessible.";
  }

  const { start: monthStart, end: monthEnd, label } = currentMonthRange();
  const filter = inferSearchFilter(text);
  const start = filter.start ?? monthStart;
  const end = filter.end ?? monthEnd;
  const dateLabel = filter.start || filter.end ? `${start} to ${end}` : `${label} (${monthStart} to ${monthEnd}, end exclusive)`;

  const db = supabase as any;
  const [expRows, incomeRows, openTripsRows, closedTripsRows, vehiclesRows, driversRows, manifestRows, tripIncomeRows, tripExpenseRows, fastagRows, vehicleLogRows, driverLogRows, otherLogRows, appLogRows] = await Promise.all([
    fetchAll<ReadOnlyRow>(() => supabase.from("expenditures").select("id,expenditure_name,amount,entry_date,paid_date,branch_id,vehicle_id,driver_id,transporter_id,is_insurance,is_road_tax,is_fastag_recharge,note").gte("entry_date", start).lt("entry_date", end).order("entry_date", { ascending: false })),
    fetchAll<ReadOnlyRow>(() => supabase.from("incomes").select("id,income_name,amount,entry_date,received_date,branch_id,vehicle_id,driver_id,transporter_id,note").gte("entry_date", start).lt("entry_date", end).order("entry_date", { ascending: false })),
    fetchAll<ReadOnlyRow>(() => supabase.from("trips").select("id,trip_code,branch_id,vehicle_id,driver_id,transporter_id,start_date,start_time,ownership,created_at").order("created_at", { ascending: false })),
    fetchAll<ReadOnlyRow>(() => supabase.from("closed_trips").select("id,trip_code,branch_id,branch_name,start_date,end_date,closed_at,total_income,total_expense,net_income,vehicle_id,driver_id,transporter_id").gte("closed_at", start).lt("closed_at", end).order("closed_at", { ascending: false })),
    fetchAll<ReadOnlyRow>(() => supabase.from("vehicles").select("id,registration_number,nickname,branch_id").order("registration_number")),
    fetchAll<ReadOnlyRow>(() => supabase.from("drivers").select("id,driver_code,full_name,branch_id").order("full_name")),
    fetchAll<ReadOnlyRow>(() => supabase.from("trip_manifests").select("id,trip_id,source_id,manifest_number,weight,quantity,freight_amount,loading_amount,created_at").order("created_at", { ascending: false })),
    fetchAll<ReadOnlyRow>(() => supabase.from("trip_other_income").select("id,trip_id,income_name,amount,note,created_at").order("created_at", { ascending: false })),
    fetchAll<ReadOnlyRow>(() => supabase.from("trip_expenses").select("id,trip_id,expense_name,amount,note,created_at").order("created_at", { ascending: false })),
    safeFetchAll<ReadOnlyRow>(() => db.from("fastag_transactions").select("id,vehicle_id,amount,transaction_type,transaction_date,description,trip_code").gte("transaction_date", start).lt("transaction_date", end).order("transaction_date", { ascending: false })),
    safeFetchAll<ReadOnlyRow>(() => db.from("vehicle_trip_logs").select("id,vehicle_id,trip_code,trip_date,fuel_amount,parking_amount,odo_start,odo_end,distance_km").gte("trip_date", start).lt("trip_date", end).order("trip_date", { ascending: false })),
    safeFetchAll<ReadOnlyRow>(() => db.from("driver_expense_logs").select("id,driver_id,trip_code,trip_date,bata_amount,morning_amount,night_amount").gte("trip_date", start).lt("trip_date", end).order("trip_date", { ascending: false })),
    safeFetchAll<ReadOnlyRow>(() => db.from("other_expense_logs").select("id,trip_code,trip_date,expense_name,amount").gte("trip_date", start).lt("trip_date", end).order("trip_date", { ascending: false })),
    role === "admin" ? safeFetchAll<ReadOnlyRow>(() => db.from("app_logs").select("id,created_at,username,entity_type,action,entity_label,details").gte("created_at", start).lt("created_at", end).order("created_at", { ascending: false })) : Promise.resolve([]),
  ]);

  const vehicles = applyBranchFilter(vehiclesRows, allowedBranchIds);
  const drivers = applyBranchFilter(driversRows, allowedBranchIds);
  const matchingVehicleIds = new Set(vehicles.filter((v) => !filter.vehicleText || `${v.registration_number ?? ""} ${v.nickname ?? ""}`.toLowerCase().includes(filter.vehicleText.toLowerCase())).map((v) => v.id).filter(Boolean));
  const matchingDriverIds = new Set(drivers.filter((d) => !filter.driverText || `${d.full_name ?? ""} ${d.driver_code ?? ""}`.toLowerCase().includes(filter.driverText.toLowerCase())).map((d) => d.id).filter(Boolean));
  const vehicleIds = new Set(vehicles.map((v) => v.id).filter(Boolean));
  const driverIds = new Set(drivers.map((d) => d.id).filter(Boolean));
  const entityMatches = (r: ReadOnlyRow) => (!filter.vehicleText || matchingVehicleIds.has(r.vehicle_id)) && (!filter.driverText || matchingDriverIds.has(r.driver_id));
  const expenditures = applyBranchFilter(expRows, allowedBranchIds).filter((r) => entityMatches(r) && (!filter.minAmount || Number(r.amount ?? 0) > filter.minAmount));
  const incomes = applyBranchFilter(incomeRows, allowedBranchIds).filter((r) => entityMatches(r) && (!filter.minAmount || Number(r.amount ?? 0) > filter.minAmount));
  const openTrips = applyBranchFilter(openTripsRows, allowedBranchIds).filter((r) => entityMatches(r) && (!filter.tripCode || String(r.trip_code ?? "").toLowerCase().includes(filter.tripCode!.toLowerCase())));
  const openTripIds = new Set(openTrips.map((t) => t.id).filter(Boolean));
  const closedTrips = applyBranchFilter(closedTripsRows, allowedBranchIds).filter((r) => entityMatches(r) && (!filter.tripCode || String(r.trip_code ?? "").toLowerCase().includes(filter.tripCode!.toLowerCase())));
  const manifests = manifestRows.filter((r) => openTripIds.has(r.trip_id));
  const tripIncome = tripIncomeRows.filter((r) => openTripIds.has(r.trip_id));
  const tripExpenses = tripExpenseRows.filter((r) => openTripIds.has(r.trip_id));
  const fastag = fastagRows.filter((r) => allowedBranchIds === null || !r.vehicle_id || vehicleIds.has(r.vehicle_id));
  const vehicleLogs = vehicleLogRows.filter((r) => allowedBranchIds === null || !r.vehicle_id || vehicleIds.has(r.vehicle_id));
  const driverLogs = driverLogRows.filter((r) => allowedBranchIds === null || !r.driver_id || driverIds.has(r.driver_id));
  const otherLogs = otherLogRows.filter((r) => !filter.minAmount || Number(r.amount ?? 0) > filter.minAmount);
  const insuranceRows = expenditures.filter((row) => row.is_insurance === true || /insurance|premium/i.test(String(row.expenditure_name ?? "")));

  return [
    `READ-ONLY DATA ACCESS: Live Supabase data, role-filtered, read-only. Date/search scope: ${dateLabel}.`,
    `Semantic rule: trips are OPEN/RUNNING; closed_trips are DONE/FINALIZED archives. Never mix them unless the user asks for all trips.`,
    `Totals: expenditures ${money(sumAmounts(expenditures))}/${expenditures.length}; incomes ${money(sumAmounts(incomes))}/${incomes.length}; insurance premium ${money(sumAmounts(insuranceRows))}/${insuranceRows.length}; trip income ${money(sumAmounts(tripIncome))}/${tripIncome.length}; trip expenses ${money(sumAmounts(tripExpenses))}/${tripExpenses.length}.`,
    `Counts: open trips ${openTrips.length}; closed trips ${closedTrips.length}; manifests ${manifests.length}; vehicles ${vehicles.length}; drivers ${drivers.length}; fastag txns ${fastag.length}; vehicle logs ${vehicleLogs.length}; driver logs ${driverLogs.length}; other expense logs ${otherLogs.length}; app logs ${appLogRows.length}.`,
    summarizeRows("Open trip sample", openTrips, ["trip_code", "start_date", "ownership", "vehicle_id", "driver_id"]),
    summarizeRows("Closed trip sample", closedTrips, ["trip_code", "closed_at", "total_income", "total_expense", "net_income"]),
    summarizeRows("Manifest sample", manifests, ["manifest_number", "weight", "quantity", "freight_amount", "loading_amount"]),
    summarizeRows("Ledger/log sample", [...vehicleLogs, ...driverLogs, ...otherLogs, ...fastag].slice(0, 8), ["trip_code", "trip_date", "transaction_date", "amount", "expense_name", "transaction_type"]),
    role === "admin" ? summarizeRows("Audit log sample", appLogRows, ["created_at", "username", "entity_type", "action", "entity_label"]) : "Audit logs: admin-only; hidden for basic users.",
  ].join("\n");
}

// ── Puter.js + Speech Recognition type shims ─────────────────────────────────
declare global {
  interface Window {
    puter?: {
      ai: {
        chat: (
          messages: { role: string; content: string }[],
          options?: { model?: string },
        ) => Promise<{ message: { content: string } }>;
      };
    };
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
  interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: Event) => void) | null;
    onend: (() => void) | null;
  }
  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
}

// ── Routes (role-gated) ───────────────────────────────────────────────────────
const ADMIN_ROUTES = ["/home", "/operations", "/masters", "/dashboard", "/reports", "/users", "/settings"];
const BASIC_ROUTES = ["/home", "/operations", "/masters"];

// ── DOM action types ──────────────────────────────────────────────────────────
type SparrowAction =
  | { type: "navigate"; path: string }
  | { type: "wait"; ms: number }
  | { type: "click_button"; text: string }
  | { type: "click_tab"; text: string }
  | { type: "fill_input"; label: string; value: string }
  | { type: "fill_placeholder"; placeholder: string; value: string }
  | { type: "open_picker"; label: string; search: string }
  | { type: "scroll_to"; label: string };

// ── DOM helpers ───────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function fillReactInput(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  nativeSetter ? nativeSetter.call(el, value) : (el.value = value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.focus();
}

/** Get clean trimmed text of an element, stripping icon SVG whitespace. */
function cleanText(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * Find an input/textarea associated with a label text.
 * Searches the whole document including open dialogs/portals.
 */
function findInputByLabel(labelText: string): HTMLInputElement | HTMLTextAreaElement | null {
  const needle = labelText.toLowerCase().replace(/[₹*()]/g, "").trim();

  for (const label of Array.from(document.querySelectorAll<HTMLLabelElement>("label"))) {
    const ltext = (label.textContent ?? "").toLowerCase().replace(/[₹*()]/g, "").trim();
    if (!ltext.includes(needle) && !needle.includes(ltext)) continue;

    const forId = label.getAttribute("for");
    if (forId) {
      const el = document.getElementById(forId);
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return el;
    }
    const nested = label.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (nested) return nested;
    const sibling = label.parentElement?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea",
    );
    if (sibling) return sibling;
  }

  return (
    Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"),
    ).find(
      (i) =>
        i.placeholder?.toLowerCase().includes(needle) ||
        i.getAttribute("aria-label")?.toLowerCase().includes(needle),
    ) ?? null
  );
}

/**
 * Retry finding an input — scrolls to trigger lazy rendering on later attempts.
 */
async function findInputRetry(
  label: string,
  maxAttempts = 6,
  delay = 400,
): Promise<HTMLInputElement | HTMLTextAreaElement | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const el = findInputByLabel(label);
    if (el) return el;
    if (i < maxAttempts - 1) {
      // On retry 2+, scroll the page to trigger lazy renders
      if (i === 2) window.scrollTo({ top: 0, behavior: "smooth" });
      if (i === 3) window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      await sleep(delay);
    }
  }
  return null;
}

const BLOCKED = ["save", "delete", "remove record", "confirm delete", "submit trip"];
const isBlocked = (text: string) => BLOCKED.some((w) => text.toLowerCase().includes(w));

/**
 * Find a button by text — robust to icon+text combos.
 */
function findButtonByText(text: string): HTMLButtonElement | null {
  const needle = text.toLowerCase().trim();
  const all = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));

  const exact = all.find((b) => cleanText(b) === needle);
  if (exact) return exact;

  const contains = all.find((b) => cleanText(b).includes(needle));
  if (contains) return contains;

  // innerText fallback
  const byInner =
    all.find((b) => (b.innerText ?? "").toLowerCase().trim() === needle) ??
    all.find((b) => (b.innerText ?? "").toLowerCase().trim().includes(needle));
  if (byInner) return byInner;

  // Fuzzy fallback: match on first significant word
  const firstWord = needle.split(/\s+/)[0];
  if (firstWord && firstWord.length > 2) {
    return all.find((b) => cleanText(b).startsWith(firstWord)) ?? null;
  }
  return null;
}

/**
 * Retry finding a button — scrolls to reveal off-screen content on later attempts.
 */
async function findButtonRetry(
  text: string,
  maxAttempts = 7,
  delay = 500,
): Promise<HTMLButtonElement | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const btn = findButtonByText(text);
    if (btn) return btn;
    if (i < maxAttempts - 1) {
      if (i === 2) window.scrollTo({ top: 0, behavior: "smooth" });
      if (i === 3) window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      await sleep(delay);
    }
  }
  return null;
}

/**
 * Open an EntityPicker (combobox) by its label, type a search term,
 * and click the first matching item in the command list.
 */
async function openPickerByLabel(
  labelText: string,
  searchTerm: string,
): Promise<{ ok: boolean; message: string }> {
  const needle = labelText.toLowerCase().replace(/[₹*()]/g, "").trim();

  for (const label of Array.from(document.querySelectorAll<HTMLLabelElement>("label"))) {
    const ltext = (label.textContent ?? "").toLowerCase().replace(/[₹*()]/g, "").trim();
    if (!ltext.includes(needle) && !needle.includes(ltext)) continue;

    const container = label.closest("div");
    if (!container) continue;
    const btn = container.querySelector<HTMLButtonElement>('[role="combobox"]');
    if (!btn) continue;

    btn.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(120);
    btn.click();
    await sleep(500);

    const searchInput = document.querySelector<HTMLInputElement>('[cmdk-input]');
    if (searchInput) {
      fillReactInput(searchInput, searchTerm);
      await sleep(400);
      const items = Array.from(document.querySelectorAll<HTMLElement>('[cmdk-item]'));
      const match = items.find(
        (i) => (i.textContent ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
      );
      if (match) {
        match.click();
        return { ok: true, message: `Selected "${match.textContent?.trim()}"` };
      }
      return { ok: false, message: `No match for "${searchTerm}" in ${labelText} picker` };
    }
    return { ok: false, message: `Picker search box not found for "${labelText}"` };
  }
  return { ok: false, message: `Picker "${labelText}" not found on page` };
}

// ── Read visible page context from DOM ───────────────────────────────────────
function getPageContext(): string {
  const parts: string[] = [];

  // Active sidebar tab
  const desktopActive = document.querySelector<HTMLButtonElement>(
    "nav button.bg-primary-soft, nav li button.bg-primary-soft",
  );
  if (desktopActive) {
    const lines = (desktopActive.innerText ?? desktopActive.textContent ?? "").split("\n");
    const text = lines[0]?.trim();
    if (text && text.length < 30) parts.push(`ACTIVE TAB: ${text}`);
  }

  // Open dialog / sheet title
  const dialogTitle = document.querySelector(
    '[role="dialog"] [id*="title"], [role="dialog"] h2, [role="dialog"] h3',
  )?.textContent?.trim().replace(/\s+/g, " ");
  if (dialogTitle && dialogTitle.length < 80) parts.push(`OPEN FORM: "${dialogTitle}"`);

  // Page heading visible in main content
  const heading = document.querySelector("main h1, main h2, [data-main] h1")
    ?.textContent?.trim().replace(/\s+/g, " ");
  if (heading && heading.length < 80 && heading !== dialogTitle) {
    parts.push(`HEADING: "${heading}"`);
  }

  // Already-filled fields in open dialog (gives AI awareness of current form state)
  const filledFields: string[] = [];
  document.querySelectorAll<HTMLInputElement>('[role="dialog"] input').forEach((inp) => {
    if (!inp.value || inp.type === "hidden") return;
    const label = inp.closest("[class*='space-y']")?.querySelector("label")?.textContent
      ?.replace(/[₹*()]/g, "").trim();
    if (label && inp.value) filledFields.push(`${label}="${inp.value}"`);
  });
  if (filledFields.length > 0) parts.push(`FORM FIELDS: ${filledFields.slice(0, 4).join(", ")}`);

  // Visible screen/errors/toasts so Sparrow can explain what the user is seeing.
  const visibleAlerts = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[role="alert"], [data-sonner-toast], .text-destructive, [aria-invalid="true"]',
    ),
  )
    .map((el) => (el.innerText || el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim())
    .filter((text, idx, arr) => text.length > 2 && text.length < 180 && arr.indexOf(text) === idx)
    .slice(0, 5);
  if (visibleAlerts.length > 0) parts.push(`VISIBLE ALERTS/ERRORS: ${visibleAlerts.join("; ")}`);

  const visibleButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("main button, [role='dialog'] button"))
    .map((btn) => (btn.innerText || btn.textContent || "").replace(/\s+/g, " ").trim())
    .filter((text, idx, arr) => text.length > 1 && text.length < 40 && arr.indexOf(text) === idx)
    .slice(0, 10);
  if (visibleButtons.length > 0) parts.push(`VISIBLE BUTTONS: ${visibleButtons.join(", ")}`);

  return parts.join(" | ");
}

// ── Action executor ───────────────────────────────────────────────────────────
async function executeActions(
  actions: SparrowAction[],
  navigateFn: (path: string) => void,
  allowedRoutes: string[],
  onLog: (msg: string) => void,
  onStep: (step: string) => void,
  cancelRef: React.MutableRefObject<boolean>,
) {
  for (const act of actions) {
    if (cancelRef.current) break;

    switch (act.type) {
      case "navigate": {
        if (!allowedRoutes.includes(act.path)) {
          onLog(`Navigation to ${act.path} is not available for your role.`);
          break;
        }
        onStep(`Navigating to ${act.path}…`);
        navigateFn(act.path);
        break;
      }

      case "wait":
        await sleep(Math.min(act.ms, 5000));
        break;

      case "click_button": {
        if (isBlocked(act.text)) {
          onLog(`Blocked: will not click "${act.text}" (save/delete action).`);
          break;
        }
        onStep(`Clicking "${act.text}"…`);
        const btn = await findButtonRetry(act.text);
        if (btn && !btn.disabled) {
          btn.scrollIntoView({ behavior: "smooth", block: "nearest" });
          await sleep(80);
          btn.click();
        } else {
          onLog(`Button "${act.text}" was not found on the page.`);
        }
        break;
      }

      case "click_tab": {
        onStep(`Switching to "${act.text}" tab…`);
        const btn = await findButtonRetry(act.text, 7, 400);
        if (btn && !btn.disabled) {
          btn.click();
        } else {
          onLog(`Tab "${act.text}" was not found.`);
        }
        break;
      }

      case "fill_input": {
        onStep(`Filling "${act.label}"…`);
        const el = await findInputRetry(act.label);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await sleep(100);
          fillReactInput(el, act.value);
        } else {
          onLog(`Field "${act.label}" was not found on the page.`);
        }
        break;
      }

      case "fill_placeholder": {
        onStep(`Filling field…`);
        const needle = act.placeholder.toLowerCase();
        const el = Array.from(
          document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea"),
        ).find((i) => i.placeholder?.toLowerCase().includes(needle));
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          await sleep(100);
          fillReactInput(el, act.value);
        } else {
          onLog(`Field with placeholder "${act.placeholder}" not found.`);
        }
        break;
      }

      case "open_picker": {
        onStep(`Selecting "${act.search}" in ${act.label}…`);
        const result = await openPickerByLabel(act.label, act.search);
        if (!result.ok) onLog(result.message);
        break;
      }

      case "scroll_to": {
        const el = findInputByLabel(act.label);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        break;
      }
    }
    await sleep(160);
  }
  onStep("");
}

// ── Parse action block ────────────────────────────────────────────────────────
function parseActions(text: string): { actions: SparrowAction[]; displayText: string } {
  const S = "<<SPARROW_ACTIONS>>";
  const E = "<<END_ACTIONS>>";
  const s = text.indexOf(S);
  const e = text.indexOf(E);
  if (s === -1 || e === -1 || e <= s) return { actions: [], displayText: text };
  const jsonStr = text.slice(s + S.length, e).trim();
  const displayText = (text.slice(0, s) + text.slice(e + E.length)).trim();
  try {
    return { actions: JSON.parse(jsonStr) as SparrowAction[], displayText };
  } catch {
    return { actions: [], displayText: text };
  }
}

/** Convert an action to a short human-readable step label. Returns null for waits (skip). */
function summarizeAction(act: SparrowAction): string | null {
  switch (act.type) {
    case "navigate": return `Go to ${act.path}`;
    case "click_button": return `Click "${act.text}"`;
    case "click_tab": return `Switch to "${act.text}" tab`;
    case "fill_input": return `Fill ${act.label} → "${act.value}"`;
    case "fill_placeholder": return `Fill (placeholder "${act.placeholder}") → "${act.value}"`;
    case "open_picker": return `Select "${act.search}" in ${act.label}`;
    case "scroll_to": return `Scroll to ${act.label}`;
    case "wait": return null;
    default: return null;
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(
  role: string,
  userName: string,
  currentPath: string,
  pageContext: string,
): string {
  const isAdmin = role === "admin";
  const routes = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;

  return `You are SPARROW AI — a smart assistant embedded in a Transport Management System (TMS) for Garuda Logistics Solutions.

${SPARROW_APP_MAP}
USER: ${userName} | ROLE: ${isAdmin ? "Admin" : "Basic User"} | CURRENT PAGE: ${currentPath}${pageContext ? ` | ${pageContext}` : ""}

━━━ CORE RULES ━━━
- Be concise (under 80 words). State what you're doing, then do it.
- ${isAdmin ? "Full admin access to all modules." : "Basic user: NEVER use admin routes (Dashboard, Reports, Users, Settings)."}
- You CAN navigate, click, fill text/date/number fields, open pickers, read visible screen errors, and generate downloadable Excel files for read-only reports. You CANNOT save, delete, submit, close or reopen trips.
- Date inputs must be filled as YYYY-MM-DD; time inputs as HH:mm.
- If the user asks what error is on screen, use VISIBLE ALERTS/ERRORS from page context first.
- If the user asks for Excel/download/export, the app can generate the file directly before calling AI.
- If you filled a form, end with: "I filled everything I can. Please review and click Save to confirm."
- If the user asks for delete/close/reopen/submit, do not create an action for it; explain the exact manual steps and that approval is required.
- ALWAYS include <<SPARROW_ACTIONS>> whenever you interact with the app.
- Never say "you can do it yourself" if you can do it via actions.
- Use the CURRENT PAGE and OPEN FORM context above to understand what's already visible.

ALLOWED ROUTES: ${routes.join(", ")}

━━━ WHERE THINGS LIVE ━━━
- Trips, Income, Expenditure, Driver Payroll → /operations (sidebar tabs)
- Drivers, Vehicles, Transporters, Locations, Sources → /masters (sidebar tabs)
- Dashboard, Reports → /dashboard, /reports (admin only)

━━━ EXACT MODULE → TAB → BUTTON FLOW ━━━
New driver:       navigate /masters → click_tab "Driver"       → click_button "New driver"
New vehicle:      navigate /masters → click_tab "Vehicle"      → click_button "New vehicle"  (admin)
New transporter:  navigate /masters → click_tab "Transporter"  → click_button "New transporter"
New location:     navigate /masters → click_tab "Locations"    → click_button "New location" (admin)
New trip:         navigate /operations → click_tab "Trip"         → click_button "New trip"
New expenditure:  navigate /operations → click_tab "Expenditure"  → click_button "New expenditure"
New income:       navigate /operations → click_tab "Income"       → click_button "New income"

━━━ EXACT FIELD LABELS — use these EXACTLY in fill_input ━━━
Expenditure / Income form:
  "Expenditure name"  — type of expense (e.g. "Tea Expenses")
  "Amount"            — number (label shows "Amount (₹)", use "Amount")
  "Date"              — date picker
  "Note"              — city/remarks (e.g. "Ludhiana")
  "Branch (required)" — PICKER, use open_picker NOT fill_input
  "Vehicle"           — PICKER
  "Driver"            — PICKER  
  "Transporter"       — PICKER

Trip main form:
  "Trip Code", "Branch", "Ownership", "Start Date", "Start Time", "End Date", "End Time"
  Vehicle tab: "Vehicle", "Odometer Start", "Odometer End", fuel/parking/Fastag fields
  Driver tab: "Driver", bata/morning/night allowance fields
  Transporter tab: "Transporter", third-party vehicle/driver fields

Manifest form (inside trip, click "Create manifest" to open):
  "Cnmt No."          — consignment number
  "Weight (kg)"       — weight in kilograms
  "Source"            — PICKER per manifest row
  "Quantity (units)"  — number of units  ← NOT "Units", NOT "Quantity"

Trip Other Income / Trip Expenses row forms:
  "Income name", "Expense name", "Amount", "Note"

Trip form tabs (visible after opening a trip):
  Manifest | Other Income | Expenses | Vehicle | Driver | Transporter | Summary

Driver form (at /masters Driver tab):
  "Driver Code", "Full Name", "Date of Birth", "Mobile Number", "Driving Licence Number"

Vehicle form (at /masters Vehicle tab):
  "Vehicle Number (Registration Number)", "Manufacturer", "Model", "Engine No.", "Chassis No."

━━━ TERMINOLOGY ALIASES — map user words to real fields ━━━
- "location" / "city" / "place" / "where" → fill "Note" field
- "department" / "branch" / "office"      → "Branch (required)" (picker — user must select)
- "expense type" / "type" / "category"    → "Expenditure name"
- "units" / "qty"                         → "Quantity (units)"
- "weight"                                → "Weight (kg)"

━━━ BRANCH PICKER — important ━━━
Branch is a dropdown picker, not a text field. You CANNOT type it — the user must click it.
When a task needs a branch: fill all text fields first, then tell the user:
"Please select a branch from the Branch dropdown to complete the form."

━━━ ACTION TIMING RULES ━━━
- After navigate: wait 1500ms before any click
- After click_tab: wait 900ms
- After click_button that opens a dialog/form: wait 1200ms before filling fields
- After open_picker: wait 500ms
- Use fill_input only on text/number/date inputs with a matching Label

━━━ ACTION FORMAT ━━━
<<SPARROW_ACTIONS>>
[
  {"type":"navigate","path":"/masters"},
  {"type":"wait","ms":1500},
  {"type":"click_tab","text":"Driver"},
  {"type":"wait","ms":900},
  {"type":"click_button","text":"New driver"},
  {"type":"wait","ms":1200},
  {"type":"fill_input","label":"Driver Code","value":"DRV-001"},
  {"type":"fill_input","label":"Full Name","value":"Rajan Singh"}
]
<<END_ACTIONS>>

BLOCKED buttons (never click): save, delete, remove, submit trip, close trip, reopen`;
}

// ── Minimal markdown renderer ─────────────────────────────────────────────────
function parseInline(line: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) parts.push(<span key={i++}>{line.slice(last, m.index)}</span>);
    if (m[1] !== undefined) parts.push(<strong key={i++}>{m[1]}</strong>);
    else if (m[2] !== undefined) parts.push(<em key={i++}>{m[2]}</em>);
    last = re.lastIndex;
  }
  if (last < line.length) parts.push(<span key={i}>{line.slice(last)}</span>);
  return parts.length ? parts : line;
}

function renderMessage(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = (k: string) => {
    if (!list.length) return;
    nodes.push(
      <ul key={k} className="my-1 ml-4 space-y-0.5 list-disc">
        {list.map((item, idx) => <li key={idx}>{parseInline(item)}</li>)}
      </ul>,
    );
    list = [];
  };
  lines.forEach((line, i) => {
    const bullet = line.match(/^[•\-]\s+(.+)/);
    if (bullet) { list.push(bullet[1]); }
    else {
      flushList(`l${i}`);
      if (line.trim() === "") nodes.push(<div key={`s${i}`} className="h-1.5" />);
      else nodes.push(<div key={`p${i}`}>{parseInline(line)}</div>);
    }
  });
  flushList("end");
  return <>{nodes}</>;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Msg = { id: string; role: "user" | "assistant"; content: string; executing?: boolean };
type PendingPlan = { aiMsgId: string; actions: SparrowAction[]; steps: string[] };
const uid = () => Math.random().toString(36).slice(2);

const ADMIN_CHIPS = ["New expenditure", "New driver", "Open trip form", "Add vehicle", "Open dashboard"];
const BASIC_CHIPS = ["New expenditure", "New driver", "Open trip form", "New transporter"];

async function callPuter(messages: { role: string; content: string }[]): Promise<string> {
  const p = window.puter;
  if (!p?.ai?.chat) throw new Error("AI engine not ready. Please reload and try again.");
  type R = { message: { content: string } };
  const result = await Promise.race<R>([
    p.ai.chat(messages, { model: "gpt-4o-mini" }) as Promise<R>,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("Request timed out. Please try again.")), 30000),
    ),
  ]);
  return result.message?.content ?? "No response received.";
}

// ── Panel ─────────────────────────────────────────────────────────────────────
export function SparrowAIPanel() {
  const { open, setOpen } = useSparrowAI();
  const { user } = useSession();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [isListening, setIsListening] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const role = user?.role ?? "basic";
  const isAdmin = role === "admin";
  const displayName = (user?.fullName ?? user?.username ?? "there").split(" ")[0];
  const chips = isAdmin ? ADMIN_CHIPS : BASIC_CHIPS;
  const allowedRoutes = isAdmin ? ADMIN_ROUTES : BASIC_ROUTES;

  const STORAGE_KEY = `sparrow_history_${user?.id ?? "guest"}`;
  const MAX_STORED = 50;

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || messages.length > 0) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Msg[] = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
    } catch { /* ignore corrupt storage */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
    } catch { /* ignore quota errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setPendingPlan(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [STORAGE_KEY]);

  // ── Scroll + focus ────────────────────────────────────────────────────────
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, currentStep, pendingPlan]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 100); }, [open]);

  // ── Auto-resize textarea ──────────────────────────────────────────────────
  const resizeTextarea = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  // ── Voice input ───────────────────────────────────────────────────────────
  const SpeechRecognitionCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  const voiceSupported = !!SpeechRecognitionCtor;

  const toggleVoice = useCallback(() => {
    if (!SpeechRecognitionCtor) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const rec = new SpeechRecognitionCtor();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-IN";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setTimeout(resizeTextarea, 0);
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening, SpeechRecognitionCtor]);

  // ── Execute a confirmed plan ──────────────────────────────────────────────
  const runPlan = useCallback(
    async (plan: PendingPlan) => {
      setPendingPlan(null);
      cancelRef.current = false;

      setMessages((prev) =>
        prev.map((m) => (m.id === plan.aiMsgId ? { ...m, executing: true } : m)),
      );

      await executeActions(
        plan.actions,
        (path) => navigate({ to: path as "/" }),
        allowedRoutes,
        (log) => setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: `⚠️ ${log}` }]),
        (step) => setCurrentStep(step),
        cancelRef,
      );

      setMessages((prev) =>
        prev.map((m) => (m.id === plan.aiMsgId ? { ...m, executing: false } : m)),
      );
      setCurrentStep("");
    },
    [navigate, allowedRoutes],
  );

  const stopExecution = useCallback(() => {
    cancelRef.current = true;
    setCurrentStep("");
    setMessages((prev) => prev.map((m) => m.executing ? { ...m, executing: false } : m));
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      // Dismiss any pending plan before sending a new message
      setPendingPlan(null);

      const pageContext = getPageContext();
      const userMsg: Msg = { id: uid(), role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      setLoading(true);
      setCurrentStep("");

      try {
        if (wantsFileGeneration(trimmed)) {
          const content = await generateReportFile(trimmed, role, user?.branchIds);
          setMessages((prev) => [...prev, { id: uid(), role: "assistant", content }]);
          setCurrentStep("");
          return;
        }

        if (asksCurrentMonthInsurancePremium(trimmed)) {
          const content = await answerCurrentMonthInsurancePremium(role, user?.branchIds);
          setMessages((prev) => [...prev, { id: uid(), role: "assistant", content }]);
          setCurrentStep("");
          return;
        }

        const readOnlyDataContext = await buildReadOnlyDataContext(trimmed, role, user?.branchIds);
        const systemPrompt = `${buildSystemPrompt(role, displayName, currentPath, pageContext)}${readOnlyDataContext ? `\n\n━━━ READ-ONLY DATA CONTEXT ━━━\n${readOnlyDataContext}` : ""}`;
        const history = [...messages, userMsg].slice(-12).map((m) => ({
          role: m.role, content: m.content,
        }));

        const rawText = await callPuter([{ role: "system", content: systemPrompt }, ...history]);
        const { actions, displayText } = parseActions(rawText);

        const aiMsgId = uid();
        setMessages((prev) => [...prev, {
          id: aiMsgId,
          role: "assistant",
          content: displayText,
          executing: false,
        }]);

        if (actions.length > 0) {
          const steps = actions.map(summarizeAction).filter(Boolean) as string[];
          setPendingPlan({ aiMsgId, actions, steps });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: msg }]);
        setCurrentStep("");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, role, displayName, currentPath, user?.branchIds],
  );

  if (!user) return null;

  const isExecuting = messages.some((m) => m.executing);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border" role="complementary" aria-label="SPARROW AI">

      {/* ── Header ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">SPARROW AI</span>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {isAdmin ? "Admin" : "User"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              title="Clear chat history"
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="sparrow-scroll flex-1 overflow-y-auto px-4 py-4 space-y-3 text-sm">

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "rounded-tr-sm bg-primary text-primary-foreground"
                  : "rounded-tl-sm bg-muted text-foreground",
              )}
            >
              {renderMessage(msg.content)}
              {msg.executing && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin shrink-0" />
                  <span>{currentStep || "Working…"}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing dots while waiting for AI response */}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Execution progress banner */}
        {currentStep && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/6 px-3 py-2 text-xs text-primary">
              <Loader2 className="size-3 animate-spin shrink-0" />
              <span className="flex-1">{currentStep}</span>
              <button
                type="button"
                onClick={stopExecution}
                className="ml-1 text-[10px] font-medium text-primary/70 hover:text-primary underline underline-offset-2"
              >
                Stop
              </button>
            </div>
          </div>
        )}

        {/* ── Action plan confirmation card ── */}
        {pendingPlan && !loading && !isExecuting && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Action Plan
              </span>
              <button
                type="button"
                onClick={() => setPendingPlan(null)}
                className="flex size-5 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
            <div className="mb-3 space-y-1.5">
              {pendingPlan.steps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => runPlan(pendingPlan)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Play className="size-3" />
                Run
              </button>
              <button
                type="button"
                onClick={() => setPendingPlan(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
              >
                Skip
              </button>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Quick chips (empty state only) ── */}
      {messages.length === 0 && (
        <div className="shrink-0 border-t border-border px-4 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Quick actions
          </p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => send(chip)}
                disabled={loading}
                className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:opacity-40"
              >
                <ChevronRight className="size-3 shrink-0" />
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input box ── */}
      <div className="shrink-0 p-3">
        <div className={cn(
          "rounded-2xl border border-border bg-muted/30 transition-colors",
          "focus-within:border-primary/50 focus-within:bg-background focus-within:shadow-sm",
          isListening && "border-primary/60 bg-primary/5",
        )}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); resizeTextarea(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={isListening ? "Listening…" : "Message SPARROW AI…"}
            rows={1}
            disabled={loading}
            className={cn(
              "block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm",
              "placeholder:text-muted-foreground focus:outline-none",
              "disabled:opacity-50 min-h-[40px] max-h-[140px]",
            )}
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <span className="text-[10px] text-muted-foreground/40 select-none">
              ↵ send · shift+↵ newline
            </span>
            <div className="flex items-center gap-1.5">
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleVoice}
                  title={isListening ? "Stop listening" : "Voice input"}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xl transition-all",
                    isListening
                      ? "bg-primary/20 text-primary animate-pulse"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {isListening ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => send(input)}
                disabled={loading || !input.trim()}
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl transition-all",
                  input.trim() && !loading
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-40",
                )}
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
              </button>
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
          POWERED BY SPARROW AI SOLUTIONS
        </p>
      </div>
    </div>
  );
}

// ── Trigger button ─────────────────────────────────────────────────────────────
export function SparrowAITrigger() {
  const { open, toggle } = useSparrowAI();
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
        open
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Bot className="size-3.5" />
      SPARROW AI
    </button>
  );
}

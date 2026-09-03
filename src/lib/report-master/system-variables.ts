export type ReportScope = "open_trip" | "closed_trip" | "all_trip" | "open_manifest" | "closed_manifest" | "all_manifest" | "branch" | "monthly" | "yearly";
export type SystemVariable = {
  key: string;
  label: string;
  group: string;
  type: "text" | "number" | "currency" | "date" | "datetime" | "percentage";
  scopes: ReportScope[];
  description: string;
};

const open = ["open_trip", "all_trip", "open_manifest", "all_manifest"] as ReportScope[];
const closed = ["closed_trip", "all_trip", "closed_manifest", "all_manifest", "branch", "monthly", "yearly"] as ReportScope[];
const both = ["open_trip", "closed_trip", "all_trip", "open_manifest", "closed_manifest", "all_manifest", "branch", "monthly", "yearly"] as ReportScope[];
const manifest = ["open_manifest", "closed_manifest", "all_manifest"] as ReportScope[];
const v = (group: string, key: string, label: string, type: SystemVariable["type"], scopes: ReportScope[], description = label): SystemVariable => ({ group, key, label, type, scopes, description });
const SYSTEM_MANIFEST_LABELS: Record<string,string> = {number:"Manifest Number",date:"Manifest Date",from_location:"Manifest From Location",from_pin:"Manifest From Pin Code",to_location:"Manifest To Location",to_pin:"Manifest To Pin Code",weight_kg:"Manifest Weight (KG)",weight_tonnes:"Manifest Weight (Tonnes)",quantity:"Manifest Quantity",freight:"Manifest Freight",loading:"Manifest Loading",total_income:"Manifest Total Income"};

/** Stable allow-list. Keys are resolved by the report engine; they are never SQL. */
export const SYSTEM_VARIABLES: SystemVariable[] = [
  v("Open Trip", "open.trip_code", "Open Trip Code", "text", open),
  v("Open Trip", "open.status", "Open Trip Status", "text", open),
  v("Open Trip", "open.ownership", "Open Ownership Type", "text", open),
  v("Open Trip", "open.start_date", "Open Trip Start Date", "date", open),
  v("Open Trip", "open.end_date", "Planned End Date", "date", open),
  v("Open Trip", "open.start_time", "Open Trip Start Time", "text", open),
  v("Open Trip", "open.end_time", "Planned End Time", "text", open),
  v("Open Trip", "open.odometer_start", "Open Trip Start Odometer", "number", open),
  v("Open Trip", "open.odometer_end", "Open Trip End Odometer", "number", open),
  v("Open Trip", "open.notes", "Open Trip Notes", "text", open),
  v("Open Trip", "open.created_at", "Open Trip Created At", "datetime", open),
  v("Open Trip", "open.reopened_at", "Open Trip Reopened At", "datetime", open),
  v("Open Trip Financials", "open.manifest_count", "Open Trip Manifest Count", "number", open),
  v("Open Trip Financials", "open.total_weight_kg", "Open Trip Total Weight (KG)", "number", open),
  v("Open Trip Financials", "open.total_quantity", "Open Trip Total Quantity", "number", open),
  v("Open Trip Financials", "open.total_freight", "Open Trip Total Freight", "currency", open),
  v("Open Trip Financials", "open.total_loading", "Open Trip Total Loading", "currency", open),
  v("Open Trip Financials", "open.total_other_income", "Open Trip Total Other Income", "currency", open),
  v("Open Trip Financials", "open.total_income", "Open Trip Total Income", "currency", open),
  v("Open Trip Financials", "open.total_expense", "Open Trip Total Expense", "currency", open),
  v("Open Trip Financials", "open.net_income", "Open Trip Net Income", "currency", open),
  v("Open Trip Financials", "open.profit_margin", "Open Trip Profit Margin", "percentage", open),
  v("Closed Trip", "closed.trip_code", "Closed Trip Code", "text", closed),
  v("Closed Trip", "closed.status", "Closed Trip Status", "text", closed),
  v("Closed Trip", "closed.start_date", "Closed Trip Start Date", "date", closed),
  v("Closed Trip", "closed.end_date", "Closed Trip End Date", "date", closed),
  v("Closed Trip", "closed.closed_at", "Trip Closed At", "datetime", closed),
  v("Closed Trip", "closed.total_income", "Closed Trip Total Income", "currency", closed),
  v("Closed Trip", "closed.total_expense", "Closed Trip Total Expense", "currency", closed),
  v("Closed Trip", "closed.net_income", "Closed Trip Net Income", "currency", closed),
  v("Closed Trip", "closed.profit_margin", "Closed Trip Profit Margin", "percentage", closed),
  v("Closed Trip Financials", "closed.manifest_count", "Closed Trip Manifest Count", "number", closed),
  v("Closed Trip Financials", "closed.total_weight_kg", "Closed Trip Total Weight (KG)", "number", closed),
  v("Closed Trip Financials", "closed.total_quantity", "Closed Trip Total Quantity", "number", closed),
  v("Closed Trip Financials", "closed.total_freight", "Closed Trip Total Freight", "currency", closed),
  v("Closed Trip Financials", "closed.total_loading", "Closed Trip Total Loading", "currency", closed),
  v("Closed Trip Financials", "closed.total_other_income", "Closed Trip Total Other Income", "currency", closed),
  v("Trip", "trip.trip_code", "Trip Code", "text", both),
  v("Trip", "trip.status", "Trip Status", "text", both),
  v("Trip", "trip.branch_name", "Trip Branch", "text", both),
  v("Trip", "trip.start_date", "Trip Start Date", "date", both),
  v("Trip", "trip.end_date", "Trip End Date", "date", both),
  v("Trip", "trip.vehicle_number", "Vehicle Registration", "text", both),
  v("Trip", "trip.driver_name", "Driver Name", "text", both),
  v("Trip", "trip.transporter_name", "Transporter Name", "text", both),
  v("Trip", "trip.contract_name", "Contract Name", "text", both),
  v("Trip", "trip.start_location", "Start Location", "text", both),
  v("Trip", "trip.end_location", "End Location", "text", both),
  v("Trip", "trip.manifest_count", "Manifest Count", "number", both),
  v("Trip", "trip.total_weight_kg", "Total Trip Weight (KG)", "number", both),
  v("Trip", "trip.total_weight_tonnes", "Total Trip Weight (Tonnes)", "number", both),
  v("Trip", "trip.total_quantity", "Total Trip Quantity", "number", both),
  v("Trip", "trip.total_freight", "Total Trip Freight", "currency", both),
  v("Trip", "trip.total_loading", "Total Trip Loading", "currency", both),
  v("Trip", "trip.total_other_income", "Total Trip Other Income", "currency", both),
  v("Trip", "trip.total_income", "Total Trip Income", "currency", both),
  v("Trip", "trip.total_expense", "Total Trip Expense", "currency", both),
  v("Trip", "trip.net_income", "Trip Net Income", "currency", both),
  v("Manifest", "manifest.number", "Manifest Number", "text", manifest),
  v("Manifest", "manifest.date", "Manifest Date", "date", manifest),
  v("Manifest", "manifest.from_location", "Manifest From Location", "text", manifest),
  v("Manifest", "manifest.from_pin", "Manifest From Pin Code", "text", manifest),
  v("Manifest", "manifest.to_location", "Manifest To Location", "text", manifest),
  v("Manifest", "manifest.to_pin", "Manifest To Pin Code", "text", manifest),
  v("Manifest", "manifest.weight_kg", "Manifest Weight (KG)", "number", manifest),
  v("Manifest", "manifest.weight_tonnes", "Manifest Weight (Tonnes)", "number", manifest),
  v("Manifest", "manifest.quantity", "Manifest Quantity", "number", manifest),
  v("Manifest", "manifest.freight", "Manifest Freight", "currency", manifest),
  v("Manifest", "manifest.loading", "Manifest Loading", "currency", manifest),
  v("Manifest", "manifest.total_income", "Manifest Total Income", "currency", manifest),
  ...["number","date","from_location","from_pin","to_location","to_pin","weight_kg","weight_tonnes","quantity","freight","loading","total_income"].flatMap((field) => {
    const base = SYSTEM_MANIFEST_LABELS[field];
    const type = (["weight_kg","weight_tonnes","quantity"].includes(field) ? "number" : ["freight","loading","total_income"].includes(field) ? "currency" : field === "date" ? "date" : "text") as SystemVariable["type"];
    return [v("Open Trip Manifest", `open.manifest.${field}`, `${base} — Open Trip`, type, ["open_manifest","all_manifest"]),v("Closed Trip Manifest", `closed.manifest.${field}`, `${base} — Closed Trip`, type, ["closed_manifest","all_manifest"])];
  }),
  v("Vehicle Expense", "expense.fuel", "Fuel Expense", "currency", both),
  v("Vehicle Expense", "expense.parking", "Parking Charges", "currency", both),
  v("Driver Expense", "expense.driver_bata", "Driver Bata", "currency", both),
  v("Driver Expense", "expense.morning", "Morning Expense", "currency", both),
  v("Driver Expense", "expense.night", "Night Expense", "currency", both),
  v("Other Expense", "expense.dala", "Dala Charges", "currency", both),
  v("Other Expense", "expense.unloading", "Unloading Expense", "currency", both),
  v("Other Expense", "expense.sunday", "Sunday Expense", "currency", both),
  v("Other Expense", "expense.other", "Other Expense", "currency", both),
  v("Transporter Expense", "expense.hire", "Transporter Hire Charge", "currency", both),
  v("Transporter Expense", "expense.approval", "Approval Charge", "currency", both),
  v("Period", "period.month", "Month", "text", [...both, ...manifest]),
  v("Period", "period.year", "Year", "number", [...both, ...manifest]),
  v("Period", "period.financial_year", "Financial Year", "text", [...both, ...manifest]),
  v("Summary", "summary.row_count", "Row Count", "number", ["branch"]),
  v("Summary", "summary.trip_count", "Distinct Trip Count", "number", ["branch"]),
  v("Summary", "summary.manifest_count", "Distinct Manifest Count", "number", ["branch"]),
  v("Period Summary", "summary.open_trip_count", "Total Open Trips", "number", ["monthly","yearly"]),
  v("Period Summary", "summary.closed_trip_count", "Total Closed Trips", "number", ["monthly","yearly"]),
  v("Period Summary", "summary.total_trip_count", "Total Trips", "number", ["monthly","yearly"]),
  v("Period Summary", "summary.total_manifest_count", "Total Manifests", "number", ["monthly","yearly"]),
  v("Period Summary", "summary.total_weight_kg", "Total Weight (KG)", "number", ["monthly","yearly"]),
  v("Period Summary", "summary.total_quantity", "Total Quantity", "number", ["monthly","yearly"]),
  v("Period Summary", "summary.total_freight", "Total Freight", "currency", ["monthly","yearly"]),
  v("Period Summary", "summary.total_loading", "Total Loading", "currency", ["monthly","yearly"]),
  v("Period Summary", "summary.total_other_income", "Total Other Income", "currency", ["monthly","yearly"]),
  v("Period Summary", "summary.total_income", "Total Income", "currency", ["monthly","yearly"]),
  v("Period Summary", "summary.total_expense", "Total Expense", "currency", ["monthly","yearly"]),
  v("Period Summary", "summary.net_income", "Net Income", "currency", ["monthly","yearly"]),
  v("Period Summary", "summary.profit_margin", "Profit Margin", "percentage", ["monthly","yearly"]),
  v("Period Summary", "summary.average_income_per_trip", "Average Income per Trip", "currency", ["monthly","yearly"]),
  v("Period Summary", "summary.average_expense_per_trip", "Average Expense per Trip", "currency", ["monthly","yearly"]),
  v("Period Summary", "summary.average_weight_per_trip", "Average Weight per Trip", "number", ["monthly","yearly"]),
];

export const SYSTEM_VARIABLE_GROUPS = [...new Set(SYSTEM_VARIABLES.map((item) => item.group))];

export function dynamicFinancialVariables(incomeNames: string[], expenseNames: string[]): SystemVariable[] {
  const slug = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const unique = (names: string[]) => [...new Set(names.map((name) => name.trim()).filter(Boolean))].sort();
  return [
    ...unique(incomeNames).flatMap((name) => [
      v("Open Trip Income by Name", `open.income.${slug(name)}`, `${name} — Open Trip`, "currency", open, `Total of all open-trip income lines named ${name}`),
      v("Closed Trip Income by Name", `closed.income.${slug(name)}`, `${name} — Closed Trip`, "currency", closed, `Total of all closed-trip income lines named ${name}`),
      v("Trip Income by Name", `trip.income.${slug(name)}`, `${name} — Any Trip`, "currency", both, `Total of all income lines named ${name}`),
    ]),
    ...unique(expenseNames).flatMap((name) => [
      v("Open Trip Expense by Name", `open.expense.${slug(name)}`, `${name} — Open Trip`, "currency", open, `Total of all open-trip expense lines named ${name}`),
      v("Closed Trip Expense by Name", `closed.expense.${slug(name)}`, `${name} — Closed Trip`, "currency", closed, `Total of all closed-trip expense lines named ${name}`),
      v("Trip Expense by Name", `trip.expense.${slug(name)}`, `${name} — Any Trip`, "currency", both, `Total of all expense lines named ${name}`),
    ]),
  ];
}

export type ReportScope = "open_trip" | "closed_trip" | "all_trip" | "manifest" | "branch";
export type SystemVariable = {
  key: string;
  label: string;
  group: string;
  type: "text" | "number" | "currency" | "date" | "datetime" | "percentage";
  scopes: ReportScope[];
  description: string;
};

const open = ["open_trip", "all_trip"] as ReportScope[];
const closed = ["closed_trip", "all_trip", "branch"] as ReportScope[];
const both = ["open_trip", "closed_trip", "all_trip", "branch"] as ReportScope[];
const manifest = ["manifest"] as ReportScope[];
const v = (group: string, key: string, label: string, type: SystemVariable["type"], scopes: ReportScope[], description = label): SystemVariable => ({ group, key, label, type, scopes, description });

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
  v("Closed Trip", "closed.trip_code", "Closed Trip Code", "text", closed),
  v("Closed Trip", "closed.status", "Closed Trip Status", "text", closed),
  v("Closed Trip", "closed.start_date", "Closed Trip Start Date", "date", closed),
  v("Closed Trip", "closed.end_date", "Closed Trip End Date", "date", closed),
  v("Closed Trip", "closed.closed_at", "Trip Closed At", "datetime", closed),
  v("Closed Trip", "closed.total_income", "Closed Trip Total Income", "currency", closed),
  v("Closed Trip", "closed.total_expense", "Closed Trip Total Expense", "currency", closed),
  v("Closed Trip", "closed.net_income", "Closed Trip Net Income", "currency", closed),
  v("Closed Trip", "closed.profit_margin", "Closed Trip Profit Margin", "percentage", closed),
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
];

export const SYSTEM_VARIABLE_GROUPS = [...new Set(SYSTEM_VARIABLES.map((item) => item.group))];

export type ReportScope =
  | "open_trip"
  | "closed_trip"
  | "all_trip"
  | "open_manifest"
  | "closed_manifest"
  | "all_manifest"
  | "branch"
  | "monthly"
  | "yearly";
export type PeriodMode = "month" | "year" | "financial_year" | "all" | "custom";
export type SystemVariable = {
  key: string;
  label: string;
  group: string;
  type: "text" | "number" | "currency" | "date" | "datetime" | "percentage";
  scopes: ReportScope[];
  description: string;
};

const open = ["open_trip", "all_trip", "open_manifest", "all_manifest"] as ReportScope[];
const closed = [
  "closed_trip",
  "all_trip",
  "closed_manifest",
  "all_manifest",
  "branch",
  "monthly",
  "yearly",
] as ReportScope[];
const both = [
  "open_trip",
  "closed_trip",
  "all_trip",
  "open_manifest",
  "closed_manifest",
  "all_manifest",
  "branch",
  "monthly",
  "yearly",
] as ReportScope[];
const manifest = ["open_manifest", "closed_manifest", "all_manifest"] as ReportScope[];
const summary = ["branch", "monthly", "yearly"] as ReportScope[];
const v = (
  group: string,
  key: string,
  label: string,
  type: SystemVariable["type"],
  scopes: ReportScope[],
  description = label,
): SystemVariable => ({ group, key, label, type, scopes, description });
const SYSTEM_MANIFEST_LABELS: Record<string, string> = {
  number: "Manifest Number",
  date: "Manifest Date",
  from_location: "Manifest From Location",
  from_pin: "Manifest From Pin Code",
  to_location: "Manifest To Location",
  to_pin: "Manifest To Pin Code",
  weight_kg: "Manifest Weight (KG)",
  weight_tonnes: "Manifest Weight (Tonnes)",
  quantity: "Manifest Quantity",
  freight: "Manifest Freight",
  loading: "Manifest Loading",
  total_income: "Manifest Total Income",
};

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
  v(
    "Open Trip Financials",
    "open.total_other_income",
    "Open Trip Total Other Income",
    "currency",
    open,
  ),
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
  v(
    "Closed Trip Financials",
    "closed.manifest_count",
    "Closed Trip Manifest Count",
    "number",
    closed,
  ),
  v(
    "Closed Trip Financials",
    "closed.total_weight_kg",
    "Closed Trip Total Weight (KG)",
    "number",
    closed,
  ),
  v(
    "Closed Trip Financials",
    "closed.total_quantity",
    "Closed Trip Total Quantity",
    "number",
    closed,
  ),
  v(
    "Closed Trip Financials",
    "closed.total_freight",
    "Closed Trip Total Freight",
    "currency",
    closed,
  ),
  v(
    "Closed Trip Financials",
    "closed.total_loading",
    "Closed Trip Total Loading",
    "currency",
    closed,
  ),
  v(
    "Closed Trip Financials",
    "closed.total_other_income",
    "Closed Trip Total Other Income",
    "currency",
    closed,
  ),
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
  ...[
    "number",
    "date",
    "from_location",
    "from_pin",
    "to_location",
    "to_pin",
    "weight_kg",
    "weight_tonnes",
    "quantity",
    "freight",
    "loading",
    "total_income",
  ].flatMap((field) => {
    const base = SYSTEM_MANIFEST_LABELS[field];
    const type = (
      ["weight_kg", "weight_tonnes", "quantity"].includes(field)
        ? "number"
        : ["freight", "loading", "total_income"].includes(field)
          ? "currency"
          : field === "date"
            ? "date"
            : "text"
    ) as SystemVariable["type"];
    return [
      v("Open Trip Manifest", `open.manifest.${field}`, `${base} — Open Trip`, type, [
        "open_manifest",
        "all_manifest",
      ]),
      v("Closed Trip Manifest", `closed.manifest.${field}`, `${base} — Closed Trip`, type, [
        "closed_manifest",
        "all_manifest",
      ]),
    ];
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
  ...[
    ["entry_id", "Entry ID", "text"],
    ["name", "Income Name", "text"],
    ["amount", "Income Amount", "currency"],
    ["note", "Income Note", "text"],
    ["entry_date", "Income Entry Date", "date"],
    ["is_received", "Received", "text"],
    ["received_date", "Received Date", "date"],
    ["branch_name", "Income Branch", "text"],
    ["vehicle_number", "Income Vehicle", "text"],
    ["driver_name", "Income Driver", "text"],
    ["transporter_name", "Income Transporter", "text"],
    ["count", "Income Entry Count", "number"],
    ["total", "Operations Income", "currency"],
    ["received_total", "Received Income", "currency"],
    ["outstanding_total", "Outstanding Income", "currency"],
    ["average", "Average Income", "currency"],
    ["minimum", "Minimum Income", "currency"],
    ["maximum", "Maximum Income", "currency"],
  ].map(([key, label, type]) =>
    v("Operations Income", `operations.income.${key}`, label, type as SystemVariable["type"], both),
  ),
  ...[
    ["entry_id", "Entry ID", "text"],
    ["name", "Expenditure Name", "text"],
    ["amount", "Expenditure Amount", "currency"],
    ["note", "Expenditure Note", "text"],
    ["entry_date", "Expenditure Entry Date", "date"],
    ["is_paid", "Paid", "text"],
    ["paid_date", "Paid Date", "date"],
    ["branch_name", "Expenditure Branch", "text"],
    ["vehicle_number", "Expenditure Vehicle", "text"],
    ["driver_name", "Expenditure Driver", "text"],
    ["transporter_name", "Expenditure Transporter", "text"],
    ["is_emi", "EMI", "text"],
    ["count", "Expenditure Entry Count", "number"],
    ["total", "Operations Expenditure", "currency"],
    ["paid_total", "Paid Expenditure", "currency"],
    ["unpaid_total", "Unpaid Expenditure", "currency"],
    ["average", "Average Expenditure", "currency"],
    ["minimum", "Minimum Expenditure", "currency"],
    ["maximum", "Maximum Expenditure", "currency"],
  ].map(([key, label, type]) =>
    v(
      "Operations Expenditure",
      `operations.expenditure.${key}`,
      label,
      type as SystemVariable["type"],
      both,
    ),
  ),
  v("Operations Income", "operations.net_income", "Operations Net Income", "currency", both),
  v(
    "Operations Income",
    "operations.profit_margin",
    "Operations Profit Margin",
    "percentage",
    both,
  ),
  v(
    "Operations Income",
    "operations.income_per_entry",
    "Operations Income per Entry",
    "currency",
    both,
  ),
  v(
    "Operations Expenditure",
    "operations.expenditure_per_entry",
    "Operations Expenditure per Entry",
    "currency",
    both,
  ),
  ...[
    ["total_income", "Combined Income"],
    ["total_expense", "Combined Expense"],
    ["net_income", "Combined Net Income"],
    ["profit_margin", "Combined Profit Margin"],
    ["income_per_trip", "Combined Income per Trip"],
    ["expense_per_trip", "Combined Expense per Trip"],
    ["net_income_per_trip", "Combined Net Income per Trip"],
  ].map(([key, label]) =>
    v(
      "Combined Financials",
      `combined.${key}`,
      label,
      key === "profit_margin" ? "percentage" : "currency",
      both,
    ),
  ),
  ...[
    ["id", "Branch ID", "text"],
    ["name", "Branch Name", "text"],
    ["type", "Branch Type", "text"],
    ["email", "Branch Email", "text"],
    ["phone", "Branch Phone", "text"],
    ["open_trip_count", "Open Trips", "number"],
    ["closed_trip_count", "Closed Trips", "number"],
    ["total_trip_count", "Total Trips", "number"],
    ["manifest_count", "Manifests", "number"],
    ["total_weight_kg", "Weight (KG)", "number"],
    ["total_weight_tonnes", "Weight (Tonnes)", "number"],
    ["total_quantity", "Quantity", "number"],
    ["total_freight", "Freight", "currency"],
    ["total_loading", "Loading", "currency"],
    ["trip_other_income", "Trip Other Income", "currency"],
    ["trip_expense", "Trip Expense", "currency"],
    ["operations_income", "Operations Income", "currency"],
    ["operations_expenditure", "Operations Expenditure", "currency"],
    ["combined_income", "Combined Income", "currency"],
    ["combined_expense", "Combined Expense", "currency"],
    ["net_income", "Net Income", "currency"],
    ["profit_margin", "Profit Margin", "percentage"],
  ].map(([key, label, type]) =>
    v(
      "Branch",
      `branch.${key}`,
      label,
      type as SystemVariable["type"],
      key === "name" ? both : summary,
    ),
  ),
  ...[
    ["mode", "Period Mode", "text"],
    ["start_date", "Period Start", "date"],
    ["end_date", "Period End", "date"],
    ["day", "Day", "number"],
    ["week", "Week", "number"],
    ["month_number", "Month Number", "number"],
    ["month_name", "Month Name", "text"],
    ["quarter", "Quarter", "text"],
    ["calendar_year", "Calendar Year", "number"],
    ["financial_year", "Financial Year", "text"],
    ["label", "Period Label", "text"],
  ].map(([key, label, type]) =>
    v("Period", `period.${key}`, label, type as SystemVariable["type"], both),
  ),
  v("Period", "period.month", "Month", "text", [...both, ...manifest]),
  v("Period", "period.year", "Year", "number", [...both, ...manifest]),
  v("Summary", "summary.row_count", "Row Count", "number", ["branch"]),
  v("Summary", "summary.trip_count", "Distinct Trip Count", "number", ["branch"]),
  v("Summary", "summary.manifest_count", "Distinct Manifest Count", "number", ["branch"]),
  v("Period Summary", "summary.open_trip_count", "Total Open Trips", "number", [
    "monthly",
    "yearly",
  ]),
  v("Period Summary", "summary.closed_trip_count", "Total Closed Trips", "number", [
    "monthly",
    "yearly",
  ]),
  v("Period Summary", "summary.total_trip_count", "Total Trips", "number", ["monthly", "yearly"]),
  v("Period Summary", "summary.total_manifest_count", "Total Manifests", "number", [
    "monthly",
    "yearly",
  ]),
  v("Period Summary", "summary.total_weight_kg", "Total Weight (KG)", "number", [
    "monthly",
    "yearly",
  ]),
  v("Period Summary", "summary.total_quantity", "Total Quantity", "number", ["monthly", "yearly"]),
  v("Period Summary", "summary.total_freight", "Total Freight", "currency", ["monthly", "yearly"]),
  v("Period Summary", "summary.total_loading", "Total Loading", "currency", ["monthly", "yearly"]),
  v("Period Summary", "summary.total_other_income", "Total Other Income", "currency", [
    "monthly",
    "yearly",
  ]),
  v("Period Summary", "summary.total_income", "Total Income", "currency", ["monthly", "yearly"]),
  v("Period Summary", "summary.total_expense", "Total Expense", "currency", ["monthly", "yearly"]),
  v("Period Summary", "summary.net_income", "Net Income", "currency", ["monthly", "yearly"]),
  v("Period Summary", "summary.profit_margin", "Profit Margin", "percentage", [
    "monthly",
    "yearly",
  ]),
  v("Period Summary", "summary.average_income_per_trip", "Average Income per Trip", "currency", [
    "monthly",
    "yearly",
  ]),
  v("Period Summary", "summary.average_expense_per_trip", "Average Expense per Trip", "currency", [
    "monthly",
    "yearly",
  ]),
  v("Period Summary", "summary.average_weight_per_trip", "Average Weight per Trip", "number", [
    "monthly",
    "yearly",
  ]),
];

export const SYSTEM_VARIABLE_GROUPS = [...new Set(SYSTEM_VARIABLES.map((item) => item.group))];

export function dynamicFinancialVariables(
  incomeNames: string[],
  expenseNames: string[],
): SystemVariable[] {
  const slug = normalizeFinancialName;
  const unique = (names: string[]) =>
    [
      ...new Map(
        names.map((name) => [slug(name), name.trim()] as const).filter(([key]) => key),
      ).values(),
    ].sort((a, b) => a.localeCompare(b));
  return [
    ...unique(incomeNames).flatMap((name) => [
      v(
        "Open Trip Income by Name",
        `open.income.${slug(name)}`,
        `${name} — Open Trip`,
        "currency",
        open,
        `Total of all open-trip income lines named ${name}`,
      ),
      v(
        "Closed Trip Income by Name",
        `closed.income.${slug(name)}`,
        `${name} — Closed Trip`,
        "currency",
        closed,
        `Total of all closed-trip income lines named ${name}`,
      ),
      v(
        "Trip Income by Name",
        `trip.income.${slug(name)}`,
        `${name} — Any Trip`,
        "currency",
        both,
        `Total of all income lines named ${name}`,
      ),
      v(
        "Operations Income",
        `operations.income.${slug(name)}`,
        name,
        "currency",
        both,
        `Total standalone Operations Income named ${name}`,
      ),
    ]),
    ...unique(expenseNames).flatMap((name) => [
      v(
        "Open Trip Expense by Name",
        `open.expense.${slug(name)}`,
        `${name} — Open Trip`,
        "currency",
        open,
        `Total of all open-trip expense lines named ${name}`,
      ),
      v(
        "Closed Trip Expense by Name",
        `closed.expense.${slug(name)}`,
        `${name} — Closed Trip`,
        "currency",
        closed,
        `Total of all closed-trip expense lines named ${name}`,
      ),
      v(
        "Trip Expense by Name",
        `trip.expense.${slug(name)}`,
        `${name} — Any Trip`,
        "currency",
        both,
        `Total of all expense lines named ${name}`,
      ),
      v(
        "Operations Expenditure",
        `operations.expenditure.${slug(name)}`,
        name,
        "currency",
        both,
        `Total standalone Operations Expenditure named ${name}`,
      ),
    ]),
  ];
}

/** Case and punctuation insensitive identity used by discovery and aggregation. */
export function normalizeFinancialName(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

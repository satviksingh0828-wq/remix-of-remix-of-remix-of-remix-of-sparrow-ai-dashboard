export const ADMIN_ROUTES = ["/home", "/operations", "/masters", "/dashboard", "/reports", "/users", "/settings"] as const;
export const BASIC_ROUTES = ["/home", "/operations", "/masters"] as const;

export type CapabilityField = {
  label: string;
  type: "text" | "number" | "date" | "textarea" | "picker" | "dropdown" | "checkbox" | "switch" | "radio";
  required?: boolean;
  aliases?: string[];
  optionsSource?: string;
};

export type CapabilityModule = {
  route: string;
  adminOnly?: boolean;
  tabs?: { label: string; adminOnly?: boolean; openButton?: string; fields?: CapabilityField[] }[];
};

export const AI_CAPABILITY_MAP: CapabilityModule[] = [
  { route: "/home" },
  {
    route: "/operations",
    tabs: [
      { label: "Trip", openButton: "New trip" },
      { label: "Income", openButton: "New income", fields: [
        { label: "Income name", type: "text", required: true, aliases: ["income type", "name"] },
        { label: "Amount", type: "number", required: true },
        { label: "Date", type: "date", required: true },
        { label: "Note", type: "textarea", aliases: ["city", "location", "remarks"] },
        { label: "Branch (required)", type: "picker", required: true, optionsSource: "branches" },
        { label: "Vehicle", type: "picker", optionsSource: "vehicles" },
        { label: "Driver", type: "picker", optionsSource: "drivers" },
        { label: "Transporter", type: "picker", optionsSource: "transporters" },
      ] },
      { label: "Expenditure", openButton: "New expenditure", fields: [
        { label: "Expenditure name", type: "text", required: true, aliases: ["expense type", "type", "category", "expense name"] },
        { label: "Amount", type: "number", required: true },
        { label: "Date", type: "date", required: true },
        { label: "Note", type: "textarea", aliases: ["city", "location", "place", "remarks"] },
        { label: "Branch (required)", type: "picker", required: true, optionsSource: "branches" },
        { label: "Vehicle", type: "picker", optionsSource: "vehicles" },
        { label: "Driver", type: "picker", optionsSource: "drivers" },
        { label: "Transporter", type: "picker", optionsSource: "transporters" },
      ] },
      { label: "Driver Payroll" },
      { label: "Fixed Income", adminOnly: true },
      { label: "Trip Averages", adminOnly: true },
      { label: "EMI Scheduler", adminOnly: true },
      { label: "Yearly Expenses", adminOnly: true },
      { label: "Import Trips", adminOnly: true },
    ],
  },
  {
    route: "/masters",
    tabs: [
      { label: "Vehicle", adminOnly: true, openButton: "New vehicle" },
      { label: "Driver", openButton: "New driver", fields: [
        { label: "Driver Code", type: "text" }, { label: "Full Name", type: "text", required: true },
        { label: "Date of Birth", type: "date" }, { label: "Mobile Number", type: "text" },
        { label: "Driving Licence Number", type: "text" },
      ] },
      { label: "Transporter", openButton: "New transporter" },
      { label: "Locations", adminOnly: true, openButton: "New location" },
      { label: "Sources", adminOnly: true, openButton: "New source" },
    ],
  },
  { route: "/dashboard", adminOnly: true, tabs: ["Profit & Loss", "Vehicles", "Drivers", "Transporters", "Trips"].map((label) => ({ label })) },
  { route: "/reports", adminOnly: true, tabs: ["P&L Comparison", "Insurance Premium Ledger", "Road Tax Ledger", "Fastag Balance", "Vehicle Expenses", "Driver Expenses", "TRANSPORTER Expenses", "Other Expenses"].map((label) => ({ label })) },
  { route: "/users", adminOnly: true, tabs: ["Users", "Devices", "Activity Logs"].map((label) => ({ label })) },
  { route: "/settings", adminOnly: true, tabs: ["Company", "Branch", "Theme Settings"].map((label) => ({ label })) },
];

export function buildCapabilitySummary(role: string) {
  const isAdmin = role === "admin";
  return AI_CAPABILITY_MAP
    .filter((m) => isAdmin || !m.adminOnly)
    .map((m) => {
      const tabs = (m.tabs ?? []).filter((t) => isAdmin || !t.adminOnly);
      const tabText = tabs.length ? ` tabs: ${tabs.map((t) => `${t.label}${t.openButton ? ` (button: ${t.openButton})` : ""}`).join(", ")}` : "";
      const fields = tabs.flatMap((t) => (t.fields ?? []).map((f) => `${t.label}.${f.label}:${f.type}${f.required ? ":required" : ""}`));
      return `${m.route}${tabText}${fields.length ? ` fields: ${fields.join("; ")}` : ""}`;
    })
    .join("\n");
}

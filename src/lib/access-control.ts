import { createServerFn } from "@tanstack/react-start";
import { verifyAppToken } from "@/lib/user-auth";

export const ACCESS_ROLES = ["admin", "viewer", "basic"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];
export type AccessAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "close"
  | "reopen"
  | "import"
  | "export"
  | "manage";
export type BranchMode = "all" | "assigned" | "none";

export type AccessScope = {
  key: string;
  label: string;
  module: string;
  description: string;
  branchAware?: boolean;
  actions: AccessAction[];
};

const CRUD: AccessAction[] = ["read", "create", "update", "delete"];
const READ_EXPORT: AccessAction[] = ["read", "export"];

/** Complete permission catalogue. Keys are stable database identifiers. */
export const ACCESS_SCOPES: AccessScope[] = [
  {
    key: "operations.monthly_mis",
    module: "Operations",
    label: "Monthly MIS",
    description: "Monthly branch compliance forms",
    branchAware: true,
    actions: ["read", "create", "update", "approve", "reopen", "export"],
  },
  {
    key: "operations.trips",
    module: "Operations",
    label: "Trips",
    description: "Trips, manifests, income and expenses",
    branchAware: true,
    actions: [...CRUD, "close", "reopen", "export"],
  },
  {
    key: "operations.income",
    module: "Operations",
    label: "Other Income",
    description: "Branch-wise other income",
    branchAware: true,
    actions: [...CRUD, "export"],
  },
  {
    key: "operations.expenditure",
    module: "Operations",
    label: "Expenditure",
    description: "Branch-wise operational spending",
    branchAware: true,
    actions: [...CRUD, "export"],
  },
  {
    key: "operations.driver_payroll",
    module: "Operations",
    label: "Driver Payroll",
    description: "Driver salary, advances and deductions",
    branchAware: true,
    actions: [...CRUD, "approve", "export"],
  },
  {
    key: "operations.fixed_income",
    module: "Operations",
    label: "Fixed Income",
    description: "Recurring contract charges",
    branchAware: true,
    actions: [...CRUD],
  },
  {
    key: "operations.trip_averages",
    module: "Operations",
    label: "Trip Averages",
    description: "Monthly distribution analysis",
    branchAware: true,
    actions: READ_EXPORT,
  },
  {
    key: "operations.emi",
    module: "Operations",
    label: "EMI Scheduler",
    description: "Vehicle loan and EMI tracker",
    branchAware: true,
    actions: [...CRUD],
  },
  {
    key: "operations.yearly_expenses",
    module: "Operations",
    label: "Yearly Expenses",
    description: "Fixed yearly cost tracker",
    branchAware: true,
    actions: [...CRUD],
  },
  {
    key: "operations.import",
    module: "Operations",
    label: "Import Trips",
    description: "Bulk historical trip import",
    branchAware: true,
    actions: ["read", "import"],
  },
  {
    key: "masters.vehicles",
    module: "Masters",
    label: "Vehicles",
    description: "Fleet and specifications",
    branchAware: true,
    actions: CRUD,
  },
  {
    key: "masters.drivers",
    module: "Masters",
    label: "Drivers",
    description: "Driver records and documents",
    branchAware: true,
    actions: CRUD,
  },
  {
    key: "masters.transporters",
    module: "Masters",
    label: "Transporters",
    description: "Owners and brokers",
    branchAware: true,
    actions: CRUD,
  },
  {
    key: "masters.locations",
    module: "Masters",
    label: "Locations",
    description: "Pickup and drop locations",
    actions: CRUD,
  },
  {
    key: "masters.sources",
    module: "Masters",
    label: "Sources / Contracts",
    description: "Contract rates and slabs",
    branchAware: true,
    actions: CRUD,
  },
  {
    key: "hr.employees",
    module: "HRMS",
    label: "Employees",
    description: "Employee profiles and hierarchy",
    branchAware: true,
    actions: CRUD,
  },
  {
    key: "hr.departments",
    module: "HRMS",
    label: "Departments",
    description: "Departments and positions",
    actions: CRUD,
  },
  {
    key: "hr.attendance",
    module: "HRMS",
    label: "Attendance",
    description: "Marking and attendance history",
    branchAware: true,
    actions: [...CRUD, "approve", "export"],
  },
  {
    key: "hr.holidays",
    module: "HRMS",
    label: "Holidays",
    description: "Holiday calendar",
    actions: CRUD,
  },
  {
    key: "hr.payroll",
    module: "HRMS",
    label: "Payroll",
    description: "Salary generation, loans and deductions",
    branchAware: true,
    actions: [...CRUD, "approve", "export"],
  },
  ...[
    ["hr.employees.create", "Add Employee", CRUD],
    ["hr.departments.create", "Add Department", CRUD],
    ["hr.attendance.mark", "Mark Attendance", [...CRUD, "approve"]],
    ["hr.attendance.history", "Attendance History", READ_EXPORT],
    ["hr.attendance.automarker", "Attendance Automarker", ["read", "update", "manage"]],
    ["hr.payroll.generate", "Generate Payroll", [...CRUD, "approve"]],
    ["hr.payroll.pending", "Pending Payroll", [...CRUD, "approve"]],
    ["hr.payroll.history", "Payroll History", READ_EXPORT],
    ["hr.payroll.loans", "Employee Loans", CRUD],
    ["hr.payroll.advances", "Salary Advances", CRUD],
    ["hr.payroll.deductions", "Loss Deductions", CRUD],
    ["hr.payroll.ledger", "Payroll Ledger", READ_EXPORT],
  ].map(
    ([key, label, actions]) =>
      ({
        key: key as string,
        module: "HRMS",
        label: label as string,
        description: `${label} access`,
        branchAware: true,
        actions: actions as AccessAction[],
      }) satisfies AccessScope,
  ),
  {
    key: "reports.booking",
    module: "Reports",
    label: "Booking Report",
    description: "Branch booking and expense reporting",
    branchAware: true,
    actions: READ_EXPORT,
  },
  ...[
    ["reports.monthly_mis", "Monthly MIS"],
    ["reports.pnl_comparison", "P&L Comparison"],
    ["reports.insurance", "Insurance Premium Ledger"],
    ["reports.road_tax", "Road Tax Ledger"],
    ["reports.fastag", "Fastag Balance"],
    ["reports.vehicle_expenses", "Vehicle Expenses"],
    ["reports.driver_expenses", "Driver Expenses"],
    ["reports.transporter_expenses", "Transporter Expenses"],
    ["reports.transporter_advances", "Transporter Advances"],
    ["reports.other_expenses", "Other Expenses"],
  ].map(
    ([key, label]) =>
      ({
        key,
        module: "Reports",
        label,
        description: `${label} reporting and export`,
        branchAware: true,
        actions: READ_EXPORT,
      }) satisfies AccessScope,
  ),
  ...[
    ["dashboard.pnl", "Profit & Loss"],
    ["dashboard.vehicles", "Vehicle Dashboard"],
    ["dashboard.drivers", "Driver Dashboard"],
    ["dashboard.transporters", "Transporter Dashboard"],
    ["dashboard.trips", "Trip Dashboard"],
    ["dashboard.own_vs_transporter", "Own vs Transporter"],
    ["dashboard.employees", "Employee Dashboard"],
    ["dashboard.attendance", "Attendance Dashboard"],
    ["dashboard.payroll", "Payroll Dashboard"],
    ["dashboard.hierarchy", "Hierarchy Dashboard"],
  ].map(
    ([key, label]) =>
      ({
        key,
        module: "Dashboards",
        label,
        description: `${label} analytics`,
        branchAware: true,
        actions: READ_EXPORT,
      }) satisfies AccessScope,
  ),
  {
    key: "administration.users",
    module: "Administration",
    label: "Users",
    description: "Accounts, roles and branch assignments",
    actions: [...CRUD, "manage"],
  },
  {
    key: "administration.devices",
    module: "Administration",
    label: "Devices",
    description: "Passkey device approvals and assignments",
    actions: [...CRUD, "approve", "manage"],
  },
  {
    key: "administration.logs",
    module: "Administration",
    label: "Activity Logs",
    description: "Application audit history",
    actions: ["read", "delete", "export"],
  },
  {
    key: "settings.company",
    module: "Settings",
    label: "Company",
    description: "Company profile",
    actions: ["read", "update"],
  },
  {
    key: "settings.branches",
    module: "Settings",
    label: "Branches",
    description: "Branch configuration",
    actions: CRUD,
  },
  {
    key: "settings.appearance",
    module: "Settings",
    label: "Appearance",
    description: "Theme and login appearance",
    actions: ["read", "update"],
  },
  {
    key: "settings.passkeys",
    module: "Settings",
    label: "Passkey Security",
    description: "Universal device protection",
    actions: ["read", "update"],
  },
  {
    key: "settings.access_levels",
    module: "Settings",
    label: "Access Levels",
    description: "Role permission matrix",
    actions: ["read", "update", "manage"],
  },
  {
    key: "system.health",
    module: "System",
    label: "System Health",
    description: "Project, database and security health",
    actions: ["read", "manage"],
  },
  {
    key: "system.corrections",
    module: "System",
    label: "Data Corrections",
    description: "Repair and correction operations",
    actions: ["read", "update", "manage"],
  },
  {
    key: "system.errors",
    module: "System",
    label: "Error Panel",
    description: "Closed-trip timestamp inconsistencies",
    actions: ["read", "update", "manage"],
  },
  {
    key: "system.database",
    module: "System",
    label: "Database Stats",
    description: "PostgreSQL stats and storage",
    actions: ["read"],
  },
  {
    key: "system.security",
    module: "System",
    label: "Security",
    description: "Passkeys, sessions and failed logins",
    actions: ["read", "manage"],
  },
  {
    key: "system.project",
    module: "System",
    label: "Project Stats",
    description: "Supabase project and API information",
    actions: ["read"],
  },
  {
    key: "notifications",
    module: "System",
    label: "Notifications",
    description: "Operational alerts",
    branchAware: true,
    actions: ["read", "delete", "manage"],
  },
  {
    key: "assistant",
    module: "System",
    label: "ORCA AI",
    description: "AI assistant and actions",
    branchAware: true,
    actions: ["read", "manage"],
  },
];

export type PermissionMap = Record<string, Partial<Record<AccessAction, boolean>>>;
export type RoleAccess = { permissions: PermissionMap; branchModes: Record<string, BranchMode> };

export function canAccess(
  user: { role: AccessRole; permissions?: PermissionMap } | null | undefined,
  scopeKey: string,
  action: AccessAction = "read",
): boolean {
  if (!user) return false;
  const configured = user.permissions?.[scopeKey]?.[action];
  if (typeof configured === "boolean") return configured;
  // Backward-compatible fallback while the SQL has not yet been installed or
  // for a session created before installation. This exactly retains the old roles.
  if (user.role === "admin") return true;
  if (user.role === "viewer") {
    return (
      ["read", "export"].includes(action) &&
      ((scopeKey.startsWith("operations.") &&
        !["operations.monthly_mis", "operations.import"].includes(scopeKey)) ||
        [
          "masters.vehicles",
          "masters.drivers",
          "masters.transporters",
          "masters.locations",
        ].includes(scopeKey) ||
        scopeKey.startsWith("hr.") ||
        [
          "dashboard.hr",
          "dashboard.employees",
          "dashboard.attendance",
          "dashboard.payroll",
          "dashboard.hierarchy",
        ].includes(scopeKey) ||
        (scopeKey.startsWith("reports.") && scopeKey !== "reports.pnl_comparison") ||
        scopeKey === "notifications")
    );
  }
  return [
    "operations.monthly_mis",
    "operations.trips",
    "operations.income",
    "operations.expenditure",
    "operations.driver_payroll",
    "reports.booking",
    "masters.drivers",
    "masters.transporters",
  ].includes(scopeKey);
}

export const serverGetAccessMatrix = createServerFn({ method: "POST" })
  .validator((token: string) => token)
  .handler(async ({ data: token }): Promise<Record<AccessRole, RoleAccess>> => {
    const auth = await verifyAppToken(token);
    if (!auth || auth.role !== "admin") throw new Error("Admin access required.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("role_permissions")
      .select("role, scope_key, action, allowed, branch_mode");
    if (error) throw new Error(error.message);
    const result = Object.fromEntries(
      ACCESS_ROLES.map((role) => [role, { permissions: {}, branchModes: {} }]),
    ) as Record<AccessRole, RoleAccess>;
    for (const row of data ?? []) {
      const role = row.role as AccessRole;
      if (!ACCESS_ROLES.includes(role)) continue;
      result[role].permissions[row.scope_key] ??= {};
      result[role].permissions[row.scope_key][row.action as AccessAction] = row.allowed;
      result[role].branchModes[row.scope_key] = row.branch_mode as BranchMode;
    }
    return result;
  });

export const serverSaveAccessMatrix = createServerFn({ method: "POST" })
  .validator(
    (input: {
      token: string;
      role: AccessRole;
      scopeKey: string;
      action: AccessAction;
      allowed: boolean;
      branchMode: BranchMode;
    }) => input,
  )
  .handler(async ({ data }) => {
    const auth = await verifyAppToken(data.token);
    if (!auth || auth.role !== "admin") throw new Error("Admin access required.");
    const scope = ACCESS_SCOPES.find((item) => item.key === data.scopeKey);
    if (!scope || !scope.actions.includes(data.action))
      throw new Error("Unknown access scope or action.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("role_permissions").upsert(
      {
        role: data.role,
        scope_key: data.scopeKey,
        action: data.action,
        allowed: data.allowed,
        branch_mode: scope.branchAware ? data.branchMode : "none",
        updated_by: auth.uid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "role,scope_key,action" },
    );
    if (error) throw new Error(error.message);
    if (scope.branchAware) {
      const { error: branchError } = await supabaseAdmin
        .from("role_permissions")
        .update({
          branch_mode: data.branchMode,
          updated_by: auth.uid,
          updated_at: new Date().toISOString(),
        })
        .eq("role", data.role)
        .eq("scope_key", data.scopeKey);
      if (branchError) throw new Error(branchError.message);
    }
    await supabaseAdmin.from("permission_change_logs").insert({
      changed_by: auth.uid,
      target_role: data.role,
      scope_key: data.scopeKey,
      action: data.action,
      allowed: data.allowed,
      branch_mode: scope.branchAware ? data.branchMode : "none",
    });
    return { ok: true };
  });

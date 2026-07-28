/**
 * pnl.ts — Profit & Loss data fetching and computation helpers.
 * Server functions fetch raw data; client helpers compute metrics.
 */

import { createServerFn } from "@tanstack/react-start";
import { num } from "./trip-calc";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PnLClosedTrip = {
  id: string;
  trip_code: string;
  branch_id: string | null;
  branch_name: string;
  vehicle_id: string | null;
  driver_id: string | null;
  transporter_id: string | null;
  total_income: number;
  total_expense: number;
  net_income: number;
  closed_at: string;
};

export type TripAveragesRow = {
  id: string;
  trip_code: string;
  branch_id: string | null;
  branch_name: string;
  total_income: number;
  total_expense: number;
  net_income: number;
  total_weight: number;
  total_quantity: number;
  closed_at: string;
};

export type TripAveragesData = {
  trips: TripAveragesRow[];
  otherIncome: number;
  totalExpenditure: number;
  fixedIncome: number;
  otherNetPnL: number;
  year: number;
  month: number;
};

export type PnLIncomeRow = {
  id: string;
  branch_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  transporter_id: string | null;
  amount: string;
  entry_date: string;
};

export type PnLExpenditureRow = {
  id: string;
  branch_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  transporter_id: string | null;
  amount: string;
  entry_date: string;
};

export type PnLContractRow = {
  id: string;
  contract_name: string;
  fixed_monthly_charge: number;
  fixed_yearly_charge: number;
  fixed_monthly_charge_note: string;
  fixed_yearly_charge_note: string;
};

export type PnLBranch = {
  id: string;
  branch_name: string;
};

export type PnLVehicle = {
  id: string;
  label: string; // registration_number + nickname
  registration_number: string;
};

export type PnLDriver = {
  id: string;
  label: string; // full_name + driver_code
  full_name: string;
};

export type PnLTransporter = {
  id: string;
  label: string; // transporter_name
};

export type PnLRawData = {
  closedTrips: PnLClosedTrip[];
  incomes: PnLIncomeRow[];
  expenditures: PnLExpenditureRow[];
  contracts: PnLContractRow[];
  branches: PnLBranch[];
  vehicles: PnLVehicle[];
  drivers: PnLDriver[];
  transporters: PnLTransporter[];
  year: number;
};

export type PnLStats = {
  tripIncome: number;
  tripExpense: number;
  tripGrossProfit: number;
  otherIncome: number;
  fixedIncome: number;
  totalExpenditure: number;
  totalIncome: number;
  totalExpense: number;
  netPnL: number;
  tripCount: number;
};

export type EntityKind = "vehicle" | "driver" | "transporter";
export type PeriodSpec = { year: number; month?: number };

// ── Helpers ────────────────────────────────────────────────────────────────────

function mapTrip(r: Record<string, unknown>): PnLClosedTrip {
  return {
    id: r.id as string,
    trip_code: String(r.trip_code ?? ""),
    branch_id: (r.branch_id as string) ?? null,
    branch_name: String(r.branch_name ?? ""),
    vehicle_id: (r.vehicle_id as string) ?? null,
    driver_id: (r.driver_id as string) ?? null,
    transporter_id: (r.transporter_id as string) ?? null,
    total_income: Number(r.total_income ?? 0),
    total_expense: Number(r.total_expense ?? 0),
    net_income: Number(r.net_income ?? 0),
    closed_at: r.closed_at as string,
  };
}

function extractWeightQty(snapshot: unknown): { weight: number; quantity: number } {
  try {
    const s = snapshot as Record<string, unknown>;
    const manifests = (s?.manifests as Record<string, unknown>[]) ?? [];
    let weight = 0;
    let quantity = 0;
    for (const m of manifests) {
      weight += Number(m.weight_kg ?? 0);
      quantity += Number(m.quantity ?? 0);
    }
    return { weight, quantity };
  } catch {
    return { weight: 0, quantity: 0 };
  }
}

function mapIncome(r: Record<string, unknown>): PnLIncomeRow {
  return {
    id: r.id as string,
    branch_id: (r.branch_id as string) ?? null,
    vehicle_id: (r.vehicle_id as string) ?? null,
    driver_id: (r.driver_id as string) ?? null,
    transporter_id: (r.transporter_id as string) ?? null,
    amount: String(r.amount ?? "0"),
    entry_date: String(r.entry_date ?? ""),
  };
}

function mapExpenditure(r: Record<string, unknown>): PnLExpenditureRow {
  return {
    id: r.id as string,
    branch_id: (r.branch_id as string) ?? null,
    vehicle_id: (r.vehicle_id as string) ?? null,
    driver_id: (r.driver_id as string) ?? null,
    transporter_id: (r.transporter_id as string) ?? null,
    amount: String(r.amount ?? "0"),
    entry_date: String(r.entry_date ?? ""),
  };
}

function mapContract(c: Record<string, unknown>): PnLContractRow {
  return {
    id: c.id as string,
    contract_name: String(c.contract_name ?? ""),
    fixed_monthly_charge: Number(c.fixed_monthly_charge ?? 0),
    fixed_yearly_charge: Number(c.fixed_yearly_charge ?? 0),
    fixed_monthly_charge_note: String(c.fixed_monthly_charge_note ?? ""),
    fixed_yearly_charge_note: String(c.fixed_yearly_charge_note ?? ""),
  };
}

// ── Server functions ───────────────────────────────────────────────────────────

export const serverFetchPnLYear = createServerFn({ method: "POST" })
  .validator((input: { year: number }) => input)
  .handler(async ({ data }): Promise<PnLRawData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const y = data.year;
    const start = `${y}-01-01`;
    const end = `${y + 1}-01-01`;

    const [tripsRes, incomesRes, expendituresRes, contractsRes, branchesRes, vehiclesRes, driversRes, transportersRes] =
      await Promise.all([
        db.from("closed_trips")
          .select("id,trip_code,branch_id,branch_name,vehicle_id,driver_id,transporter_id,total_income,total_expense,net_income,closed_at")
          .gte("closed_at", start)
          .lt("closed_at", end),
        db.from("incomes")
          .select("id,branch_id,vehicle_id,driver_id,transporter_id,amount,entry_date")
          .gte("entry_date", start)
          .lt("entry_date", end),
        db.from("expenditures")
          .select("id,branch_id,vehicle_id,driver_id,transporter_id,amount,entry_date")
          .gte("entry_date", start)
          .lt("entry_date", end),
        db.from("contracts")
          .select("id,contract_name,fixed_monthly_charge,fixed_yearly_charge,fixed_monthly_charge_note,fixed_yearly_charge_note"),
        db.from("branches").select("id,branch_name"),
        db.from("vehicles").select("id,registration_number,nickname").order("registration_number"),
        db.from("drivers").select("id,full_name,driver_code").order("full_name"),
        db.from("transporters").select("id,transporter_name").order("transporter_name"),
      ]);

    return {
      closedTrips: (tripsRes.data ?? []).map(mapTrip),
      incomes: (incomesRes.data ?? []).map(mapIncome),
      expenditures: (expendituresRes.data ?? []).map(mapExpenditure),
      contracts: (contractsRes.data ?? []).map(mapContract),
      branches: (branchesRes.data ?? []).map((b: Record<string, unknown>) => ({ id: b.id as string, branch_name: String(b.branch_name ?? "") })),
      vehicles: (vehiclesRes.data ?? []).map((v: Record<string, unknown>) => ({
        id: v.id as string,
        registration_number: String(v.registration_number ?? ""),
        label: [v.registration_number, v.nickname].filter(Boolean).join(" — "),
      })),
      drivers: (driversRes.data ?? []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        full_name: String(d.full_name ?? ""),
        label: [d.full_name, d.driver_code].filter(Boolean).join(" (") + (d.driver_code ? ")" : ""),
      })),
      transporters: (transportersRes.data ?? []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        label: String(t.transporter_name ?? ""),
      })),
      year: y,
    };
  });

export const serverFetchPnLPeriod = createServerFn({ method: "POST" })
  .validator((input: { period: PeriodSpec }) => input)
  .handler(async ({ data }): Promise<PnLRawData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const { year, month } = data.period;
    let start: string;
    let end: string;

    if (month !== undefined) {
      const m = String(month).padStart(2, "0");
      start = `${year}-${m}-01`;
      end = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    } else {
      start = `${year}-01-01`;
      end = `${year + 1}-01-01`;
    }

    const months = month !== undefined ? 1 : 12;

    const [tripsRes, incomesRes, expendituresRes, contractsRes, branchesRes, vehiclesRes, driversRes, transportersRes] =
      await Promise.all([
        db.from("closed_trips")
          .select("id,trip_code,branch_id,branch_name,vehicle_id,driver_id,transporter_id,total_income,total_expense,net_income,closed_at")
          .gte("closed_at", start)
          .lt("closed_at", end),
        db.from("incomes")
          .select("id,branch_id,vehicle_id,driver_id,transporter_id,amount,entry_date")
          .gte("entry_date", start)
          .lt("entry_date", end),
        db.from("expenditures")
          .select("id,branch_id,vehicle_id,driver_id,transporter_id,amount,entry_date")
          .gte("entry_date", start)
          .lt("entry_date", end),
        db.from("contracts")
          .select("id,contract_name,fixed_monthly_charge,fixed_yearly_charge,fixed_monthly_charge_note,fixed_yearly_charge_note"),
        db.from("branches").select("id,branch_name"),
        db.from("vehicles").select("id,registration_number,nickname").order("registration_number"),
        db.from("drivers").select("id,full_name,driver_code").order("full_name"),
        db.from("transporters").select("id,transporter_name").order("transporter_name"),
      ]);

    return {
      closedTrips: (tripsRes.data ?? []).map(mapTrip),
      incomes: (incomesRes.data ?? []).map(mapIncome),
      expenditures: (expendituresRes.data ?? []).map(mapExpenditure),
      contracts: (contractsRes.data ?? []).map((c: Record<string, unknown>) => ({
        ...mapContract(c),
        // Normalize to per-month equivalent for the period
        fixed_monthly_charge: Number(c.fixed_monthly_charge ?? 0) * months,
        fixed_yearly_charge: (Number(c.fixed_yearly_charge ?? 0) / 12) * months,
      })),
      branches: (branchesRes.data ?? []).map((b: Record<string, unknown>) => ({ id: b.id as string, branch_name: String(b.branch_name ?? "") })),
      vehicles: (vehiclesRes.data ?? []).map((v: Record<string, unknown>) => ({
        id: v.id as string,
        registration_number: String(v.registration_number ?? ""),
        label: [v.registration_number, v.nickname].filter(Boolean).join(" — "),
      })),
      drivers: (driversRes.data ?? []).map((d: Record<string, unknown>) => ({
        id: d.id as string,
        full_name: String(d.full_name ?? ""),
        label: [d.full_name, d.driver_code].filter(Boolean).join(" (") + (d.driver_code ? ")" : ""),
      })),
      transporters: (transportersRes.data ?? []).map((t: Record<string, unknown>) => ({
        id: t.id as string,
        label: String(t.transporter_name ?? ""),
      })),
      year,
    };
  });

export const serverFetchTripAverages = createServerFn({ method: "POST" })
  .validator((input: { year: number; month: number }) => input)
  .handler(async ({ data }): Promise<TripAveragesData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const { year, month } = data;
    const m = String(month).padStart(2, "0");
    const start = `${year}-${m}-01`;
    const end = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const [tripsRes, incomesRes, expendituresRes, contractsRes] = await Promise.all([
      db.from("closed_trips")
        .select("id,trip_code,branch_id,branch_name,total_income,total_expense,net_income,closed_at,snapshot")
        .gte("closed_at", start)
        .lt("closed_at", end)
        .order("closed_at"),
      db.from("incomes")
        .select("amount,entry_date")
        .gte("entry_date", start)
        .lt("entry_date", end),
      db.from("expenditures")
        .select("amount,entry_date")
        .gte("entry_date", start)
        .lt("entry_date", end),
      db.from("contracts")
        .select("fixed_monthly_charge,fixed_yearly_charge"),
    ]);

    const trips: TripAveragesRow[] = (tripsRes.data ?? []).map((r: Record<string, unknown>) => {
      const { weight, quantity } = extractWeightQty(r.snapshot);
      return {
        id: r.id as string,
        trip_code: String(r.trip_code ?? ""),
        branch_id: (r.branch_id as string) ?? null,
        branch_name: String(r.branch_name ?? ""),
        total_income: Number(r.total_income ?? 0),
        total_expense: Number(r.total_expense ?? 0),
        net_income: Number(r.net_income ?? 0),
        total_weight: weight,
        total_quantity: quantity,
        closed_at: r.closed_at as string,
      };
    });

    const otherIncome = (incomesRes.data ?? []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.amount ?? 0), 0);
    const totalExpenditure = (expendituresRes.data ?? []).reduce((s: number, r: Record<string, unknown>) => s + Number(r.amount ?? 0), 0);
    const fixedIncome = (contractsRes.data ?? []).reduce((s: number, c: Record<string, unknown>) => {
      return s + Number(c.fixed_monthly_charge ?? 0) + Number(c.fixed_yearly_charge ?? 0) / 12;
    }, 0);
    const otherNetPnL = otherIncome + fixedIncome - totalExpenditure;

    return { trips, otherIncome, totalExpenditure, fixedIncome, otherNetPnL, year, month };
  });

// ── Client-side computation helpers ───────────────────────────────────────────

/** Filter trips/income/expenditure by branch. */
export function computePnL(data: PnLRawData, branchId: string | null): PnLStats {
  const filterBranch = <T extends { branch_id: string | null }>(arr: T[]) =>
    branchId ? arr.filter((r) => r.branch_id === branchId) : arr;

  const trips = filterBranch(data.closedTrips);
  const incomes = filterBranch(data.incomes);
  const expenditures = filterBranch(data.expenditures);

  const tripIncome = trips.reduce((s, t) => s + t.total_income, 0);
  const tripExpense = trips.reduce((s, t) => s + t.total_expense, 0);
  const tripGrossProfit = tripIncome - tripExpense;
  const otherIncome = incomes.reduce((s, r) => s + num(r.amount), 0);
  const totalExpenditure = expenditures.reduce((s, r) => s + num(r.amount), 0);

  const numBranches = Math.max(data.branches.length, 1);
  const fixedIncome = data.contracts.reduce((s, c) => {
    const monthly = c.fixed_monthly_charge;
    const yearlyMonthly = c.fixed_yearly_charge / 12;
    const total = monthly + yearlyMonthly;
    return s + (branchId ? total / numBranches : total);
  }, 0);

  const totalIncome = tripIncome + otherIncome + fixedIncome;
  const totalExpense = tripExpense + totalExpenditure;
  const netPnL = totalIncome - totalExpense;

  return { tripIncome, tripExpense, tripGrossProfit, otherIncome, fixedIncome, totalExpenditure, totalIncome, totalExpense, netPnL, tripCount: trips.length };
}

/** Filter trips/income/expenditure by a specific entity (vehicle/driver/transporter).
 *  entityId=null means all entities combined. Fixed income is excluded from entity views. */
export function computePnLForEntity(data: PnLRawData, kind: EntityKind, entityId: string | null): PnLStats {
  const field = kind === "vehicle" ? "vehicle_id" : kind === "driver" ? "driver_id" : "transporter_id";

  const filterEntity = <T extends { vehicle_id: string | null; driver_id: string | null; transporter_id: string | null }>(arr: T[]) =>
    entityId ? arr.filter((r) => r[field] === entityId) : arr;

  const trips = filterEntity(data.closedTrips);
  const incomes = filterEntity(data.incomes);
  const expenditures = filterEntity(data.expenditures);

  const tripIncome = trips.reduce((s, t) => s + t.total_income, 0);
  const tripExpense = trips.reduce((s, t) => s + t.total_expense, 0);
  const tripGrossProfit = tripIncome - tripExpense;
  const otherIncome = incomes.reduce((s, r) => s + num(r.amount), 0);
  const totalExpenditure = expenditures.reduce((s, r) => s + num(r.amount), 0);

  const totalIncome = tripIncome + otherIncome; // no fixed income per entity
  const totalExpense = tripExpense + totalExpenditure;
  const netPnL = totalIncome - totalExpense;

  return { tripIncome, tripExpense, tripGrossProfit, otherIncome, fixedIncome: 0, totalExpenditure, totalIncome, totalExpense, netPnL, tripCount: trips.length };
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Compute monthly P&L for a branch view (full-year dataset). */
export function computeMonthlyPnL(
  data: PnLRawData,
  branchId: string | null,
): Array<{ month: string; tripIncome: number; otherIncome: number; fixedIncome: number; expenditures: number; netPnL: number }> {
  const numBranches = Math.max(data.branches.length, 1);
  const perMonthFixed = data.contracts.reduce((s, c) => {
    const monthly = c.fixed_monthly_charge;
    const yearlyMonthly = c.fixed_yearly_charge / 12;
    const total = monthly + yearlyMonthly;
    return s + (branchId ? total / numBranches : total);
  }, 0);

  return SHORT_MONTHS.map((m, idx) => {
    const monthStr = `${data.year}-${String(idx + 1).padStart(2, "0")}`;

    const trips = data.closedTrips.filter(
      (t) => (!branchId || t.branch_id === branchId) && t.closed_at.startsWith(monthStr),
    );
    const incomes = data.incomes.filter(
      (r) => (!branchId || r.branch_id === branchId) && r.entry_date.startsWith(monthStr),
    );
    const expenditures = data.expenditures.filter(
      (r) => (!branchId || r.branch_id === branchId) && r.entry_date.startsWith(monthStr),
    );

    const tripIncome = trips.reduce((s, t) => s + t.total_income, 0);
    const tripExpense = trips.reduce((s, t) => s + t.total_expense, 0);
    const otherIncome = incomes.reduce((s, r) => s + num(r.amount), 0);
    const totalExpenditure = expenditures.reduce((s, r) => s + num(r.amount), 0);
    const fixedIncome = perMonthFixed;
    const netPnL = tripIncome + otherIncome + fixedIncome - tripExpense - totalExpenditure;

    return { month: m, tripIncome, otherIncome, fixedIncome, expenditures: tripExpense + totalExpenditure, netPnL };
  });
}

/** Compute monthly P&L filtered by entity (no fixed income). */
export function computeMonthlyPnLForEntity(
  data: PnLRawData,
  kind: EntityKind,
  entityId: string | null,
): Array<{ month: string; tripIncome: number; otherIncome: number; expenditures: number; netPnL: number }> {
  const field = kind === "vehicle" ? "vehicle_id" : kind === "driver" ? "driver_id" : "transporter_id";

  return SHORT_MONTHS.map((m, idx) => {
    const monthStr = `${data.year}-${String(idx + 1).padStart(2, "0")}`;

    const filter = (r: Record<string, unknown>) =>
      (!entityId || r[field] === entityId) && String(r.closed_at ?? r.entry_date ?? "").startsWith(monthStr);

    const trips = data.closedTrips.filter(
      (t) => (!entityId || t[field as keyof typeof t] === entityId) && t.closed_at.startsWith(monthStr),
    );
    const incomes = data.incomes.filter(
      (r) => (!entityId || r[field as keyof typeof r] === entityId) && r.entry_date.startsWith(monthStr),
    );
    const expenditures = data.expenditures.filter(
      (r) => (!entityId || r[field as keyof typeof r] === entityId) && r.entry_date.startsWith(monthStr),
    );

    const tripIncome = trips.reduce((s, t) => s + t.total_income, 0);
    const tripExpense = trips.reduce((s, t) => s + t.total_expense, 0);
    const otherIncome = incomes.reduce((s, r) => s + num(r.amount), 0);
    const totalExpenditure = expenditures.reduce((s, r) => s + num(r.amount), 0);
    const netPnL = tripIncome + otherIncome - tripExpense - totalExpenditure;

    return { month: m, tripIncome, otherIncome, expenditures: tripExpense + totalExpenditure, netPnL };
  });
}

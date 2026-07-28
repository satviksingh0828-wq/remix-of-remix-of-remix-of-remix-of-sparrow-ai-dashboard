/**
 * pnl.ts — Profit & Loss data fetching and computation helpers.
 * Server functions fetch raw data; client helpers compute metrics.
 */

import { createServerFn } from "@tanstack/react-start";
import { num } from "./trip-calc";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PnLClosedTrip = {
  id: string;
  branch_id: string | null;
  total_income: number;
  total_expense: number;
  net_income: number;
  closed_at: string;
};

export type PnLIncomeRow = {
  id: string;
  branch_id: string | null;
  amount: string;
  entry_date: string;
};

export type PnLExpenditureRow = {
  id: string;
  branch_id: string | null;
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

export type PnLRawData = {
  closedTrips: PnLClosedTrip[];
  incomes: PnLIncomeRow[];
  expenditures: PnLExpenditureRow[];
  contracts: PnLContractRow[];
  branches: PnLBranch[];
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

export type PeriodSpec = { year: number; month?: number }; // month = 1-12 or undefined for full year

// ── Server functions ───────────────────────────────────────────────────────────

export const serverFetchPnLYear = createServerFn({ method: "POST" })
  .validator((input: { year: number }) => input)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }): Promise<PnLRawData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const y = data.year;
    const start = `${y}-01-01`;
    const end = `${y + 1}-01-01`;

    const [tripsRes, incomesRes, expendituresRes, contractsRes, branchesRes] = await Promise.all([
      db.from("closed_trips")
        .select("id,branch_id,total_income,total_expense,net_income,closed_at")
        .gte("closed_at", start)
        .lt("closed_at", end),
      db.from("incomes")
        .select("id,branch_id,amount,entry_date")
        .gte("entry_date", start)
        .lt("entry_date", end),
      db.from("expenditures")
        .select("id,branch_id,amount,entry_date")
        .gte("entry_date", start)
        .lt("entry_date", end),
      db.from("contracts")
        .select("id,contract_name,fixed_monthly_charge,fixed_yearly_charge,fixed_monthly_charge_note,fixed_yearly_charge_note"),
      db.from("branches").select("id,branch_name"),
    ]);

    return {
      closedTrips: (tripsRes.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        branch_id: (r.branch_id as string) ?? null,
        total_income: Number(r.total_income ?? 0),
        total_expense: Number(r.total_expense ?? 0),
        net_income: Number(r.net_income ?? 0),
        closed_at: r.closed_at as string,
      })),
      incomes: (incomesRes.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        branch_id: (r.branch_id as string) ?? null,
        amount: String(r.amount ?? "0"),
        entry_date: String(r.entry_date ?? ""),
      })),
      expenditures: (expendituresRes.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        branch_id: (r.branch_id as string) ?? null,
        amount: String(r.amount ?? "0"),
        entry_date: String(r.entry_date ?? ""),
      })),
      contracts: (contractsRes.data ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        contract_name: String(c.contract_name ?? ""),
        fixed_monthly_charge: Number(c.fixed_monthly_charge ?? 0),
        fixed_yearly_charge: Number(c.fixed_yearly_charge ?? 0),
        fixed_monthly_charge_note: String(c.fixed_monthly_charge_note ?? ""),
        fixed_yearly_charge_note: String(c.fixed_yearly_charge_note ?? ""),
      })),
      branches: (branchesRes.data ?? []).map((b: Record<string, unknown>) => ({
        id: b.id as string,
        branch_name: String(b.branch_name ?? ""),
      })),
      year: y,
    };
  });

export const serverFetchPnLPeriod = createServerFn({ method: "POST" })
  .validator((input: { period: PeriodSpec }) => input)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      end =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;
    } else {
      start = `${year}-01-01`;
      end = `${year + 1}-01-01`;
    }

    const [tripsRes, incomesRes, expendituresRes, contractsRes, branchesRes] = await Promise.all([
      db.from("closed_trips")
        .select("id,branch_id,total_income,total_expense,net_income,closed_at")
        .gte("closed_at", start)
        .lt("closed_at", end),
      db.from("incomes")
        .select("id,branch_id,amount,entry_date")
        .gte("entry_date", start)
        .lt("entry_date", end),
      db.from("expenditures")
        .select("id,branch_id,amount,entry_date")
        .gte("entry_date", start)
        .lt("entry_date", end),
      db.from("contracts")
        .select("id,contract_name,fixed_monthly_charge,fixed_yearly_charge,fixed_monthly_charge_note,fixed_yearly_charge_note"),
      db.from("branches").select("id,branch_name"),
    ]);

    const months = month !== undefined ? 1 : 12;

    return {
      closedTrips: (tripsRes.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        branch_id: (r.branch_id as string) ?? null,
        total_income: Number(r.total_income ?? 0),
        total_expense: Number(r.total_expense ?? 0),
        net_income: Number(r.net_income ?? 0),
        closed_at: r.closed_at as string,
      })),
      incomes: (incomesRes.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        branch_id: (r.branch_id as string) ?? null,
        amount: String(r.amount ?? "0"),
        entry_date: String(r.entry_date ?? ""),
      })),
      expenditures: (expendituresRes.data ?? []).map((r: Record<string, unknown>) => ({
        id: r.id as string,
        branch_id: (r.branch_id as string) ?? null,
        amount: String(r.amount ?? "0"),
        entry_date: String(r.entry_date ?? ""),
      })),
      contracts: (contractsRes.data ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        contract_name: String(c.contract_name ?? ""),
        // Normalize to per-month equivalent for the period
        fixed_monthly_charge: Number(c.fixed_monthly_charge ?? 0) * months,
        fixed_yearly_charge: (Number(c.fixed_yearly_charge ?? 0) / 12) * months,
        fixed_monthly_charge_note: String(c.fixed_monthly_charge_note ?? ""),
        fixed_yearly_charge_note: String(c.fixed_yearly_charge_note ?? ""),
      })),
      branches: (branchesRes.data ?? []).map((b: Record<string, unknown>) => ({
        id: b.id as string,
        branch_name: String(b.branch_name ?? ""),
      })),
      year,
    };
  });

// ── Client-side computation helpers ───────────────────────────────────────────

/** Compute P&L for a given dataset, optionally filtered by branch. */
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

  return {
    tripIncome,
    tripExpense,
    tripGrossProfit,
    otherIncome,
    fixedIncome,
    totalExpenditure,
    totalIncome,
    totalExpense,
    netPnL,
    tripCount: trips.length,
  };
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Compute monthly P&L breakdown for a full-year dataset. */
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

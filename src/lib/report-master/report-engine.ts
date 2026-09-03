import type { PeriodMode, ReportScope } from "./system-variables.ts";
import { normalizeFinancialName } from "./system-variables.ts";

export type DataRow = Record<string, unknown>;
export type PeriodSelection = {
  mode: PeriodMode;
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
};
export type DateRange = { start: string | null; end: string | null; label: string };
export type OperationsSummary = {
  incomeCount: number;
  incomeTotal: number;
  receivedTotal: number;
  outstandingTotal: number;
  expenditureCount: number;
  expenditureTotal: number;
  paidTotal: number;
  unpaidTotal: number;
  incomeAverage: number;
  incomeMinimum: number;
  incomeMaximum: number;
  expenditureAverage: number;
  expenditureMinimum: number;
  expenditureMaximum: number;
  netIncome: number;
  profitMargin: number;
  namedIncome: Record<string, number>;
  namedExpenditure: Record<string, number>;
};

const amount = (value: unknown) => Number(String(value ?? 0).replace(/,/g, "")) || 0;
const iso = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

/** Returns an inclusive start/exclusive end range. Custom end dates include the whole selected day. */
export function periodRange(selection: PeriodSelection): DateRange {
  const year = selection.year;
  if (selection.mode === "all") return { start: null, end: null, label: "All Dates" };
  if (selection.mode === "month") {
    if (!year || !selection.month || selection.month < 1 || selection.month > 12)
      throw new Error("Month mode requires a valid month and year.");
    const start = new Date(Date.UTC(year, selection.month - 1, 1));
    const end = new Date(Date.UTC(year, selection.month, 1));
    return {
      start: iso(start),
      end: iso(end),
      label: start.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  }
  if (selection.mode === "year" || selection.mode === "financial_year") {
    if (!year)
      throw new Error(
        `${selection.mode === "year" ? "Calendar Year" : "Financial Year"} mode requires a year.`,
      );
    const month = selection.mode === "financial_year" ? 3 : 0;
    return {
      start: iso(new Date(Date.UTC(year, month, 1))),
      end: iso(new Date(Date.UTC(year + 1, month, 1))),
      label: selection.mode === "year" ? String(year) : `FY ${year}-${String(year + 1).slice(-2)}`,
    };
  }
  if (!selection.startDate || !selection.endDate)
    throw new Error("Custom Date Range requires start and end dates.");
  if (selection.endDate < selection.startDate)
    throw new Error("End date must be on or after start date.");
  const end = new Date(`${selection.endDate}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return {
    start: selection.startDate,
    end: iso(end),
    label: `${selection.startDate} – ${selection.endDate}`,
  };
}

export function isInPeriod(value: unknown, range: DateRange): boolean {
  if (!range.start) return true;
  const date = String(value ?? "").slice(0, 10);
  return Boolean(date && date >= range.start && (!range.end || date < range.end));
}

export function filterAuthorized<T extends DataRow>(
  rows: T[],
  accessibleBranchIds: Iterable<string>,
): T[] {
  const allowed = new Set(accessibleBranchIds);
  return rows.filter((row) => typeof row.branch_id === "string" && allowed.has(row.branch_id));
}

export function aggregateOperations(
  incomes: DataRow[],
  expenditures: DataRow[],
): OperationsSummary {
  const incomeAmounts = incomes.map((row) => amount(row.amount));
  const expenditureAmounts = expenditures.map((row) => amount(row.amount));
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const byName = (rows: DataRow[]) =>
    rows.reduce<Record<string, number>>((out, row) => {
      const key = normalizeFinancialName(String(row.income_name ?? row.expenditure_name ?? ""));
      if (key) out[key] = (out[key] ?? 0) + amount(row.amount);
      return out;
    }, {});
  const incomeTotal = sum(incomeAmounts),
    expenditureTotal = sum(expenditureAmounts);
  const receivedTotal = sum(
    incomes.filter((row) => row.is_received === true).map((row) => amount(row.amount)),
  );
  const paidTotal = sum(
    expenditures.filter((row) => row.is_paid === true).map((row) => amount(row.amount)),
  );
  return {
    incomeCount: incomes.length,
    incomeTotal,
    receivedTotal,
    outstandingTotal: incomeTotal - receivedTotal,
    expenditureCount: expenditures.length,
    expenditureTotal,
    paidTotal,
    unpaidTotal: expenditureTotal - paidTotal,
    incomeAverage: incomes.length ? incomeTotal / incomes.length : 0,
    incomeMinimum: incomeAmounts.length ? Math.min(...incomeAmounts) : 0,
    incomeMaximum: incomeAmounts.length ? Math.max(...incomeAmounts) : 0,
    expenditureAverage: expenditures.length ? expenditureTotal / expenditures.length : 0,
    expenditureMinimum: expenditureAmounts.length ? Math.min(...expenditureAmounts) : 0,
    expenditureMaximum: expenditureAmounts.length ? Math.max(...expenditureAmounts) : 0,
    netIncome: incomeTotal - expenditureTotal,
    profitMargin: incomeTotal ? ((incomeTotal - expenditureTotal) / incomeTotal) * 100 : 0,
    namedIncome: byName(incomes),
    namedExpenditure: byName(expenditures),
  };
}

export function combinedFinancials(
  tripIncome: number,
  tripExpense: number,
  operations: OperationsSummary,
  tripCount: number,
) {
  const totalIncome = amount(tripIncome) + operations.incomeTotal,
    totalExpense = amount(tripExpense) + operations.expenditureTotal,
    netIncome = totalIncome - totalExpense;
  return {
    totalIncome,
    totalExpense,
    netIncome,
    profitMargin: totalIncome ? (netIncome / totalIncome) * 100 : 0,
    incomePerTrip: tripCount ? totalIncome / tripCount : 0,
    expensePerTrip: tripCount ? totalExpense / tripCount : 0,
    netIncomePerTrip: tripCount ? netIncome / tripCount : 0,
  };
}

export const SAFE_FUNCTIONS = [
  "SUM",
  "AVG",
  "MIN",
  "MAX",
  "COUNT",
  "COUNT_DISTINCT",
  "ROUND",
  "ABS",
  "COALESCE",
  "NULLIF",
  "IF",
] as const;
export function validateFormula(
  formula: string,
  variables: { variable_key: string; data_type: string }[],
): string[] {
  const errors: string[] = [];
  let depth = 0;
  for (const char of formula) {
    if (char === "(") depth++;
    if (char === ")" && --depth < 0) errors.push("Unbalanced parentheses.");
  }
  if (depth !== 0 && !errors.includes("Unbalanced parentheses."))
    errors.push("Unbalanced parentheses.");
  const known = new Map(variables.map((v) => [v.variable_key.toLowerCase(), v]));
  const functions = new Set<string>(SAFE_FUNCTIONS);
  const tokens = formula.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  for (const token of tokens)
    if (!known.has(token.toLowerCase()) && !functions.has(token.toUpperCase()))
      errors.push(`Unknown token: ${token}.`);
  if (/[+\-*/%]/.test(formula))
    for (const token of tokens) {
      const variable = known.get(token.toLowerCase());
      if (variable && ["text", "date", "datetime"].includes(variable.data_type))
        errors.push(`Text variable ${token} cannot be used in arithmetic.`);
    }
  if (
    /\/\s*(?:0+(?:\.0*)?|NULLIF\([^)]*,\s*[^)]*\))/i.test(formula) &&
    !/\/\s*NULLIF/i.test(formula)
  )
    errors.push("Division by zero.");
  return [...new Set(errors)];
}

export function periodValues(selection: PeriodSelection, range = periodRange(selection)): DataRow {
  const date = range.start ? new Date(`${range.start}T00:00:00Z`) : null;
  const month = date ? date.getUTCMonth() + 1 : null;
  const year = date?.getUTCFullYear() ?? null;
  return {
    "period.mode": selection.mode,
    "period.start_date": range.start ?? "",
    "period.end_date": range.end ?? "",
    "period.day": date?.getUTCDate() ?? "",
    "period.week": date
      ? Math.ceil(
          ((date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000 +
            new Date(Date.UTC(date.getUTCFullYear(), 0, 1)).getUTCDay() +
            1) /
            7,
        )
      : "",
    "period.month_number": month ?? "",
    "period.month_name": date?.toLocaleString("en-IN", { month: "long", timeZone: "UTC" }) ?? "",
    "period.quarter": month ? `Q${Math.ceil(month / 3)}` : "",
    "period.calendar_year": year ?? "",
    "period.financial_year":
      year === null
        ? ""
        : `FY ${month! < 4 ? year - 1 : year}-${String(month! < 4 ? year : year + 1).slice(-2)}`,
    "period.label": range.label,
  };
}

export function dateFieldFor(scope: ReportScope, basis: string): string {
  if (basis !== "automatic") return basis;
  if (scope.includes("manifest")) return "manifest_date";
  if (scope === "closed_trip") return "closed_at";
  return "start_date";
}

/** Chooses a case-insensitively unique copy name without overwriting the source template. */
export function uniqueTemplateCopyName(
  sourceName: string,
  existingNames: Iterable<string>,
): string {
  const existing = new Set([...existingNames].map((name) => name.toLocaleLowerCase()));
  let suffix = 1;
  let candidate = `${sourceName} Copy`;
  while (existing.has(candidate.toLocaleLowerCase())) {
    suffix += 1;
    candidate = `${sourceName} Copy ${suffix}`;
  }
  return candidate;
}

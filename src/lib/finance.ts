import { num } from "./trip-calc";

export type FinanceKind = "income" | "expenditure";

export type FinanceRow = {
  id?: string;
  name: string;
  amount: string;
  note: string;
  entry_date: string;
  branch_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  transporter_id: string | null;
  settled: boolean;
  settled_date: string;
};

export const FINANCE_CONFIG: Record<
  FinanceKind,
  {
    table: "incomes" | "expenditures";
    nameCol: "income_name" | "expenditure_name";
    statusCol: "is_received" | "is_paid";
    statusDateCol: "received_date" | "paid_date";
    title: string;
    single: string;
    nameLabel: string;
    doneLabel: string;
    pendingLabel: string;
    actionLabel: string;
    filename: string;
  }
> = {
  income: {
    table: "incomes",
    nameCol: "income_name",
    statusCol: "is_received",
    statusDateCol: "received_date",
    title: "Income",
    single: "income",
    nameLabel: "Income name",
    doneLabel: "Received",
    pendingLabel: "Not received",
    actionLabel: "Mark received",
    filename: "income",
  },
  expenditure: {
    table: "expenditures",
    nameCol: "expenditure_name",
    statusCol: "is_paid",
    statusDateCol: "paid_date",
    title: "Expenditure",
    single: "expenditure",
    nameLabel: "Expenditure name",
    doneLabel: "Paid",
    pendingLabel: "Unpaid",
    actionLabel: "Mark paid",
    filename: "expenditure",
  },
};

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function emptyFinanceRow(): FinanceRow {
  return {
    name: "",
    amount: "",
    note: "",
    entry_date: new Date().toISOString().slice(0, 10),
    branch_id: null,
    vehicle_id: null,
    driver_id: null,
    transporter_id: null,
    settled: false,
    settled_date: "",
  };
}

export function yearOf(date: string): string {
  return (date || "").slice(0, 4);
}

export function monthOf(date: string): string {
  return (date || "").slice(5, 7);
}

/**
 * Contract change amounts expressed per month:
 * a monthly change lands entirely on that month, a yearly change is spread as 1/12.
 */
export function monthlyContractEffect(entry: {
  monthly_change_amount?: string | null;
  yearly_change_amount?: string | null;
}): number {
  return num(entry.monthly_change_amount) + num(entry.yearly_change_amount) / 12;
}
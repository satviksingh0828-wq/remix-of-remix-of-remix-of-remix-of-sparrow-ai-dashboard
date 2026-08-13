import { openBrandedTablePdf } from "@/lib/branded-pdf";

export type DriverPaymentDriver = Record<string, unknown> & { full_name: string; driver_code: string };
type PaymentReceipt = { kind: "Advance" | "Salary"; amount: number; date: string; month?: string;
  salaryAmount?: number; advanceDeduction?: number; monthlyDeduction?: number; remainingBalance?: number; note?: string | null };
const show = (value: unknown) => value == null || String(value).trim() === "" ? "—" : String(value);
const money = (amount = 0) => `INR ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export function downloadDriverPaymentReceipt(driver: DriverPaymentDriver, payment: PaymentReceipt) {
  const identity: Array<[string, unknown]> = [
    ["Driver", driver.full_name], ["Driver code", driver.driver_code], ["Mobile", driver.mobile_number],
    ["Licence", driver.licence_number], ["Bank", driver.bank_name], ["Account", driver.bank_account_number],
  ];
  const paymentRows: Array<[string, unknown]> = payment.kind === "Salary" ? [
    ["Salary month", payment.month], ["Gross salary", money(payment.salaryAmount ?? payment.amount)],
    ["Advance deduction", money(payment.advanceDeduction)], ["Net salary paid", money(payment.amount)], ["Payment date", payment.date],
  ] : [["Advance amount", money(payment.amount)], ["Payment date", payment.date],
    ["Monthly recovery", money(payment.monthlyDeduction)], ["Balance after recovery", money(payment.remainingBalance)]];
  openBrandedTablePdf({
    title: payment.kind === "Salary" ? "Salary Slip" : "Driver Advance Receipt",
    subtitle: `${driver.full_name} · ${payment.date}`,
    filename: `${payment.kind.toLowerCase()}-${driver.full_name.replace(/[^a-z0-9]+/gi, "-")}-${payment.date}.pdf`,
    columns: ["Section", "Details"],
    rows: [...identity.map(([a,b]) => [a, show(b)]), ...paymentRows.map(([a,b]) => [a, show(b)]), ["Note", show(payment.note)]],
    summary: [[payment.kind === "Salary" ? "NET PAY" : "ADVANCE PAID", money(payment.amount)]],
  });
}

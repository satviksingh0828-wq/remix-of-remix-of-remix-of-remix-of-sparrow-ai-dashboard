import { jsPDF } from "jspdf";

export type DriverPaymentDriver = Record<string, unknown> & {
  full_name: string;
  driver_code: string;
};

type PaymentReceipt = {
  kind: "Advance" | "Salary";
  amount: number;
  date: string;
  month?: string;
  advanceDeduction?: number;
  note?: string | null;
};

const show = (value: unknown) =>
  value == null || String(value).trim() === "" ? "—" : String(value);
const money = (amount: number) =>
  `INR ${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export function downloadDriverPaymentReceipt(driver: DriverPaymentDriver, payment: PaymentReceipt) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.text(`${payment.kind.toUpperCase()} PAYMENT RECEIPT`, 105, 18, { align: "center" });
  pdf.setLineWidth(0.4);
  pdf.line(15, 23, 195, 23);

  const rows: Array<[string, unknown]> = [
    ["Driver name", driver.full_name],
    ["Driver code", driver.driver_code],
    ["Mobile number", driver.mobile_number],
    ["Guardian name", driver.guardian_name],
    ["Date of birth", driver.date_of_birth],
    ["Blood group", driver.blood_group],
    ["Aadhaar number", driver.aadhaar_number],
    ["PAN number", driver.pan_number],
    ["Licence number", driver.licence_number],
    ["Licence type", driver.licence_type],
    ["Licence expiry", driver.licence_expiry_date],
    ["Bank name", driver.bank_name],
    ["Bank account", driver.bank_account_number],
    ["IFSC", driver.bank_ifsc],
    ["UPI ID", driver.upi_id],
    ["Joining date", driver.joining_date],
  ];
  pdf.setFontSize(11);
  let y = 32;
  for (const [label, value] of rows) {
    pdf.setFont("helvetica", "bold");
    pdf.text(`${label}:`, 18, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(show(value), 64, y);
    y += 7;
  }

  y += 3;
  pdf.setFillColor(242, 246, 252);
  pdf.roundedRect(15, y - 6, 180, payment.kind === "Salary" ? 39 : 31, 2, 2, "F");
  const details: Array<[string, string]> = [
    ["Payment type", payment.kind],
    ["Amount given", money(payment.amount)],
    ["Payment date", show(payment.date)],
  ];
  if (payment.month) details.push(["Salary month", payment.month]);
  if (payment.advanceDeduction != null)
    details.push(["Advance deduction", money(payment.advanceDeduction)]);
  if (payment.note) details.push(["Note", payment.note]);
  for (const [label, value] of details) {
    pdf.setFont("helvetica", "bold");
    pdf.text(`${label}:`, 20, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(value, 64, y);
    y += 7;
  }

  const signatureY = 270;
  pdf.line(18, signatureY, 78, signatureY);
  pdf.line(132, signatureY, 192, signatureY);
  pdf.setFontSize(10);
  pdf.text("Manager Signature", 48, signatureY + 6, { align: "center" });
  pdf.text("Driver Signature", 162, signatureY + 6, { align: "center" });
  const safeName = driver.full_name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  pdf.save(`${payment.kind.toLowerCase()}-${safeName}-${payment.date}.pdf`);
}

import * as XLSX from "xlsx";
import type { ExpenseDraft } from "./types";

type Row = Record<string, unknown>;

function normKey(key: string) { return key.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function first(row: Row, keys: string[]) {
  const entries = Object.entries(row);
  for (const wanted of keys.map(normKey)) {
    const found = entries.find(([k]) => normKey(k) === wanted || normKey(k).includes(wanted));
    if (found && found[1] !== undefined && found[1] !== null && String(found[1]).trim()) return String(found[1]).trim();
  }
  return undefined;
}
function amountValue(value?: string) {
  if (!value) return undefined;
  const n = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}
function toDraft(row: Row): ExpenseDraft {
  const expenditureName = first(row, ["expenditure name", "expense name", "expense", "type", "category"]);
  const amount = amountValue(first(row, ["amount", "amt", "value"]));
  const date = first(row, ["date", "entry date", "paid date"]);
  const note = first(row, ["note", "remarks", "city", "location", "place"]);
  const branch = first(row, ["branch", "department", "office"]);
  const vehicle = first(row, ["vehicle", "truck", "registration"]);
  const driver = first(row, ["driver"]);
  const transporter = first(row, ["transporter", "broker"]);
  const missingFields = [!expenditureName && "Expenditure name", !amount && "Amount", !date && "Date", !branch && "Branch (required)"].filter(Boolean) as string[];
  return { expenditureName, amount, date, note, branch, vehicle, driver, transporter, missingFields, confidence: Math.max(0.35, 1 - missingFields.length * 0.16) };
}

export async function parseExpenseFile(file: File): Promise<ExpenseDraft[]> {
  if (/image\//.test(file.type)) {
    return [{ note: `Image attached: ${file.name}. OCR provider is not configured yet; please type or paste the extracted expense rows.`, confidence: 0.2, missingFields: ["Expenditure name", "Amount", "Date", "Branch (required)"] }];
  }
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: "array", cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { defval: "" });
  return rows.map(toDraft).filter((draft) => draft.expenditureName || draft.amount || draft.date || draft.note || draft.branch);
}

export function summarizeDrafts(drafts: ExpenseDraft[]) {
  if (!drafts.length) return "I could not find expense rows in that file.";
  return `Found ${drafts.length} expense row(s). ${drafts.slice(0, 5).map((d, i) => `#${i + 1}: ${d.expenditureName ?? "missing name"}, ₹${d.amount ?? "?"}, ${d.date ?? "missing date"}${d.missingFields.length ? ` (needs ${d.missingFields.join(", ")})` : ""}`).join("; ")}`;
}

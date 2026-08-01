import type { ExpenseDraft, SparrowAction } from "../types";

export function buildExpenseImportActions(drafts: ExpenseDraft[]): SparrowAction[] {
  const actions: SparrowAction[] = [{ type: "navigate", path: "/operations" }, { type: "wait", ms: 1500 }, { type: "click_tab", text: "Expenditure" }, { type: "wait", ms: 900 }];
  drafts.forEach((draft, index) => {
    actions.push({ type: "click_button", text: "New expenditure" }, { type: "wait", ms: 1200 });
    if (draft.expenditureName) actions.push({ type: "fill_input", label: "Expenditure name", value: draft.expenditureName });
    if (draft.amount !== undefined) actions.push({ type: "fill_input", label: "Amount", value: String(draft.amount) });
    if (draft.date) actions.push({ type: "fill_input", label: "Date", value: draft.date });
    if (draft.note) actions.push({ type: "fill_input", label: "Note", value: draft.note });
    if (draft.branch) actions.push({ type: "open_picker", label: "Branch (required)", search: draft.branch });
    if (draft.vehicle) actions.push({ type: "open_picker", label: "Vehicle", search: draft.vehicle });
    if (draft.driver) actions.push({ type: "open_picker", label: "Driver", search: draft.driver });
    if (draft.transporter) actions.push({ type: "open_picker", label: "Transporter", search: draft.transporter });
    if (draft.missingFields.length) {
      actions.push({ type: "ask_user", question: `Expense ${index + 1} is missing: ${draft.missingFields.join(", ")}. Please fill/select the missing values, then press Save when ready.` });
    } else {
      actions.push({ type: "ask_user", question: `Expense ${index + 1} is ready. Please review it and press Save. I will continue with the next row after saving.` });
    }
    actions.push({ type: "wait_for_user_action", action: "save", timeoutMs: 120000 });
  });
  return actions;
}

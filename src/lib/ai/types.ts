export type SparrowAction =
  | { type: "navigate"; path: string }
  | { type: "wait"; ms: number }
  | { type: "click_button"; text: string }
  | { type: "click_tab"; text: string }
  | { type: "fill_input"; label: string; value: string }
  | { type: "fill_placeholder"; placeholder: string; value: string }
  | { type: "open_picker"; label: string; search: string }
  | { type: "select_dropdown"; label: string; option: string }
  | { type: "set_checkbox"; label: string; checked: boolean }
  | { type: "set_switch"; label: string; checked: boolean }
  | { type: "set_radio"; label: string; option: string }
  | { type: "pick_date"; label: string; value: string }
  | { type: "upload_file"; label: string; fileName?: string }
  | { type: "ask_user"; question: string; reason?: string }
  | { type: "wait_for_user_action"; action: "save" | "submit"; timeoutMs?: number }
  | { type: "observe_screen" }
  | { type: "scroll_to"; label: string };

export type ExpenseDraft = {
  expenditureName?: string;
  amount?: number;
  date?: string;
  note?: string;
  branch?: string;
  vehicle?: string;
  driver?: string;
  transporter?: string;
  confidence: number;
  missingFields: string[];
};

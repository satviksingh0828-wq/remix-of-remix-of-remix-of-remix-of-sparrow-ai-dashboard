import { ADMIN_ROUTES, BASIC_ROUTES, SEMI_ADMIN_ROUTES, VIEWER_ROUTES } from "./capability-map";
import { classifyButtonAction } from "./safety";
import type { SparrowAction } from "./types";

const ACTION_TYPES = new Set(["navigate", "wait", "click_button", "click_tab", "fill_input", "fill_placeholder", "open_picker", "select_dropdown", "set_checkbox", "set_switch", "set_radio", "pick_date", "upload_file", "ask_user", "wait_for_user_action", "observe_screen", "scroll_to"]);

export function validateActions(actions: SparrowAction[], role: string) {
  const allowedRoutes = role === "admin" ? [...ADMIN_ROUTES] : role === "semi_admin" ? [...SEMI_ADMIN_ROUTES] : role === "viewer" ? [...VIEWER_ROUTES] : [...BASIC_ROUTES];
  const valid: SparrowAction[] = [];
  const warnings: string[] = [];
  for (const action of actions) {
    if (!ACTION_TYPES.has(action.type)) { warnings.push(`Skipped unknown action ${String(action.type)}.`); continue; }
    if (action.type === "navigate" && !(allowedRoutes as readonly string[]).includes(action.path)) { warnings.push(`Skipped unavailable route ${action.path}.`); continue; }
    if (role === "viewer" && action.type !== "navigate" && action.type !== "click_tab" && action.type !== "wait" && action.type !== "observe_screen") { warnings.push(`Skipped read-only action ${action.type}.`); continue; }
    if (action.type === "click_button" && classifyButtonAction(action.text) !== "allowed") { warnings.push(`Skipped user-only/blocked button ${action.text}.`); continue; }
    if (action.type === "open_picker" && (!action.search || action.search === "undefined" || action.search === "null")) { warnings.push(`Skipped ${action.label} picker because no option was provided.`); continue; }
    if (action.type === "select_dropdown" && (!action.option || action.option === "undefined" || action.option === "null")) { warnings.push(`Skipped ${action.label} dropdown because no option was provided.`); continue; }
    valid.push(action);
  }
  return { actions: valid, warnings };
}

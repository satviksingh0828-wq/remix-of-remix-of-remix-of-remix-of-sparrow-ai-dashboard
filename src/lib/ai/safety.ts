const USER_ONLY = ["save", "submit", "close trip"];
const BLOCKED = ["delete", "remove", "confirm delete", "destroy", "reset"];

export type ActionSafety = "allowed" | "user_only" | "blocked";

export function classifyButtonAction(text: string): ActionSafety {
  const lower = text.toLowerCase().trim();
  if (BLOCKED.some((word) => lower.includes(word))) return "blocked";
  if (USER_ONLY.some((word) => lower.includes(word))) return "user_only";
  return "allowed";
}

export function isBlockedAction(text: string) {
  return classifyButtonAction(text) !== "allowed";
}

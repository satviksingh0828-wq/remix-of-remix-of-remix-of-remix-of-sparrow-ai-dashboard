/**
 * WhatsApp is intentionally disabled in the web HR module.
 * These compatibility exports keep migrated PDF screens safe while the old
 * optional send controls remain hidden.
 */
export function isWaConnected() { return false; }
export function normalizeWaNumber(value: string | null | undefined) { return value ?? ""; }
export async function sendWaMessage(..._args: unknown[]) { return { ok: false, error: "WhatsApp is disabled" }; }
export async function sendWaPdf(..._args: unknown[]) { return { ok: false, error: "WhatsApp is disabled" }; }
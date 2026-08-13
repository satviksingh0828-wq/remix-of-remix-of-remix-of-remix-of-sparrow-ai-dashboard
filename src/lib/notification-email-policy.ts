/** Notification kinds that must remain in the dashboard panel only. */
const PANEL_ONLY_NOTIFICATION_KINDS = new Set([
  "manifest_date_future",
  "manifest_date_old",
  "manifest_date_missing",
]);

/**
 * Returns whether a bell notification should also be delivered by email.
 *
 * This is intentionally a deny-list for manifest-date warnings: established
 * alerts (including zero-income, insurance, road-tax and monthly MIS) and any
 * future non-date alert continue through the normal email delivery pipeline.
 */
export function shouldEmailNotification(kind: string): boolean {
  return !PANEL_ONLY_NOTIFICATION_KINDS.has(kind);
}

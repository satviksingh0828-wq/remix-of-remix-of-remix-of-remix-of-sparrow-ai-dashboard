/** Notification kinds that must remain in the dashboard panel only. */
const PANEL_ONLY_NOTIFICATION_KINDS = new Set(["manifest_date_future"]);

/**
 * Returns whether a bell notification should also be delivered by email.
 *
 * Future-date warnings remain panel-only. Missing and too-old manifest dates
 * are actionable data-quality alerts, so they continue through the normal
 * email delivery pipeline with all other established alerts.
 */
export function shouldEmailNotification(kind: string): boolean {
  return !PANEL_ONLY_NOTIFICATION_KINDS.has(kind);
}

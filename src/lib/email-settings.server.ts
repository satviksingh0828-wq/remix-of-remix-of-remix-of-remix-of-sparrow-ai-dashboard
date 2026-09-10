import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const PRIYANSHI_EMAIL = "priyanshi@garudalogistics.in";

export type EmailSettings = {
  email_auto_send_payroll: boolean;
  email_send_admin_notifications: boolean;
  email_send_branch_open_trips: boolean;
  email_send_expiry_notifications: boolean;
  email_send_hr_notifications: boolean;
  email_send_on_payment: boolean;
  email_send_loan: boolean;
  email_send_advance: boolean;
  email_send_loss_deduction: boolean;
  email_send_attendance_monthly: boolean;
};

const DEFAULTS: EmailSettings = {
  email_auto_send_payroll: false,
  email_send_admin_notifications: true,
  email_send_branch_open_trips: true,
  email_send_expiry_notifications: true,
  email_send_hr_notifications: true,
  email_send_on_payment: false,
  email_send_loan: false,
  email_send_advance: false,
  email_send_loss_deduction: false,
  email_send_attendance_monthly: false,
};

export async function getEmailSettings(): Promise<EmailSettings> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from("app_settings")
    .select(Object.keys(DEFAULTS).join(","))
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[email-settings] Could not load settings; using safe defaults:", error.message);
    return DEFAULTS;
  }
  return Object.fromEntries(
    Object.entries(DEFAULTS).map(([key, fallback]) => [key, data?.[key] ?? fallback]),
  ) as EmailSettings;
}

export function withPriyanshiCc(cc: string[] = []): string[] {
  return [...new Set([...cc.filter(Boolean), PRIYANSHI_EMAIL])];
}

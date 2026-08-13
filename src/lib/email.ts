const FOOTER = "POWERED BY ORCA SOLUTIONS";

export function adminAlertEmails(): string[] {
  return [...new Set([
    process.env.ADMIN_ALERT_EMAIL,
    process.env.ADMIN_2_ALERT_EMAIL,
  ].filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))];
}

export function emailTemplate(options: {
  title: string;
  eyebrow?: string;
  intro: string;
  content: string;
  accent?: string;
  notice?: string;
}): string {
  const accent = options.accent ?? "#4f46e5";
  const appUrl = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const logo = appUrl ? `<img src="${appUrl}/garuda-logo.png" width="68" alt="Garuda Logistics Solutions" style="display:block;width:68px;height:auto;margin:0 auto 10px">` : "";
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,.08)">
<tr><td style="height:6px;background:${accent}"></td></tr>
<tr><td align="center" style="padding:24px 34px 18px;border-bottom:1px solid #e2e8f0">${logo}<div style="font-size:18px;font-weight:800;letter-spacing:.04em;color:#0f172a">GARUDA LOGISTICS SOLUTIONS</div><div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#64748b;margin-top:5px">Operations &amp; Transport Management</div></td></tr>
<tr><td style="padding:30px 34px 12px">
${options.eyebrow ? `<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:${accent};margin-bottom:9px">${options.eyebrow}</div>` : ""}
<h1 style="font-size:23px;line-height:1.25;margin:0 0 12px;color:#0f172a">${options.title}</h1>
<p style="font-size:14px;line-height:1.65;color:#475569;margin:0">${options.intro}</p></td></tr>
<tr><td style="padding:12px 34px 26px">${options.content}
${options.notice ? `<p style="font-size:12px;line-height:1.55;color:#64748b;margin:20px 0 0;padding:12px 14px;background:#f8fafc;border-radius:8px">${options.notice}</p>` : ""}
</td></tr>
<tr><td align="center" style="padding:17px;border-top:1px solid #e2e8f0;background:#f8fafc;font-size:10px;letter-spacing:.18em;font-weight:700;color:#64748b">${FOOTER}</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendResendEmail(options: {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = [...new Set(options.to.filter(Boolean))];
  if (!apiKey || !to.length) throw new Error("Email service or recipients are not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: options.from ?? process.env.NOTIFIER_EMAIL ?? process.env.ALERT_FROM_EMAIL ?? "onboarding@resend.dev",
      to,
      subject: options.subject,
      html: options.html,
    }),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${await response.text()}`);
}

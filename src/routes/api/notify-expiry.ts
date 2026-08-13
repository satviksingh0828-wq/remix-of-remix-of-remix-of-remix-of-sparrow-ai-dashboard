/**
 * GET /api/notify-expiry
 *
 * Available for an authenticated manual compliance run. Sends Resend emails to admin + branch
 * for vehicle insurance and road tax records expiring in exactly 10 or 5 days.
 *
 * Required env vars:
 *   RESEND_API_KEY        — Resend API key
 *   NOTIFIER_EMAIL        — "from" address (e.g. alerts@yourdomain.com)
 *   ADMIN_ALERT_EMAIL     — always receives every alert
 *   ADMIN_2_ALERT_EMAIL   — optional second admin; also receives every alert
 *   CRON_SECRET           — bearer token Vercel sends; rejects other callers
 */

import { createFileRoute } from "@tanstack/react-router";
import { adminAlertEmails, emailTemplate, sendResendEmail } from "@/lib/email";

// ── helpers ────────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function insuranceHtml(
  vehicleReg: string,
  insuranceNumber: string,
  endDate: string,
  daysLeft: number,
) {
  return emailTemplate({ title: "Vehicle insurance expiry alert", eyebrow: "Compliance alert", accent: "#b45309",
  intro: `The insurance for vehicle <strong>${vehicleReg}</strong> expires in <strong>${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.`, content: `
  <table style="border-collapse:collapse;width:100%;margin:16px 0">
    <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:600;width:160px">Vehicle</td><td style="padding:6px 12px;background:#fffbeb">${vehicleReg}</td></tr>
    <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:600">Insurance No.</td><td style="padding:6px 12px;background:#fffbeb">${insuranceNumber || "—"}</td></tr>
    <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:600">Expiry Date</td><td style="padding:6px 12px;background:#fffbeb">${endDate}</td></tr>
    <tr><td style="padding:6px 12px;background:#fef3c7;font-weight:600">Days Remaining</td><td style="padding:6px 12px;background:#fffbeb;color:#c0392b;font-weight:700">${daysLeft} days</td></tr>
  </table>`, notice: "Please renew the insurance before it expires to ensure continued compliance." });
}

function roadTaxHtml(
  vehicleReg: string,
  state: string,
  endDate: string,
  daysLeft: number,
) {
  return emailTemplate({ title: "Vehicle road tax expiry alert", eyebrow: "Compliance alert", accent: "#7c3aed",
  intro: `The road tax for vehicle <strong>${vehicleReg}</strong> expires in <strong>${daysLeft} day${daysLeft !== 1 ? "s" : ""}</strong>.`, content: `
  <table style="border-collapse:collapse;width:100%;margin:16px 0">
    <tr><td style="padding:6px 12px;background:#ede9fe;font-weight:600;width:160px">Vehicle</td><td style="padding:6px 12px;background:#f5f3ff">${vehicleReg}</td></tr>
    <tr><td style="padding:6px 12px;background:#ede9fe;font-weight:600">State</td><td style="padding:6px 12px;background:#f5f3ff">${state || "—"}</td></tr>
    <tr><td style="padding:6px 12px;background:#ede9fe;font-weight:600">Expiry Date</td><td style="padding:6px 12px;background:#f5f3ff">${endDate}</td></tr>
    <tr><td style="padding:6px 12px;background:#ede9fe;font-weight:600">Days Remaining</td><td style="padding:6px 12px;background:#f5f3ff;color:#7c3aed;font-weight:700">${daysLeft} days</td></tr>
  </table>`, notice: "Please renew the road tax before it expires to ensure continued compliance." });
}

// ── route ──────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/notify-expiry")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        // ── Auth: only allow Vercel cron (CRON_SECRET) ──────────────────────
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) {
          const auth = request.headers.get("authorization") ?? "";
          if (auth !== `Bearer ${cronSecret}`) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        const apiKey      = process.env.RESEND_API_KEY;
        const adminEmails = adminAlertEmails();

        if (!apiKey) {
          console.error("[notify-expiry] RESEND_API_KEY not set");
          return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY not set" }), { status: 500 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;

        const today  = new Date();
        const in5    = addDays(today, 5);
        const in10   = addDays(today, 10);
        const targetDates = [in5, in10];

        // ── Fetch expiring insurance ────────────────────────────────────────
        const { data: insuranceRows } = await db
          .from("vehicle_insurance")
          .select("id,vehicle_id,end_date,insurance_number")
          .in("end_date", targetDates);

        // ── Fetch expiring road tax ─────────────────────────────────────────
        const { data: roadTaxRows } = await db
          .from("vehicle_road_tax")
          .select("id,vehicle_id,end_date,state")
          .in("end_date", targetDates);

        const allVehicleIds = [
          ...new Set([
            ...(insuranceRows ?? []).map((r: Record<string, unknown>) => r.vehicle_id as string),
            ...(roadTaxRows ?? []).map((r: Record<string, unknown>) => r.vehicle_id as string),
          ].filter(Boolean)),
        ];

        if (allVehicleIds.length === 0) {
          return new Response(JSON.stringify({ ok: true, sent: 0, message: "Nothing expiring in 5 or 10 days." }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        // ── Fetch vehicles + branches ───────────────────────────────────────
        const { data: vehicles } = await db
          .from("vehicles")
          .select("id,registration_number,branch_id")
          .in("id", allVehicleIds);

        const branchIds = [...new Set(
          (vehicles ?? []).map((v: Record<string, unknown>) => v.branch_id as string).filter(Boolean),
        )];

        const { data: branches } = branchIds.length > 0
          ? await db.from("branches").select("id,branch_name,branch_email").in("id", branchIds)
          : { data: [] };

        const vehicleMap = new Map<string, { reg: string; branchId: string }>(
          (vehicles ?? []).map((v: Record<string, unknown>) => [
            v.id as string,
            { reg: String(v.registration_number ?? ""), branchId: v.branch_id as string },
          ]),
        );

        const branchEmailMap = new Map<string, string>(
          (branches ?? []).map((b: Record<string, unknown>) => [
            b.id as string,
            String(b.branch_email ?? ""),
          ]),
        );

        let sent = 0;
        const errors: string[] = [];

        // ── Send insurance alerts ───────────────────────────────────────────
        for (const row of insuranceRows ?? []) {
          const r = row as Record<string, unknown>;
          const vehicle     = vehicleMap.get(r.vehicle_id as string);
          if (!vehicle) continue;
          const endDate     = String(r.end_date ?? "");
          const daysLeft    = endDate === in5 ? 5 : 10;
          const branchEmail = branchEmailMap.get(vehicle.branchId) ?? "";
          const to          = [...adminEmails, branchEmail].filter(Boolean) as string[];
          if (to.length === 0) continue;

          try {
            await sendResendEmail({ to, subject: `⚠️ Insurance expiring in ${daysLeft} days — ${vehicle.reg}`,
              html: insuranceHtml(vehicle.reg, String(r.insurance_number ?? ""), endDate, daysLeft) });
            sent++;
          } catch (err) {
            errors.push(`insurance ${r.id}: ${err}`);
          }
        }

        // ── Send road tax alerts ────────────────────────────────────────────
        for (const row of roadTaxRows ?? []) {
          const r = row as Record<string, unknown>;
          const vehicle     = vehicleMap.get(r.vehicle_id as string);
          if (!vehicle) continue;
          const endDate     = String(r.end_date ?? "");
          const daysLeft    = endDate === in5 ? 5 : 10;
          const branchEmail = branchEmailMap.get(vehicle.branchId) ?? "";
          const to          = [...adminEmails, branchEmail].filter(Boolean) as string[];
          if (to.length === 0) continue;

          try {
            await sendResendEmail({ to, subject: `⚠️ Road tax expiring in ${daysLeft} days — ${vehicle.reg} (${String(r.state ?? "")})`,
              html: roadTaxHtml(vehicle.reg, String(r.state ?? ""), endDate, daysLeft) });
            sent++;
          } catch (err) {
            errors.push(`road_tax ${r.id}: ${err}`);
          }
        }

        const result = { ok: true, sent, errors: errors.length > 0 ? errors : undefined };
        console.log("[notify-expiry]", result);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

import { adminAlertEmails, emailTemplate, sendResendEmail } from "@/lib/email";

type OpenTrip = {
  id: string;
  trip_code: string;
  branch_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  start_location_id: string | null;
  end_location_id: string | null;
  start_date: string | null;
  start_time: string | null;
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (name: string) => parts.find((part) => part.type === name)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function indiaTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function openTripsEmailHtml(options: {
  branchName: string;
  trips: Array<OpenTrip & { vehicle: string; driver: string; source: string; destination: string }>;
}) {
  const rows = options.trips
    .map(
      (trip) => `<tr>
    <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;font-weight:700">${escapeHtml(trip.trip_code)}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">${escapeHtml(trip.source)} → ${escapeHtml(trip.destination)}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">${escapeHtml(trip.vehicle)}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">${escapeHtml(trip.driver)}</td>
    <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0">${escapeHtml([trip.start_date, trip.start_time].filter(Boolean).join(" ") || "—")}</td>
  </tr>`,
    )
    .join("");
  return emailTemplate({
    title: `Open trips — ${options.branchName}`,
    eyebrow: "Morning branch summary",
    accent: "#7c3aed",
    intro: `There ${options.trips.length === 1 ? "is" : "are"} <strong>${options.trips.length}</strong> open trip${options.trips.length === 1 ? "" : "s"} in the <strong>${escapeHtml(options.branchName)}</strong> branch at the time this summary was prepared.`,
    content: `<div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;margin:8px 0;font-size:12px"><thead><tr style="background:#f5f3ff;color:#4c1d95"><th align="left" style="padding:10px 8px">Trip</th><th align="left" style="padding:10px 8px">Route</th><th align="left" style="padding:10px 8px">Vehicle</th><th align="left" style="padding:10px 8px">Driver</th><th align="left" style="padding:10px 8px">Started</th></tr></thead><tbody>${rows}</tbody></table></div>`,
    notice: `Prepared at ${indiaTimestamp()} (India time). Branches without an open trip do not receive this email.`,
  });
}

export const Route = createFileRoute("/api/notify-open-trips")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const cronSecret = process.env.CRON_SECRET;
        const auth = request.headers.get("authorization") ?? "";
        if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        if (!process.env.RESEND_API_KEY) {
          return Response.json(
            { ok: false, error: "RESEND_API_KEY is not configured" },
            { status: 500 },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;
        const { data: rawTrips, error: tripsError } = await db
          .from("trips")
          .select(
            "id,trip_code,branch_id,vehicle_id,driver_id,start_location_id,end_location_id,start_date,start_time",
          )
          .order("start_date", { ascending: true })
          .order("start_time", { ascending: true });
        if (tripsError)
          return Response.json({ ok: false, error: tripsError.message }, { status: 500 });

        const trips = (rawTrips ?? []) as OpenTrip[];
        const branchIds = [
          ...new Set(trips.map((trip) => trip.branch_id).filter(Boolean)),
        ] as string[];
        if (!branchIds.length)
          return Response.json({
            ok: true,
            sent: 0,
            skippedBranches: 0,
            message: "No open trips.",
          });

        const [{ data: branches }, { data: vehicles }, { data: drivers }, { data: locations }] =
          await Promise.all([
            db.from("branches").select("id,branch_name,branch_email").in("id", branchIds),
            db
              .from("vehicles")
              .select("id,registration_number,internal_code")
              .in("id", [...new Set(trips.map((trip) => trip.vehicle_id).filter(Boolean))]),
            db
              .from("drivers")
              .select("id,full_name,driver_code")
              .in("id", [...new Set(trips.map((trip) => trip.driver_id).filter(Boolean))]),
            db
              .from("locations")
              .select("id,location_name")
              .in("id", [
                ...new Set(
                  trips
                    .flatMap((trip) => [trip.start_location_id, trip.end_location_id])
                    .filter(Boolean),
                ),
              ]),
          ]);
        const branchById = new Map(
          (branches ?? []).map((branch: Record<string, unknown>) => [String(branch.id), branch]),
        );
        const vehicleById = new Map(
          (vehicles ?? []).map((vehicle: Record<string, unknown>) => [String(vehicle.id), vehicle]),
        );
        const driverById = new Map(
          (drivers ?? []).map((driver: Record<string, unknown>) => [String(driver.id), driver]),
        );
        const locationById = new Map(
          (locations ?? []).map((location: Record<string, unknown>) => [
            String(location.id),
            String(location.location_name ?? "—"),
          ]),
        );
        const visibleAdmins = adminAlertEmails();
        const dateKey = indiaDateKey();
        let sent = 0;
        let skippedBranches = 0;
        const errors: string[] = [];

        for (const branchId of branchIds) {
          const branch = branchById.get(branchId) as
            | { branch_name?: string; branch_email?: string }
            | undefined;
          const branchEmail = branch?.branch_email?.trim();
          const branchTrips = trips.filter((trip) => trip.branch_id === branchId);
          if (!branchTrips.length || !branchEmail) {
            skippedBranches += 1;
            continue;
          }
          const formattedTrips = branchTrips.map((trip) => {
            const vehicle = trip.vehicle_id
              ? (vehicleById.get(trip.vehicle_id) as
                  | { registration_number?: string; internal_code?: string }
                  | undefined)
              : undefined;
            const driver = trip.driver_id
              ? (driverById.get(trip.driver_id) as
                  | { full_name?: string; driver_code?: string }
                  | undefined)
              : undefined;
            return {
              ...trip,
              vehicle: vehicle?.registration_number || vehicle?.internal_code || "—",
              driver: driver?.full_name || driver?.driver_code || "—",
              source: trip.start_location_id
                ? (locationById.get(trip.start_location_id) ?? "—")
                : "—",
              destination: trip.end_location_id
                ? (locationById.get(trip.end_location_id) ?? "—")
                : "—",
            };
          });
          const branchName = branch?.branch_name?.trim() || "Branch";
          try {
            await sendResendEmail({
              to: [branchEmail],
              cc: visibleAdmins,
              subject: `Open trips today — ${branchName}`,
              html: openTripsEmailHtml({ branchName, trips: formattedTrips }),
              idempotencyKey: `branch-open-trips:${dateKey}:${branchId}`,
            });
            sent += 1;
          } catch (error) {
            errors.push(
              `${branchName}: ${error instanceof Error ? error.message : "email delivery failed"}`,
            );
          }
        }

        return Response.json({
          ok: errors.length === 0,
          sent,
          skippedBranches,
          errors: errors.length ? errors : undefined,
        });
      },
    },
  },
});

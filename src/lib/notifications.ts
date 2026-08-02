/**
 * Server function that fetches admin notification items:
 *  1. Vehicle insurance expiring within 30 days
 *  2. Vehicle road tax expiring within 30 days
 *  3. Open-trip manifests whose (source_id, from, to) has no matching contract_entry
 */

import { createServerFn } from "@tanstack/react-start";

export type NotificationKind = "insurance" | "road_tax" | "manifest_mismatch";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  daysLeft?: number;
};

export const serverFetchNotifications = createServerFn({ method: "GET" }).handler(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;

  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in30     = new Date(today);
  in30.setDate(in30.getDate() + 30);
  const in30Str  = in30.toISOString().slice(0, 10);

  const notifications: NotificationItem[] = [];

  // ── 1 & 2: expiring insurance / road tax ─────────────────────────────────
  const [{ data: insuranceRows }, { data: roadTaxRows }] = await Promise.all([
    db.from("vehicle_insurance")
      .select("id,vehicle_id,end_date,insurance_number")
      .gte("end_date", todayStr)
      .lte("end_date", in30Str),
    db.from("vehicle_road_tax")
      .select("id,vehicle_id,end_date,state")
      .gte("end_date", todayStr)
      .lte("end_date", in30Str),
  ]);

  const vehicleIds = [
    ...new Set([
      ...(insuranceRows ?? []).map((r: Record<string, unknown>) => r.vehicle_id as string),
      ...(roadTaxRows  ?? []).map((r: Record<string, unknown>) => r.vehicle_id as string),
    ].filter(Boolean)),
  ];

  const vehicleMap = new Map<string, string>();
  if (vehicleIds.length > 0) {
    const { data: vehicles } = await db
      .from("vehicles")
      .select("id,registration_number")
      .in("id", vehicleIds);
    for (const v of vehicles ?? []) {
      vehicleMap.set(v.id as string, (v.registration_number as string) ?? String(v.id));
    }
  }

  for (const row of insuranceRows ?? []) {
    const r = row as Record<string, unknown>;
    const daysLeft = Math.ceil(
      (new Date(r.end_date as string).getTime() - today.getTime()) / 86_400_000,
    );
    const reg = vehicleMap.get(r.vehicle_id as string) ?? String(r.vehicle_id);
    notifications.push({
      id:      `ins-${r.id}`,
      kind:    "insurance",
      title:   `Insurance expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      detail:  `${reg}${r.insurance_number ? ` — Policy ${r.insurance_number}` : ""} · due ${r.end_date}`,
      daysLeft,
    });
  }

  for (const row of roadTaxRows ?? []) {
    const r = row as Record<string, unknown>;
    const daysLeft = Math.ceil(
      (new Date(r.end_date as string).getTime() - today.getTime()) / 86_400_000,
    );
    const reg = vehicleMap.get(r.vehicle_id as string) ?? String(r.vehicle_id);
    notifications.push({
      id:      `rt-${r.id}`,
      kind:    "road_tax",
      title:   `Road tax expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      detail:  `${reg}${r.state ? ` — ${r.state}` : ""} · due ${r.end_date}`,
      daysLeft,
    });
  }

  // ── 3: manifest source mismatch on open trips ─────────────────────────────
  // Step A: fetch open trips
  const { data: openTrips } = await db
    .from("trips")
    .select("id,trip_code")
    .is("closed_at", null);

  const openTripIds = (openTrips ?? []).map((t: Record<string, unknown>) => t.id as string);

  if (openTripIds.length > 0) {
    // Step B: fetch their manifests that have a source assigned
    const { data: manifests } = await db
      .from("trip_manifests")
      .select("id,trip_id,manifest_number,source_id,from_location_id,to_location_id")
      .in("trip_id", openTripIds)
      .not("source_id", "is", null);

    const validManifests = (manifests ?? []) as Record<string, unknown>[];

    if (validManifests.length > 0) {
      const sourceIds = [...new Set(validManifests.map((m) => m.source_id as string).filter(Boolean))];

      // Step C: fetch all contract_entries for those sources
      const { data: entries } = await db
        .from("contract_entries")
        .select("contract_id,from_location_id,to_location_id")
        .in("contract_id", sourceIds);

      const validCombos = new Set<string>(
        (entries ?? []).map(
          (e: Record<string, unknown>) =>
            `${e.contract_id}|${e.from_location_id ?? ""}|${e.to_location_id ?? ""}`,
        ),
      );

      // Resolve location names for readable notifications
      const allLocIds = [
        ...new Set(
          validManifests.flatMap((m) => [
            m.from_location_id as string,
            m.to_location_id as string,
          ]).filter(Boolean),
        ),
      ];
      const locMap = new Map<string, string>();
      if (allLocIds.length > 0) {
        const { data: locs } = await db
          .from("locations")
          .select("id,location_name")
          .in("id", allLocIds);
        for (const l of locs ?? []) {
          locMap.set(l.id as string, (l.location_name as string) ?? String(l.id));
        }
      }

      const tripCodeMap = new Map<string, string>(
        (openTrips ?? []).map((t: Record<string, unknown>) => [t.id as string, t.trip_code as string]),
      );

      for (const m of validManifests) {
        const key = `${m.source_id}|${m.from_location_id ?? ""}|${m.to_location_id ?? ""}`;
        if (!validCombos.has(key)) {
          const tripCode = tripCodeMap.get(m.trip_id as string) ?? String(m.trip_id);
          const fromName = m.from_location_id
            ? (locMap.get(m.from_location_id as string) ?? String(m.from_location_id))
            : "?";
          const toName = m.to_location_id
            ? (locMap.get(m.to_location_id as string) ?? String(m.to_location_id))
            : "?";
          notifications.push({
            id:     `mm-${m.id}`,
            kind:   "manifest_mismatch",
            title:  `Source mismatch — Trip ${tripCode}`,
            detail: `LR ${(m.manifest_number as string) ?? "—"}: ${fromName} → ${toName} not in source`,
          });
        }
      }
    }
  }

  // Sort: soonest expiry first, then mismatches
  notifications.sort((a, b) => {
    if (a.daysLeft !== undefined && b.daysLeft !== undefined) return a.daysLeft - b.daysLeft;
    if (a.daysLeft !== undefined) return -1;
    if (b.daysLeft !== undefined) return 1;
    return 0;
  });

  return notifications;
});

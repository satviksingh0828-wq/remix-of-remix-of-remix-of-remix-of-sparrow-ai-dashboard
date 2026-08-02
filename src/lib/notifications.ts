/**
 * Supabase-backed admin notifications.
 *
 * Rules:
 *  - kind + ref_id is UNIQUE → no duplicate rows ever.
 *  - Sync upserts fresh data without touching `dismissed` (dismissed rows stay dismissed).
 *  - Non-dismissed rows whose issue is resolved are auto-deleted (e.g. insurance renewed).
 *  - Once any admin dismisses a notification it stays gone for everyone.
 *
 * SECURITY:
 *  - All server functions use POST (TanStack Start CSRF protection works correctly
 *    only with POST; GET server functions bypass some middleware protections).
 *  - Every function calls requireAdmin() before touching data.
 *  - Errors from Supabase are surfaced (thrown) so the caller can react instead
 *    of silently swallowing them and showing a misleading "All clear" state.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Public types ──────────────────────────────────────────────────────────────

export type NotificationKind = "insurance" | "road_tax" | "manifest_zero_income";

export type NotificationItem = {
  id: string;
  kind: NotificationKind;
  ref_id: string;
  title: string;
  detail: string;
  days_left?: number | null;
  created_at: string;
};

type ComputedItem = {
  kind: NotificationKind;
  ref_id: string;
  title: string;
  detail: string;
  days_left: number | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function daysUntil(s: string, today: Date) {
  return Math.ceil((new Date(s).getTime() - today.getTime()) / 86_400_000);
}

/** Replicates client-side findEntry: location-id match, then pin-code fallback. */
function serverFindEntry(
  entries: Array<{
    contract_id: string;
    from_location_id?: string | null;
    to_location_id?: string | null;
    from_pin_code?: string | null;
    to_pin_code?: string | null;
    freight_route_ranges?: unknown;
    loading_route_ranges?: unknown;
  }>,
  m: {
    source_id?: string | null;
    from_location_id?: string | null;
    to_location_id?: string | null;
    from_pin_code?: string | null;
    to_pin_code?: string | null;
  },
) {
  if (!m.source_id) return undefined;
  const pool = entries.filter((e) => e.contract_id === m.source_id);
  const byLoc = pool.find(
    (e) => e.from_location_id && e.to_location_id &&
           e.from_location_id === m.from_location_id &&
           e.to_location_id   === m.to_location_id,
  );
  if (byLoc) return byLoc;
  const fp = (m.from_pin_code ?? "").trim();
  const tp = (m.to_pin_code  ?? "").trim();
  if (!fp || !tp) return undefined;
  return pool.find(
    (e) => (e.from_pin_code ?? "").trim() === fp && (e.to_pin_code ?? "").trim() === tp,
  );
}

function hasNonZeroRates(entry: { freight_route_ranges?: unknown; loading_route_ranges?: unknown }) {
  const check = (ranges: unknown) =>
    Array.isArray(ranges) && ranges.some((r) => r && Number(r.value ?? 0) !== 0);
  return check(entry.freight_route_ranges) || check(entry.loading_route_ranges);
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Verifies that the caller is an active admin. Throws on any failure.
 * Mirrors the pattern in vehicle-coverage.ts / requireAdmin().
 */
async function requireAdmin(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const { data, error } = await db
    .from("app_users")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Auth check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: user not found.");
  if (!(data as { is_active: boolean }).is_active) throw new Error("Forbidden: account is inactive.");
  if ((data as { role: string }).role !== "admin") throw new Error("Forbidden: admin access required.");
}

// ── Compute notifications from live data ──────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function computeItems(db: any): Promise<ComputedItem[]> {
  const today = new Date();
  const in30  = addDays(today, 30);
  const items: ComputedItem[] = [];

  // 1 & 2 — expiring insurance / road tax (within 30 days) ──────────────────
  const [{ data: insRows }, { data: rtRows }] = await Promise.all([
    db.from("vehicle_insurance").select("id,vehicle_id,end_date,insurance_number")
      .gte("end_date", isoDate(today)).lte("end_date", isoDate(in30)),
    db.from("vehicle_road_tax").select("id,vehicle_id,end_date,state")
      .gte("end_date", isoDate(today)).lte("end_date", isoDate(in30)),
  ]);

  const vIds = [...new Set([
    ...(insRows ?? []).map((r: Record<string,unknown>) => r.vehicle_id as string),
    ...(rtRows  ?? []).map((r: Record<string,unknown>) => r.vehicle_id as string),
  ].filter(Boolean))];
  const vMap = new Map<string, string>();
  if (vIds.length) {
    const { data: vs } = await db.from("vehicles").select("id,registration_number").in("id", vIds);
    for (const v of vs ?? []) vMap.set(v.id as string, (v.registration_number as string) ?? String(v.id));
  }

  for (const row of insRows ?? []) {
    const r  = row as Record<string, unknown>;
    const dl = daysUntil(r.end_date as string, today);
    const reg = vMap.get(r.vehicle_id as string) ?? String(r.vehicle_id);
    items.push({
      kind: "insurance", ref_id: `ins-${r.id}`,
      title:  `Insurance expiring in ${dl} day${dl !== 1 ? "s" : ""}`,
      detail: `${reg}${r.insurance_number ? ` — Policy ${r.insurance_number}` : ""} · due ${r.end_date}`,
      days_left: dl,
    });
  }
  for (const row of rtRows ?? []) {
    const r  = row as Record<string, unknown>;
    const dl = daysUntil(r.end_date as string, today);
    const reg = vMap.get(r.vehicle_id as string) ?? String(r.vehicle_id);
    items.push({
      kind: "road_tax", ref_id: `rt-${r.id}`,
      title:  `Road tax expiring in ${dl} day${dl !== 1 ? "s" : ""}`,
      detail: `${reg}${r.state ? ` — ${r.state}` : ""} · due ${r.end_date}`,
      days_left: dl,
    });
  }

  // 3 — open-trip manifests with ₹0 freight AND ₹0 loading ──────────────────
  const { data: openTrips } = await db.from("trips").select("id,trip_code").is("closed_at", null);
  const openIds = (openTrips ?? []).map((t: Record<string,unknown>) => t.id as string);

  if (openIds.length) {
    const { data: mfRows } = await db
      .from("trip_manifests")
      .select("id,trip_id,manifest_number,source_id,from_location_id,to_location_id,from_pin_code,to_pin_code")
      .in("trip_id", openIds);

    const mfs = (mfRows ?? []) as Array<{
      id: string; trip_id: string; manifest_number: string | null;
      source_id: string | null; from_location_id: string | null;
      to_location_id: string | null; from_pin_code: string | null; to_pin_code: string | null;
    }>;

    if (mfs.length) {
      const srcIds = [...new Set(mfs.map((m) => m.source_id).filter(Boolean) as string[])];
      type EntryRow = {
        contract_id: string; from_location_id: string | null; to_location_id: string | null;
        from_pin_code: string | null; to_pin_code: string | null;
        freight_route_ranges: unknown; loading_route_ranges: unknown;
      };
      const entries: EntryRow[] = srcIds.length
        ? ((await db.from("contract_entries")
            .select("contract_id,from_location_id,to_location_id,from_pin_code,to_pin_code,freight_route_ranges,loading_route_ranges")
            .in("contract_id", srcIds)).data ?? [])
        : [];

      const allLocIds = [...new Set(mfs.flatMap((m) => [m.from_location_id, m.to_location_id]).filter(Boolean) as string[])];
      const locMap = new Map<string, string>();
      if (allLocIds.length) {
        const { data: locs } = await db.from("locations").select("id,location_name").in("id", allLocIds);
        for (const l of locs ?? []) locMap.set(l.id as string, (l.location_name as string) ?? String(l.id));
      }
      const tripCodeMap = new Map<string,string>((openTrips ?? []).map(
        (t: Record<string,unknown>) => [t.id as string, t.trip_code as string],
      ));

      for (const m of mfs) {
        const entry = serverFindEntry(entries, m);
        if (entry && hasNonZeroRates(entry)) continue; // has valid rates → no alert

        const tripCode = tripCodeMap.get(m.trip_id) ?? m.trip_id;
        const from     = m.from_location_id ? (locMap.get(m.from_location_id) ?? m.from_location_id) : "?";
        const to       = m.to_location_id   ? (locMap.get(m.to_location_id)   ?? m.to_location_id)   : "?";
        const lr       = m.manifest_number ? `LR ${m.manifest_number}` : "Manifest";
        items.push({
          kind: "manifest_zero_income", ref_id: `mzi-${m.id}`,
          title:  `₹0 Freight & Loading — Trip ${tripCode}`,
          detail: `${lr}: ${from} → ${to} has no rates in source`,
          days_left: null,
        });
      }
    }
  }

  return items;
}

// ── Server functions ──────────────────────────────────────────────────────────

/**
 * Syncs computed notifications into the DB and returns all unread ones.
 *
 * Steps:
 *  1. Verify caller is an active admin.
 *  2. Compute fresh items.
 *  3. Fetch existing dismissed ref_ids → skip upserting those (dismissed stays frozen).
 *  4. Upsert non-dismissed items (INSERT ... ON CONFLICT DO UPDATE title/detail/days_left).
 *  5. Delete non-dismissed rows whose ref_id is no longer in the current computed set.
 *  6. Return all non-dismissed rows.
 */
export const serverSyncNotifications = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string() }))
  .handler(async ({ data: { userId } }): Promise<NotificationItem[]> => {
    await requireAdmin(userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const computed = await computeItems(db);
    const now = new Date().toISOString();

    // Fetch already-dismissed ref_ids so we never overwrite them
    const { data: dismissed, error: dismissedError } = await db
      .from("notifications").select("ref_id").eq("dismissed", true);
    if (dismissedError) throw new Error(`Failed to read dismissed notifications: ${dismissedError.message}`);
    const dismissedSet = new Set<string>((dismissed ?? []).map((r: Record<string,unknown>) => r.ref_id as string));

    // Upsert only non-dismissed items
    const toUpsert = computed
      .filter((c) => !dismissedSet.has(c.ref_id))
      .map((c) => ({
        kind: c.kind, ref_id: c.ref_id,
        title: c.title, detail: c.detail, days_left: c.days_left,
        updated_at: now,
      }));

    if (toUpsert.length) {
      const { error: upsertError } = await db.from("notifications").upsert(toUpsert, { onConflict: "kind,ref_id", ignoreDuplicates: false });
      if (upsertError) throw new Error(`Failed to upsert notifications: ${upsertError.message}`);
    }

    // Delete non-dismissed rows that are no longer in the computed set (issue resolved)
    const currentRefIds = computed.map((c) => c.ref_id);
    const { data: existing, error: existingError } = await db
      .from("notifications").select("id,ref_id").eq("dismissed", false);
    if (existingError) throw new Error(`Failed to read existing notifications: ${existingError.message}`);
    const toDelete = (existing ?? [])
      .filter((r: Record<string,unknown>) => !currentRefIds.includes(r.ref_id as string))
      .map((r: Record<string,unknown>) => r.id as string);
    if (toDelete.length) {
      const { error: deleteError } = await db.from("notifications").delete().in("id", toDelete);
      if (deleteError) throw new Error(`Failed to delete resolved notifications: ${deleteError.message}`);
    }

    // Return all unread
    const { data, error: readError } = await db
      .from("notifications")
      .select("id,kind,ref_id,title,detail,days_left,created_at")
      .eq("dismissed", false)
      .order("days_left", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    if (readError) throw new Error(`Failed to read notifications: ${readError.message}`);

    return (data ?? []) as NotificationItem[];
  });

/** Marks a notification dismissed for all admins. */
export const serverDismissNotification = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string(), id: z.string(), dismissedBy: z.string() }))
  .handler(async ({ data: { userId, id, dismissedBy } }) => {
    await requireAdmin(userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const { error } = await db.from("notifications").update({
      dismissed: true,
      dismissed_at: new Date().toISOString(),
      dismissed_by: dismissedBy,
    }).eq("id", id);
    if (error) throw new Error(`Failed to dismiss notification: ${error.message}`);
    return { ok: true };
  });

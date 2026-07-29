/**
 * ensure-location.ts
 *
 * Silent auto-create helpers: given a PIN code, check the DB first;
 * if not found, call Indian Post API and insert the location.
 * Used by LocationPinPair (live typing) and all CSV import handlers.
 */

import { supabase } from "@/integrations/supabase/client";
import { lookupIndiaPin } from "@/lib/india-post";

/**
 * Ensures a location exists for a given 6-digit PIN.
 *  - Already in DB  → returns its id (no API call).
 *  - Unknown PIN    → calls Indian Post, inserts, returns new id.
 *  - API/DB failure → returns null (caller keeps pin_code, no location_id).
 */
export async function ensureLocationForPin(pin: string): Promise<string | null> {
  const p = (pin ?? "").trim();
  if (!/^\d{6}$/.test(p)) return null;

  // Check DB first — never re-fetch a known PIN
  const { data: existing } = await supabase
    .from("locations")
    .select("id")
    .eq("pin_code", p)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  // Unknown — call Indian Post API
  const result = await lookupIndiaPin(p);
  if (!result) return null;

  // Insert silently using district as the location name
  const { data, error } = await supabase
    .from("locations")
    .insert({
      location_name: result.district,
      location_type: "Domestic",
      city: result.district,
      district: result.district,
      state: result.state,
      country: result.country,
      pin_code: p,
    })
    .select("id")
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

/**
 * Batch version for CSV import.
 * Takes a list of raw pin strings and the existing pin→id map.
 * Deduplicates, skips already-known pins, creates missing ones,
 * and returns a merged map with the new ids included.
 */
export async function ensureLocationsForPins(
  pins: string[],
  existingPinToId: Map<string, string>,
): Promise<Map<string, string>> {
  const merged = new Map<string, string>(existingPinToId);

  const unknown = [
    ...new Set(
      pins
        .map((p) => (p ?? "").trim())
        .filter((p) => /^\d{6}$/.test(p) && !merged.has(p)),
    ),
  ];
  if (!unknown.length) return merged;

  await Promise.all(
    unknown.map(async (pin) => {
      const id = await ensureLocationForPin(pin);
      if (id) merged.set(pin, id);
    }),
  );
  return merged;
}

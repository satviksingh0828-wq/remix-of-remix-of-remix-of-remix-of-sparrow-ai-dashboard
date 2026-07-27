import { supabase } from "@/integrations/supabase/client";

/**
 * Reopens a closed trip: restores the trip, its manifests, other income and
 * expenses from the archived snapshot back into the live tables, then deletes
 * the closed_trips row. Rates are NOT copied from the snapshot — the reopened
 * trip re-reads the current contract entries, so any rate changes take
 * effect. The trip can be closed again afterwards.
 */
export async function reopenTrip(closedId: string) {
  const { data: closed, error } = await supabase
    .from("closed_trips")
    .select("*")
    .eq("id", closedId)
    .single();
  if (error || !closed) throw new Error(error?.message ?? "Closed trip not found");

  const snap = (closed as { snapshot: Record<string, unknown> }).snapshot ?? {};
  const tripSnap = (snap.trip as Record<string, unknown>) ?? {};
  const manifests = (snap.manifests as Record<string, unknown>[]) ?? [];
  const otherIncome = (snap.other_income as Record<string, unknown>[]) ?? [];
  const expenses = (snap.expenses as Record<string, unknown>[]) ?? [];

  const strip = (r: Record<string, unknown>) => {
    const { id, created_at, updated_at, ...rest } = r;
    void id;
    void created_at;
    void updated_at;
    return rest;
  };

  const tripInsert = await supabase
    .from("trips")
    .insert(strip(tripSnap) as never)
    .select("id")
    .single();
  if (tripInsert.error || !tripInsert.data)
    throw new Error(tripInsert.error?.message ?? "Could not restore trip");
  const newTripId = (tripInsert.data as { id: string }).id;

  const rewire = (rows: Record<string, unknown>[]) =>
    rows.map((r) => ({ ...strip(r), trip_id: newTripId }));

  if (manifests.length) {
    const res = await supabase
      .from("trip_manifests")
      .insert(rewire(manifests) as never);
    if (res.error) throw new Error(res.error.message);
  }
  if (otherIncome.length) {
    const res = await supabase
      .from("trip_other_income")
      .insert(rewire(otherIncome) as never);
    if (res.error) throw new Error(res.error.message);
  }
  if (expenses.length) {
    const res = await supabase
      .from("trip_expenses")
      .insert(rewire(expenses) as never);
    if (res.error) throw new Error(res.error.message);
  }

  const del = await supabase.from("closed_trips").delete().eq("id", closedId);
  if (del.error) throw new Error(del.error.message);

  return newTripId;
}

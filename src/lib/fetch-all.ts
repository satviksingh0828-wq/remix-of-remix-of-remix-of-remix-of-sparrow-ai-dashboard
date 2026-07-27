import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";

/**
 * Supabase's Data API caps a single response at ~1000 rows. `fetchAll` transparently
 * pages through the given query in chunks so the caller sees the full result set.
 *
 * Usage:
 *   const rows = await fetchAll(
 *     () => supabase.from("trips").select("*").order("created_at", { ascending: false })
 *   );
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = PostgrestFilterBuilder<any, any, any, any, any>;

export async function fetchAll<T = unknown>(
  buildQuery: () => AnyQuery,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // hard safety cap to avoid runaway loops on unbounded tables
  const HARD_CAP = 500_000;
  while (from < HARD_CAP) {
    const to = from + pageSize - 1;
    // build a fresh query each page — Supabase builders are one-shot
    const res = await (buildQuery().range(from, to) as unknown as Promise<{
      data: T[] | null;
      error: { message: string } | null;
    }>);
    if (res.error) throw new Error(res.error.message);
    const batch = res.data ?? [];
    out.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

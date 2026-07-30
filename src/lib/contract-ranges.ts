/** A single rate slab defined per route entry.
 *
 *  `start`   — lower bound (inclusive). Upper bound is implied by the next
 *              slab's start (last slab is open-ended).
 *  `working` — "rate": charge × actual units (weight or qty).
 *              "fixed": flat amount regardless of units.
 *  `value`   — the rate or flat charge amount.
 */
export type RouteRange = {
  start: string;
  working: "rate" | "fixed";
  value: string;
};

/** Short display label, e.g. "≥ 0 kg" */
export function routeRangeLabel(r: RouteRange, unit: string): string {
  return `≥ ${r.start || "0"} ${unit}`;
}

export function routeRangeUnit(rangeType: "weight" | "quantity"): string {
  return rangeType === "weight" ? "kg" : "qty";
}

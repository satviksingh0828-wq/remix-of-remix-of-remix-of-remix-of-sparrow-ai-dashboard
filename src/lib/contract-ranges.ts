export type ChargeType = "rate" | "fixed";
export type Range = { from: string; to: string; charge_type?: ChargeType };
export type Basis = "weight" | "quantity";

/** Short display label for a slab, e.g. "0–100 kg" or "500+ kg" */
export function rangeLabel(r: Range, unit: string): string {
  const from = (r.from || "0").trim();
  const to   = (r.to   || "").trim();
  return to ? `${from}–${to} ${unit}` : `${from}+ ${unit}`;
}

/**
 * Boundary-inclusivity note shown in the UI so the user knows exactly which
 * values fall into this slab.
 *   matching rule: value >= from  AND  (to blank OR value <= to)
 */
export function rangeBoundsNote(r: Range, unit: string): string {
  const from = (r.from || "0").trim();
  const to   = (r.to   || "").trim();
  return to
    ? `≥ ${from} ${unit}  and  ≤ ${to} ${unit}  (both ends inclusive)`
    : `≥ ${from} ${unit}  (no upper limit)`;
}

export function rangeKey(r: Range): string {
  const from = (r.from || "0").trim();
  const to   = (r.to   || "").trim();
  return to ? `${from}-${to}` : `${from}+`;
}

export function basisRanges(
  contract: { weight_ranges: Range[]; quantity_ranges: Range[] },
  basis: Basis,
): Range[] {
  return basis === "weight" ? contract.weight_ranges : contract.quantity_ranges;
}

export function basisUnit(basis: Basis): string {
  return basis === "weight" ? "kg" : "qty";
}

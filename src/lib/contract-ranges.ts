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

export type ContractForRanges = {
  weight_ranges: Range[];
  weight_ranges_2?: Range[];
  quantity_ranges: Range[];
  quantity_ranges_2?: Range[];
  freight_weight_set?: number;
  loading_weight_set?: number;
  freight_quantity_set?: number;
  loading_quantity_set?: number;
};

/**
 * Returns the correct range array for a given basis and charge kind.
 * When freight and loading use "weight" or "quantity", each can independently
 * target set 1 or set 2 (as stored on the contract).
 */
export function basisRanges(
  contract: ContractForRanges,
  basis: Basis,
  chargeKind?: "freight" | "loading",
): Range[] {
  if (basis === "quantity") {
    const setNum =
      chargeKind === "loading"
        ? (contract.loading_quantity_set ?? 1)
        : (contract.freight_quantity_set ?? 1);
    return setNum === 2 ? (contract.quantity_ranges_2 ?? contract.quantity_ranges) : contract.quantity_ranges;
  }
  // weight — choose set 1 or 2 based on chargeKind
  const setNum =
    chargeKind === "loading"
      ? (contract.loading_weight_set ?? 1)
      : (contract.freight_weight_set ?? 1);
  return setNum === 2 ? (contract.weight_ranges_2 ?? contract.weight_ranges) : contract.weight_ranges;
}

export function basisUnit(basis: Basis): string {
  return basis === "weight" ? "kg" : "qty";
}

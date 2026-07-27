export type Range = { from: string; to: string };
export type Basis = "weight" | "quantity";

export function rangeLabel(r: Range, unit: string): string {
  const from = (r.from || "0").trim();
  const to = (r.to || "").trim();
  return to ? `${from}-${to} ${unit}` : `${from}+ ${unit}`;
}

export function rangeKey(r: Range): string {
  const from = (r.from || "0").trim();
  const to = (r.to || "").trim();
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

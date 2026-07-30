import type { RouteRange } from "./contract-ranges";

export type ContractLite = {
  id: string;
  contract_name: string;
  company_name?: string | null;
  gstin?: string | null;
  fixed_monthly_charge?: string | number | null;
  fixed_yearly_charge?: string | number | null;
};

export type EntryLite = {
  id: string;
  contract_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  from_pin_code: string | null;
  to_pin_code: string | null;
  freight_route_range_type: "weight" | "quantity";
  freight_route_ranges: RouteRange[];
  loading_route_range_type: "weight" | "quantity";
  loading_route_ranges: RouteRange[];
  per_manifest_amount: string | null;
};

export type ManifestLite = {
  from_location_id: string | null;
  to_location_id: string | null;
  from_pin_code: string | null;
  to_pin_code: string | null;
  weight_kg: string | null;
  quantity: string | null;
};

export function num(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function findEntry(entries: EntryLite[], m: ManifestLite): EntryLite | undefined {
  const byId = entries.find(
    (e) =>
      e.from_location_id &&
      e.to_location_id &&
      e.from_location_id === m.from_location_id &&
      e.to_location_id === m.to_location_id,
  );
  if (byId) return byId;
  const fp = (m.from_pin_code ?? "").trim();
  const tp = (m.to_pin_code ?? "").trim();
  if (!fp || !tp) return undefined;
  return entries.find(
    (e) => (e.from_pin_code ?? "").trim() === fp && (e.to_pin_code ?? "").trim() === tp,
  );
}

/**
 * Finds the matching slab: the last range whose start ≤ value (ranges sorted
 * ascending by start). This means:
 *   - ranges [0, 100, 500] with value 250  → matches "100" slab
 *   - ranges [0, 100, 500] with value 600  → matches "500" slab
 *   - value below the first slab start     → no match → 0 charge
 */
function matchRouteRange(ranges: RouteRange[], value: number): RouteRange | undefined {
  const sorted = [...ranges].sort((a, b) => num(a.start) - num(b.start));
  let matched: RouteRange | undefined;
  for (const r of sorted) {
    if (value >= num(r.start)) matched = r;
  }
  return matched;
}

export function manifestCharges(
  contract: ContractLite | undefined,
  entry: EntryLite | undefined,
  m: ManifestLite,
): { freight: number; loading: number; fixed: number; matched: boolean } {
  if (!contract || !entry) return { freight: 0, loading: 0, fixed: 0, matched: false };

  const pick = (ranges: RouteRange[], rangeType: "weight" | "quantity"): number => {
    const value = rangeType === "weight" ? num(m.weight_kg) : num(m.quantity);
    const r = matchRouteRange(ranges ?? [], value);
    if (!r) return 0;
    const rate = num(r.value);
    return r.working === "fixed" ? rate : rate * value;
  };

  return {
    freight: pick(
      entry.freight_route_ranges ?? [],
      entry.freight_route_range_type ?? "weight",
    ),
    loading: pick(
      entry.loading_route_ranges ?? [],
      entry.loading_route_range_type ?? "weight",
    ),
    fixed: num(entry.per_manifest_amount),
    matched: true,
  };
}

export function newTripCode(prefix?: string | null): string {
  let digits = "";
  for (let i = 0; i < 10; i++) digits += Math.floor(Math.random() * 10);
  const p = (prefix ?? "").trim().toUpperCase() || "TR";
  return `${p}-${digits}`;
}

import { basisRanges, rangeKey, type Basis, type ChargeType, type Range } from "./contract-ranges";

export type ContractLite = {
  id: string;
  contract_name: string;
  weight_ranges: Range[];
  weight_ranges_2?: Range[];
  quantity_ranges: Range[];
  quantity_ranges_2?: Range[];
  freight_basis: Basis;
  loading_basis: Basis;
  freight_weight_set?: number;
  loading_weight_set?: number;
  freight_quantity_set?: number;
  loading_quantity_set?: number;
};

export type EntryLite = {
  id: string;
  contract_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  from_pin_code: string | null;
  to_pin_code: string | null;
  freight_values: Record<string, string>;
  loading_values: Record<string, string>;
  /** Per-slab charge type overrides for freight. Missing keys fall back to contract range charge_type. */
  freight_charge_types?: Record<string, string>;
  /** Per-slab charge type overrides for loading. Missing keys fall back to contract range charge_type. */
  loading_charge_types?: Record<string, string>;
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

function matchRange(ranges: Range[], value: number): Range | undefined {
  return ranges.find((r) => {
    const from = num(r.from);
    const to = (r.to ?? "").trim();
    return value >= from && (to === "" || value <= num(to));
  });
}

export function manifestCharges(
  contract: ContractLite | undefined,
  entry: EntryLite | undefined,
  m: ManifestLite,
): { freight: number; loading: number; fixed: number; matched: boolean } {
  if (!contract || !entry) return { freight: 0, loading: 0, fixed: 0, matched: false };
  const pick = (
    basis: Basis,
    values: Record<string, string>,
    chargeKind: "freight" | "loading",
    entryChargeTypes?: Record<string, string>,
  ) => {
    const value = basis === "weight" ? num(m.weight_kg) : num(m.quantity);
    const r = matchRange(basisRanges(contract, basis, chargeKind), value);
    if (!r) return 0;
    const key = rangeKey(r);
    const rate = num(values?.[key]);
    // Entry-level charge_type takes priority over contract-level range charge_type.
    // Both fall back to "rate" (historic default) when absent.
    const entryOverride = entryChargeTypes?.[key];
    const effectiveCt: ChargeType =
      (entryOverride === "fixed" || entryOverride === "rate"
        ? entryOverride
        : r.charge_type) ?? "rate";
    // "fixed" → flat charge for the slab, no multiplication.
    // "rate" → rate × units (weight or qty).
    return effectiveCt === "fixed" ? rate : rate * value;
  };
  return {
    freight: pick(
      contract.freight_basis,
      entry.freight_values ?? {},
      "freight",
      entry.freight_charge_types ?? {},
    ),
    loading: pick(
      contract.loading_basis,
      entry.loading_values ?? {},
      "loading",
      entry.loading_charge_types ?? {},
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

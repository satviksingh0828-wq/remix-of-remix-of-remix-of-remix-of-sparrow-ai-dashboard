import { basisRanges, rangeKey, type Basis, type Range } from "./contract-ranges";

export type ContractLite = {
  id: string;
  contract_name: string;
  weight_ranges: Range[];
  quantity_ranges: Range[];
  freight_basis: Basis;
  loading_basis: Basis;
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
  const pick = (basis: Basis, values: Record<string, string>) => {
    const value = basis === "weight" ? num(m.weight_kg) : num(m.quantity);
    const r = matchRange(basisRanges(contract, basis), value);
    if (!r) return 0;
    const rate = num(values?.[rangeKey(r)]);
    // "fixed" → flat charge for the slab, no multiplication.
    // "rate" (default) → rate × units (weight or qty).
    return r.charge_type === "fixed" ? rate : rate * value;
  };
  return {
    freight: pick(contract.freight_basis, entry.freight_values ?? {}),
    loading: pick(contract.loading_basis, entry.loading_values ?? {}),
    fixed: num(entry.per_manifest_amount),
    matched: true,
  };
}

export function newTripCode(): string {
  let digits = "";
  for (let i = 0; i < 10; i++) digits += Math.floor(Math.random() * 10);
  return `TR-${digits}`;
}

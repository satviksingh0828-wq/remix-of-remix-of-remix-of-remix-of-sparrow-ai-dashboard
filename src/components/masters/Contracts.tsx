import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CsvIO } from "@/components/CsvIO";
import { rangeKey, rangeLabel, basisRanges, basisUnit } from "@/lib/contract-ranges";
import type { Range } from "@/lib/contract-ranges";
import { fetchAll } from "@/lib/fetch-all";
import { ContractForm, EMPTY_CONTRACT, type ContractRow } from "./ContractForm";
import {
  ContractEntryForm,
  emptyEntry,
  type EntryRow,
} from "./ContractEntryForm";

const CONTRACT_COLUMNS = [
  "contract_name",
  "weight_ranges",
  "quantity_ranges",
  "freight_basis",
  "loading_basis",
  "company_name",
  "legal_business_name",
  "company_type",
  "industry",
  "pan",
  "gstin",
  "cin",
  "msme_udyam",
  "tan",
  "iec",
  "address_line1",
  "address_line2",
  "city",
  "state",
  "country",
  "pin_code",
  "mobile_number",
  "telephone_number",
  "email",
  "website",
];

type View =
  | { kind: "list" }
  | { kind: "new-contract" }
  | { kind: "edit-contract"; contract: ContractRow }
  | { kind: "entries"; contract: ContractRow }
  | { kind: "new-entry"; contract: ContractRow }
  | { kind: "edit-entry"; contract: ContractRow; entry: EntryRow };

export function Contracts() {
  const [view, setView] = useState<View>({ kind: "list" });
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchAll<ContractRow>(() =>
        supabase.from("contracts").select("*").order("created_at", { ascending: true }),
      );
      setContracts(rows);
    } catch {
      toast.error("Could not load contracts");
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function removeContract(id: string) {
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Contract removed");
    load();
  }

  async function onImportContracts(rows: Record<string, string>[]) {
    const payload = rows
      .filter((r) => (r.contract_name || "").trim() !== "")
      .map((r) => {
        const o: Record<string, unknown> = {};
        for (const k of CONTRACT_COLUMNS) o[k] = r[k] ?? "";
        // parse json range columns
        try {
          o.weight_ranges = r.weight_ranges ? JSON.parse(r.weight_ranges) : [];
        } catch {
          o.weight_ranges = [];
        }
        try {
          o.quantity_ranges = r.quantity_ranges ? JSON.parse(r.quantity_ranges) : [];
        } catch {
          o.quantity_ranges = [];
        }
        o.freight_basis = (r.freight_basis || "weight").trim() || "weight";
        o.loading_basis = (r.loading_basis || "weight").trim() || "weight";
        return o;
      });
    if (payload.length === 0) return { inserted: 0, failed: rows.length };
    const { error, count } = await supabase
      .from("contracts")
      .insert(payload as never, { count: "exact" });
    if (error) {
      toast.error(error.message);
      return { inserted: 0, failed: payload.length };
    }
    await load();
    return { inserted: count ?? payload.length, failed: rows.length - payload.length };
  }

  const exportRows = contracts.map((c) => ({
    ...c,
    weight_ranges: JSON.stringify(c.weight_ranges ?? []),
    quantity_ranges: JSON.stringify(c.quantity_ranges ?? []),
  })) as Record<string, unknown>[];

  if (view.kind === "new-contract") {
    return (
      <ContractForm
        initial={{ ...EMPTY_CONTRACT }}
        onCancel={() => setView({ kind: "list" })}
        onSaved={() => {
          setView({ kind: "list" });
          load();
        }}
      />
    );
  }
  if (view.kind === "edit-contract") {
    return (
      <ContractForm
        initial={view.contract}
        onCancel={() => setView({ kind: "list" })}
        onSaved={() => {
          setView({ kind: "list" });
          load();
        }}
      />
    );
  }

  if (view.kind === "entries" || view.kind === "new-entry" || view.kind === "edit-entry") {
    return (
      <EntriesView
        contract={view.contract}
        view={view}
        onBack={() => setView({ kind: "list" })}
        onNew={() => setView({ kind: "new-entry", contract: view.contract })}
        onEdit={(e) =>
          setView({ kind: "edit-entry", contract: view.contract, entry: e })
        }
        onCancelForm={() => setView({ kind: "entries", contract: view.contract })}
      />
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Contracts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Freight contracts with weight or quantity slabs. Open a contract to add
            route-wise entries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvIO
            entityLabel="Contracts"
            filename="contracts"
            columns={CONTRACT_COLUMNS}
            rows={exportRows}
            onImport={onImportContracts}
          />
          <Button onClick={() => setView({ kind: "new-contract" })}>
            <Plus className="size-4" />
            New contract
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : contracts.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <FileText className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">No contracts yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first contract to define weight and quantity slabs.
          </p>
          <Button className="mt-5" onClick={() => setView({ kind: "new-contract" })}>
            <Plus className="size-4" />
            New contract
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {contracts.map((c, i) => (
            <li
              key={c.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className="surface-card animate-fade-up flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.contract_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Freight: {c.freight_basis} · Loading: {c.loading_basis} ·{" "}
                  {(c.weight_ranges as Range[])?.length ?? 0} weight slabs ·{" "}
                  {(c.quantity_ranges as Range[])?.length ?? 0} qty slabs
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  onClick={() => setView({ kind: "entries", contract: c })}
                >
                  Open
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setView({ kind: "edit-contract", contract: c })}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => c.id && removeContract(c.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EntriesView({
  contract,
  view,
  onBack,
  onNew,
  onEdit,
  onCancelForm,
}: {
  contract: ContractRow;
  view: View;
  onBack: () => void;
  onNew: () => void;
  onEdit: (e: EntryRow) => void;
  onCancelForm: () => void;
}) {
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [locNames, setLocNames] = useState<Record<string, string>>({});

  const freightRanges = basisRanges(contract, contract.freight_basis);
  const loadingRanges = basisRanges(contract, contract.loading_basis);
  const freightUnit = basisUnit(contract.freight_basis);
  const loadingUnit = basisUnit(contract.loading_basis);

  const entryColumns = useMemo(() => {
    const freightCols = freightRanges.map((r) => `freight_${rangeKey(r)}`);
    const loadingCols = loadingRanges.map((r) => `loading_${rangeKey(r)}`);
    return [
      "from_location",
      "from_pin_code",
      "to_location",
      "to_pin_code",
      ...freightCols,
      ...loadingCols,
      "per_manifest_amount",
      "per_manifest_note",
    ];
  }, [freightRanges, loadingRanges]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("contract_entries")
      .select("*")
      .eq("contract_id", contract.id!)
      .order("created_at", { ascending: true });
    if (error) toast.error("Could not load entries");
    const rows = (data as unknown as EntryRow[]) ?? [];
    setEntries(rows);
    // load location names
    const ids = Array.from(
      new Set(
        rows.flatMap((r) => [r.from_location_id, r.to_location_id]).filter(Boolean),
      ),
    ) as string[];
    if (ids.length) {
      const { data: locs } = await supabase
        .from("locations")
        .select("id,location_name")
        .in("id", ids);
      const map: Record<string, string> = {};
      (locs ?? []).forEach((l) => {
        map[l.id as string] = l.location_name as string;
      });
      setLocNames(map);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [contract.id]);

  async function remove(id: string) {
    const { error } = await supabase.from("contract_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Entry removed");
    load();
  }

  async function onImport(rows: Record<string, string>[]) {
    // Build location lookups so a missing name or PIN auto-fills from the other.
    const { data: locs } = await supabase
      .from("locations")
      .select("id,location_name,pin_code");
    const all = (locs ?? []) as { id: string; location_name: string; pin_code: string | null }[];
    const nameToId = new Map(all.map((l) => [l.location_name.trim().toLowerCase(), l.id]));
    const pinToId = new Map(
      all
        .filter((l) => (l.pin_code ?? "").trim() !== "")
        .map((l) => [(l.pin_code ?? "").trim(), l.id]),
    );
    const pinById = new Map(all.map((l) => [l.id, (l.pin_code ?? "").trim()]));

    // PIN takes precedence — importing with only a PIN auto-fills the matching location.
    const resolve = (name: string, pin: string) => {
      const n = (name ?? "").trim().toLowerCase();
      const p = (pin ?? "").trim();
      const id = pinToId.get(p) ?? nameToId.get(n) ?? null;
      return { id, pin: p || (id ? pinById.get(id) ?? "" : "") };
    };

    const payload = rows.map((r) => {
      const freight_values: Record<string, string> = {};
      freightRanges.forEach((rg) => {
        const k = rangeKey(rg);
        const v = r[`freight_${k}`];
        if (v !== undefined && v !== "") freight_values[k] = v;
      });
      const loading_values: Record<string, string> = {};
      loadingRanges.forEach((rg) => {
        const k = rangeKey(rg);
        const v = r[`loading_${k}`];
        if (v !== undefined && v !== "") loading_values[k] = v;
      });
      const from = resolve(r.from_location ?? "", r.from_pin_code ?? "");
      const to = resolve(r.to_location ?? "", r.to_pin_code ?? "");
      return {
        contract_id: contract.id!,
        from_location_id: from.id,
        to_location_id: to.id,
        from_pin_code: from.pin,
        to_pin_code: to.pin,
        freight_values,
        loading_values,
        per_manifest_amount: r.per_manifest_amount ?? "",
        per_manifest_note: r.per_manifest_note ?? "",
      };
    });
    if (payload.length === 0) return { inserted: 0, failed: rows.length };
    const { error, count } = await supabase
      .from("contract_entries")
      .insert(payload as never, { count: "exact" });
    if (error) {
      toast.error(error.message);
      return { inserted: 0, failed: payload.length };
    }
    await load();
    return { inserted: count ?? payload.length, failed: rows.length - payload.length };
  }

  const exportRows = entries.map((e) => {
    const row: Record<string, unknown> = {
      from_location: e.from_location_id ? locNames[e.from_location_id] ?? "" : "",
      from_pin_code: e.from_pin_code,
      to_location: e.to_location_id ? locNames[e.to_location_id] ?? "" : "",
      to_pin_code: e.to_pin_code,
      per_manifest_amount: e.per_manifest_amount,
      per_manifest_note: e.per_manifest_note,
    };
    freightRanges.forEach((r) => {
      const k = rangeKey(r);
      row[`freight_${k}`] = (e.freight_values ?? {})[k] ?? "";
    });
    loadingRanges.forEach((r) => {
      const k = rangeKey(r);
      row[`loading_${k}`] = (e.loading_values ?? {})[k] ?? "";
    });
    return row;
  });

  if (view.kind === "new-entry") {
    return (
      <ContractEntryForm
        contract={contract}
        initial={emptyEntry(contract.id!)}
        onCancel={onCancelForm}
        onSaved={() => {
          onCancelForm();
          load();
        }}
      />
    );
  }
  if (view.kind === "edit-entry") {
    return (
      <ContractEntryForm
        contract={contract}
        initial={view.entry}
        onCancel={onCancelForm}
        onSaved={() => {
          onCancelForm();
          load();
        }}
      />
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Contracts
          </Button>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {contract.contract_name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Freight: {contract.freight_basis} · Loading: {contract.loading_basis}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvIO
            entityLabel="Entries"
            filename={`${contract.contract_name.replace(/\s+/g, "_")}-entries`}
            columns={entryColumns}
            rows={exportRows}
            onImport={onImport}
          />
          <Button onClick={onNew}>
            <Plus className="size-4" />
            New entry
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <FileText className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">No entries yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add trip-wise rates for this contract, or import a filled template.
          </p>
          <Button className="mt-5" onClick={onNew}>
            <Plus className="size-4" />
            New entry
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map((e, i) => {
            const from = e.from_location_id ? locNames[e.from_location_id] : "";
            const to = e.to_location_id ? locNames[e.to_location_id] : "";
            const firstFreight = freightRanges[0];
            const preview = firstFreight
              ? `${rangeLabel(firstFreight, freightUnit)}: ${
                  (e.freight_values ?? {})[rangeKey(firstFreight)] ?? "—"
                }`
              : "";
            return (
              <li
                key={e.id}
                style={{ animationDelay: `${i * 40}ms` }}
                className="surface-card animate-fade-up flex items-center gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {(from || "—") + " → " + (to || "—")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[e.from_pin_code, e.to_pin_code].filter(Boolean).join(" → ")}
                    {preview ? " · " + preview : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit(e)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => e.id && remove(e.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

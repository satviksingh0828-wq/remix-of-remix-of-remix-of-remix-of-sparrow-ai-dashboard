import { useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationPinPair } from "@/components/LocationPinPair";
import { basisRanges, basisUnit, rangeBoundsNote, rangeKey, rangeLabel } from "@/lib/contract-ranges";
import type { ContractRow } from "./ContractForm";

export type EntryRow = {
  id?: string;
  contract_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  from_pin_code: string;
  to_pin_code: string;
  freight_values: Record<string, string>;
  loading_values: Record<string, string>;
  per_manifest_amount: string;
  per_manifest_note: string;
};

export function emptyEntry(contract_id: string): EntryRow {
  return {
    contract_id,
    from_location_id: null,
    to_location_id: null,
    from_pin_code: "",
    to_pin_code: "",
    freight_values: {},
    loading_values: {},
    per_manifest_amount: "",
    per_manifest_note: "",
  };
}

function AmountNote({
  title,
  amount,
  note,
  onAmount,
  onNote,
}: {
  title: string;
  amount: string;
  note: string;
  onAmount: (v: string) => void;
  onNote: (v: string) => void;
}) {
  return (
    <section className="surface-card p-6">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Amount</Label>
          <Input
            type="number"
            className="h-10"
            value={amount}
            onChange={(e) => onAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-medium text-muted-foreground">Note</Label>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => onNote(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}

export function ContractEntryForm({
  contract,
  initial,
  onCancel,
  onSaved,
}: {
  contract: ContractRow;
  initial: EntryRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EntryRow>(initial);
  const [saving, setSaving] = useState(false);

  const freightRanges = basisRanges(contract, contract.freight_basis);
  const freightUnit = basisUnit(contract.freight_basis);
  const loadingRanges = basisRanges(contract, contract.loading_basis);
  const loadingUnit = basisUnit(contract.loading_basis);

  const patch = (p: Partial<EntryRow>) => setForm((f) => ({ ...f, ...p }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { id, ...rest } = form;
    const payload = rest as never;
    const res = id
      ? await supabase.from("contract_entries").update(payload).eq("id", id)
      : await supabase.from("contract_entries").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(id ? "Entry updated" : "Entry added");
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} className="animate-fade-up space-y-5">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="size-4" />
          Back to entries
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">
          {form.id ? "Edit entry" : "New entry"}
        </h2>
      </div>

      <section className="surface-card p-6">
        <h3 className="text-sm font-semibold tracking-tight">Route</h3>
        <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <LocationPinPair
            label="From"
            locationId={form.from_location_id}
            pinCode={form.from_pin_code}
            onChange={(n) =>
              patch({ from_location_id: n.location_id, from_pin_code: n.pin_code })
            }
          />
          <LocationPinPair
            label="To"
            locationId={form.to_location_id}
            pinCode={form.to_pin_code}
            onChange={(n) =>
              patch({ to_location_id: n.location_id, to_pin_code: n.pin_code })
            }
          />
        </div>
      </section>

      <section className="surface-card p-6">
        <h3 className="text-sm font-semibold tracking-tight">
          Freight ({contract.freight_basis})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter the amount for each {contract.freight_basis} slab.{" "}
          <span className="font-medium text-foreground">Rate ×</span> slabs are multiplied by
          actual {contract.freight_basis};{" "}
          <span className="font-medium text-amber-700 dark:text-amber-300">Fixed ₹</span> slabs are
          a flat charge regardless of {contract.freight_basis}.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          {freightRanges.map((r) => {
            const key = rangeKey(r);
            const isFixed = r.charge_type === "fixed";
            return (
              <div key={`f-${key}`} className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {rangeLabel(r, freightUnit)}{" "}
                  <span className={`ml-1 rounded px-1 py-0.5 text-[10px] font-semibold ${
                    isFixed
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isFixed ? "Fixed ₹" : "Rate ×"}
                  </span>
                </Label>
                <p className="text-[10px] text-muted-foreground/70">
                  {rangeBoundsNote(r, freightUnit)}
                </p>
                <Input
                  type="number"
                  className="h-10"
                  placeholder={isFixed ? "Flat charge (₹)" : `Rate per ${freightUnit}`}
                  value={form.freight_values[key] ?? ""}
                  onChange={(e) =>
                    patch({
                      freight_values: { ...form.freight_values, [key]: e.target.value },
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-card p-6">
        <h3 className="text-sm font-semibold tracking-tight">
          Loading charges ({contract.loading_basis})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Rate ×</span> slabs are multiplied by
          actual {contract.loading_basis};{" "}
          <span className="font-medium text-amber-700 dark:text-amber-300">Fixed ₹</span> slabs are
          a flat charge.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          {loadingRanges.map((r) => {
            const key = rangeKey(r);
            const isFixed = r.charge_type === "fixed";
            return (
              <div key={`l-${key}`} className="space-y-1">
                <Label className="text-xs font-medium text-muted-foreground">
                  {rangeLabel(r, loadingUnit)}{" "}
                  <span className={`ml-1 rounded px-1 py-0.5 text-[10px] font-semibold ${
                    isFixed
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isFixed ? "Fixed ₹" : "Rate ×"}
                  </span>
                </Label>
                <p className="text-[10px] text-muted-foreground/70">
                  {rangeBoundsNote(r, loadingUnit)}
                </p>
                <Input
                  type="number"
                  className="h-10"
                  placeholder={isFixed ? "Flat charge (₹)" : `Rate per ${loadingUnit}`}
                  value={form.loading_values[key] ?? ""}
                  onChange={(e) =>
                    patch({
                      loading_values: { ...form.loading_values, [key]: e.target.value },
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <AmountNote
        title="Per manifest change"
        amount={form.per_manifest_amount}
        note={form.per_manifest_note}
        onAmount={(v) => patch({ per_manifest_amount: v })}
        onNote={(v) => patch({ per_manifest_note: v })}
      />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving…" : "Save entry"}
        </Button>
      </div>
    </form>
  );
}

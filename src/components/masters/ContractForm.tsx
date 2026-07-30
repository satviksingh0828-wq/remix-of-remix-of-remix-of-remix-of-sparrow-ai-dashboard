import { useState } from "react";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logAction } from "@/lib/log-actions";

export type ContractRow = {
  id?: string;
  contract_name: string;
  // Fixed recurring charges
  fixed_monthly_charge?: number | string;
  fixed_monthly_charge_note?: string;
  fixed_yearly_charge?: number | string;
  fixed_yearly_charge_note?: string;
  // Company details
  company_name?: string;
  legal_business_name?: string;
  company_type?: string;
  industry?: string;
  pan?: string;
  gstin?: string;
  cin?: string;
  msme_udyam?: string;
  tan?: string;
  iec?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  pin_code?: string;
  mobile_number?: string;
  telephone_number?: string;
  email?: string;
  website?: string;
};

export const EMPTY_CONTRACT: ContractRow = {
  contract_name: "",
  fixed_monthly_charge: "",
  fixed_monthly_charge_note: "",
  fixed_yearly_charge: "",
  fixed_yearly_charge_note: "",
  company_name: "",
  legal_business_name: "",
  company_type: "",
  industry: "",
  pan: "",
  gstin: "",
  cin: "",
  msme_udyam: "",
  tan: "",
  iec: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  country: "",
  pin_code: "",
  mobile_number: "",
  telephone_number: "",
  email: "",
  website: "",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-6">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  full,
  type,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  full?: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        value={value}
        required={required}
        type={type ?? "text"}
        onChange={(e) => onChange(e.target.value)}
        className="h-10"
      />
    </div>
  );
}

export function ContractForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: ContractRow;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ContractRow>({ ...initial });
  const [saving, setSaving] = useState(false);
  const [showCompany, setShowCompany] = useState(!!initial.company_name);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { id, ...rest } = form;
    const payload = rest as never;
    const res = id
      ? await supabase.from("contracts").update(payload).eq("id", id)
      : await supabase.from("contracts").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    const isNew = !id;
    logAction(isNew ? "created" : "updated", "contract", {
      entityId: id ?? "",
      entityLabel: form.contract_name,
    });
    toast.success(id ? "Source updated" : "Source created");
    onSaved();
  }

  const patch = (p: Partial<ContractRow>) => setForm((f) => ({ ...f, ...p }));

  return (
    <form onSubmit={onSubmit} className="animate-fade-up space-y-5">
      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <ArrowLeft className="size-4" />
          Back to sources
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">
          {form.id ? "Edit source" : "New source"}
        </h2>
      </div>

      <Section title="Source">
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <TextField
            label="Source Name"
            required
            full
            value={form.contract_name}
            onChange={(v) => patch({ contract_name: v })}
          />
        </div>
      </Section>

      <Section title="Fixed recurring charges">
        <p className="mb-4 text-xs text-muted-foreground">
          Optional fixed charges billed on this contract. Yearly charges are automatically
          divided by 12 to calculate monthly cost in Fixed Incomes reports.
        </p>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Fixed Monthly Charge (₹)
            </Label>
            <Input
              className="h-10"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={String(form.fixed_monthly_charge ?? "")}
              onChange={(e) => patch({ fixed_monthly_charge: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Monthly Charge Note
            </Label>
            <Input
              className="h-10"
              placeholder="e.g. Software license fee"
              value={form.fixed_monthly_charge_note ?? ""}
              onChange={(e) => patch({ fixed_monthly_charge_note: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Fixed Yearly Charge (₹)
            </Label>
            <Input
              className="h-10"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={String(form.fixed_yearly_charge ?? "")}
              onChange={(e) => patch({ fixed_yearly_charge: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Yearly Charge Note
            </Label>
            <Input
              className="h-10"
              placeholder="e.g. Annual maintenance contract"
              value={form.fixed_yearly_charge_note ?? ""}
              onChange={(e) => patch({ fixed_yearly_charge_note: e.target.value })}
            />
          </div>
        </div>
      </Section>

      <section className="surface-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Contracting company details
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Optional — details of the company you are contracting with.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCompany((s) => !s)}
          >
            {showCompany ? "Hide" : "Show"}
          </Button>
        </div>
        {showCompany ? (
          <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <TextField label="Company Name" full value={form.company_name ?? ""} onChange={(v) => patch({ company_name: v })} />
            <TextField label="Legal Business Name" value={form.legal_business_name ?? ""} onChange={(v) => patch({ legal_business_name: v })} />
            <TextField label="Company Type" value={form.company_type ?? ""} onChange={(v) => patch({ company_type: v })} />
            <TextField label="Industry" value={form.industry ?? ""} onChange={(v) => patch({ industry: v })} />
            <TextField label="PAN" value={form.pan ?? ""} onChange={(v) => patch({ pan: v })} />
            <TextField label="GSTIN" value={form.gstin ?? ""} onChange={(v) => patch({ gstin: v })} />
            <TextField label="CIN" value={form.cin ?? ""} onChange={(v) => patch({ cin: v })} />
            <TextField label="MSME / Udyam" value={form.msme_udyam ?? ""} onChange={(v) => patch({ msme_udyam: v })} />
            <TextField label="TAN" value={form.tan ?? ""} onChange={(v) => patch({ tan: v })} />
            <TextField label="IEC" value={form.iec ?? ""} onChange={(v) => patch({ iec: v })} />
            <TextField label="Address Line 1" full value={form.address_line1 ?? ""} onChange={(v) => patch({ address_line1: v })} />
            <TextField label="Address Line 2" full value={form.address_line2 ?? ""} onChange={(v) => patch({ address_line2: v })} />
            <TextField label="City" value={form.city ?? ""} onChange={(v) => patch({ city: v })} />
            <TextField label="State" value={form.state ?? ""} onChange={(v) => patch({ state: v })} />
            <TextField label="Country" value={form.country ?? ""} onChange={(v) => patch({ country: v })} />
            <TextField label="PIN Code" value={form.pin_code ?? ""} onChange={(v) => patch({ pin_code: v })} />
            <TextField label="Mobile" value={form.mobile_number ?? ""} onChange={(v) => patch({ mobile_number: v })} />
            <TextField label="Telephone" value={form.telephone_number ?? ""} onChange={(v) => patch({ telephone_number: v })} />
            <TextField label="Email" type="email" value={form.email ?? ""} onChange={(v) => patch({ email: v })} />
            <TextField label="Website" value={form.website ?? ""} onChange={(v) => patch({ website: v })} />
          </div>
        ) : null}
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving…" : "Save source"}
        </Button>
      </div>
    </form>
  );
}

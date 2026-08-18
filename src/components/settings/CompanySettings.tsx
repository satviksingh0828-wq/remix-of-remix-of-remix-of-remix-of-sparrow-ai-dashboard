import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { syncCompanyToAppSettings } from "@/lib/company-app-settings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COMPANY_TYPES = [
  "Proprietorship",
  "Partnership",
  "LLP",
  "Private Limited",
  "Public Limited",
  "Other",
];

type Company = Record<string, string> & { id?: string };

const EMPTY: Company = {
  company_name: "",
  legal_business_name: "",
  company_type: "",
  industry: "",
  pan: "",
  gstin: "",
  cin: "",
  msme_udyam: "",
  tan: "",
  transport_license_number: "",
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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card p-6">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  type = "text",
  full,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  type?: string;
  full?: boolean;
}) {
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="h-10"
      />
    </div>
  );
}

export function CompanySettings() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Company>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("company").select("*").limit(1).maybeSingle();
      if (error) toast.error("Could not load company details");
      if (data) setForm({ ...EMPTY, ...(data as Company) });
      setLoading(false);
    })();
  }, []);

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { id, ...rest } = form;
    const payload = rest as never;
    const res = id
      ? await supabase.from("company").update(payload).eq("id", id)
      : await supabase.from("company").insert(payload).select("id").maybeSingle();
    if (res.error) {
      setSaving(false);
      return toast.error(res.error.message);
    }
    if (!id && "data" in res && res.data)
      setForm((f) => ({ ...f, id: (res.data as { id: string }).id }));
    try {
      await syncCompanyToAppSettings(rest);
      await queryClient.invalidateQueries({ queryKey: ["app_settings"] });
      toast.success("Company details and app identity saved");
    } catch (error) {
      toast.error(
        `Company saved, but app identity could not be updated: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="animate-fade-up space-y-5">
      <Section title="Company identity">
        <Field
          label="Company Name"
          required
          value={form.company_name}
          onChange={set("company_name")}
        />
        <Field
          label="Legal Business Name"
          value={form.legal_business_name}
          onChange={set("legal_business_name")}
        />
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Company Type</Label>
          <Select
            value={form.company_type || undefined}
            onValueChange={(v) => setForm((f) => ({ ...f, company_type: v }))}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field label="Industry" value={form.industry} onChange={set("industry")} />
      </Section>

      <Section title="Registration details">
        <Field label="PAN" value={form.pan} onChange={set("pan")} />
        <Field label="GSTIN" value={form.gstin} onChange={set("gstin")} />
        <Field label="CIN (if applicable)" value={form.cin} onChange={set("cin")} />
        <Field label="MSME / Udyam Number" value={form.msme_udyam} onChange={set("msme_udyam")} />
        <Field label="TAN" value={form.tan} onChange={set("tan")} />
        <Field
          label="Transport License Number"
          value={form.transport_license_number}
          onChange={set("transport_license_number")}
        />
        <Field label="IEC (Import Export Code) — optional" value={form.iec} onChange={set("iec")} />
      </Section>

      <Section title="Registered office">
        <Field
          label="Address Line 1"
          full
          value={form.address_line1}
          onChange={set("address_line1")}
        />
        <Field
          label="Address Line 2"
          full
          value={form.address_line2}
          onChange={set("address_line2")}
        />
        <Field label="City" value={form.city} onChange={set("city")} />
        <Field label="State" value={form.state} onChange={set("state")} />
        <Field label="Country" value={form.country} onChange={set("country")} />
        <Field label="PIN Code" value={form.pin_code} onChange={set("pin_code")} />
      </Section>

      <Section title="Contact information">
        <Field label="Mobile Number" value={form.mobile_number} onChange={set("mobile_number")} />
        <Field
          label="Telephone Number"
          value={form.telephone_number}
          onChange={set("telephone_number")}
        />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} />
        <Field label="Website" value={form.website} onChange={set("website")} />
      </Section>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="h-10">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? "Saving…" : "Save company details"}
        </Button>
      </div>
    </form>
  );
}

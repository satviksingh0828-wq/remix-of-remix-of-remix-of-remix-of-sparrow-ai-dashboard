/**
 * VehicleInsuranceSection
 * Admin-only section inside the vehicle edit form.
 * Lets admins add/delete insurance policies for a vehicle.
 * On save, automatically creates one paid "Insurance Premium" expenditure per month
 * for the period (start month/year → end month/year inclusive).
 */

import { useEffect, useState } from "react";
import { Loader2, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inr } from "@/lib/trip-calc";
import { useSession } from "@/lib/session";
import {
  MONTH_NAMES,
  serverLoadInsurance,
  serverSaveInsurance,
  serverDeleteInsurance,
  type InsuranceEntry,
} from "@/lib/vehicle-coverage";

type Props = {
  vehicleId: string;
  branchId: string | null;
  registrationNumber: string;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2000 + 6 }, (_, i) => currentYear + 5 - i);

const EMPTY_FORM = {
  startMonth: "",
  startYear: "",
  endMonth: "",
  endYear: "",
  totalAmount: "",
  insuranceNumber: "",
};

export function VehicleInsuranceSection({ vehicleId, branchId, registrationNumber }: Props) {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const [entries, setEntries] = useState<InsuranceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    try {
      const rows = await serverLoadInsurance({ data: { userId, vehicleId } });
      setEntries(rows);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  function monthCount() {
    const sm = Number(form.startMonth);
    const sy = Number(form.startYear);
    const em = Number(form.endMonth);
    const ey = Number(form.endYear);
    if (!sm || !sy || !em || !ey) return 0;
    return (ey * 12 + em) - (sy * 12 + sm) + 1;
  }

  const count    = monthCount();
  const monthly  = count > 0 && form.totalAmount ? Number(form.totalAmount) / count : 0;

  async function handleSave() {
    if (!form.startMonth || !form.startYear) return toast.error("Select start month and year.");
    if (!form.endMonth || !form.endYear) return toast.error("Select end month and year.");
    if (count < 1) return toast.error("End month/year must not be before start month/year.");
    if (!form.totalAmount || Number(form.totalAmount) <= 0) return toast.error("Enter a valid total amount.");
    if (!form.insuranceNumber.trim()) return toast.error("Insurance number is required.");

    setSaving(true);
    try {
      await serverSaveInsurance({
        data: {
          userId,
          vehicleId,
          branchId,
          registrationNumber,
          startMonth: Number(form.startMonth),
          startYear: Number(form.startYear),
          endMonth: Number(form.endMonth),
          endYear: Number(form.endYear),
          totalAmount: Number(form.totalAmount),
          insuranceNumber: form.insuranceNumber.trim(),
        },
      });
      toast.success(`Insurance saved — ${count} monthly expenditure${count > 1 ? "s" : ""} created.`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: InsuranceEntry) {
    if (!window.confirm(`Delete insurance "${entry.insurance_number}"? This will also remove the linked expenditure entries.`)) return;
    setDeletingId(entry.id);
    try {
      await serverDeleteInsurance({ data: { userId, insuranceId: entry.id } });
      toast.success("Insurance entry deleted.");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  function formatPeriod(e: InsuranceEntry) {
    return `${MONTH_NAMES[e.start_month - 1]} ${e.start_year} – ${MONTH_NAMES[e.end_month - 1]} ${e.end_year}`;
  }

  const entryMonthCount = (e: InsuranceEntry) =>
    (e.end_year * 12 + e.end_month) - (e.start_year * 12 + e.start_month) + 1;

  return (
    <section className="surface-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold tracking-tight">Insurance</h3>
        </div>
        {!showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="size-3.5" />
            Add Insurance
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mt-5 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> Start and end months are included.
            The total amount will be divided equally across all months.
          </p>

          {/* Start period */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Start Month <span className="text-destructive">*</span></Label>
              <Select value={form.startMonth} onValueChange={set("startMonth")}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Start Year <span className="text-destructive">*</span></Label>
              <Select value={form.startYear} onValueChange={set("startYear")}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">End Month <span className="text-destructive">*</span></Label>
              <Select value={form.endMonth} onValueChange={set("endMonth")}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">End Year <span className="text-destructive">*</span></Label>
              <Select value={form.endYear} onValueChange={set("endYear")}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Total Amount (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                className="h-10"
                value={form.totalAmount}
                onChange={e => set("totalAmount")(e.target.value)}
                placeholder="e.g. 24000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Insurance Number <span className="text-destructive">*</span></Label>
              <Input
                className="h-10"
                value={form.insuranceNumber}
                onChange={e => set("insuranceNumber")(e.target.value)}
                placeholder="e.g. HDFC/2024/00123"
              />
            </div>
          </div>

          {count > 0 && form.totalAmount && (
            <p className="rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{count} month{count > 1 ? "s" : ""}</span> ·{" "}
              <span className="font-semibold text-foreground">{inr(monthly)}/month</span> will be added as paid expenditures.
            </p>
          )}

          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={handleSave}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {saving ? "Saving…" : "Save Insurance"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Entries list */}
      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insurance entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Insurance No.</th>
                  <th className="py-2 pr-3">Period</th>
                  <th className="py-2 pr-3">Months</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3 text-right">Monthly</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  const mc = entryMonthCount(e);
                  return (
                    <tr key={e.id} className="border-b border-border/60">
                      <td className="py-2 pr-3 font-medium">{e.insurance_number}</td>
                      <td className="py-2 pr-3 text-xs">{formatPeriod(e)}</td>
                      <td className="py-2 pr-3 text-xs">{mc}</td>
                      <td className="py-2 pr-3 text-right">{inr(e.total_amount)}</td>
                      <td className="py-2 pr-3 text-right text-xs">{inr(e.total_amount / mc)}</td>
                      <td className="py-2 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={deletingId === e.id}
                          onClick={() => handleDelete(e)}
                        >
                          {deletingId === e.id
                            ? <Loader2 className="size-4 animate-spin text-muted-foreground" />
                            : <Trash2 className="size-4 text-destructive" />
                          }
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

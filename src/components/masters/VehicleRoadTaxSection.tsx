/**
 * VehicleRoadTaxSection
 * Admin-only section inside the vehicle edit form.
 * Lets admins add/delete road tax payments for a vehicle.
 * On save, creates one paid "Road Tax" expenditure for the selected month.
 */

import { useEffect, useState } from "react";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
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
  serverLoadRoadTax,
  serverSaveRoadTax,
  serverDeleteRoadTax,
  type RoadTaxEntry,
} from "@/lib/vehicle-coverage";

type Props = {
  vehicleId: string;
  branchId: string | null;
  registrationNumber: string;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2000 + 6 }, (_, i) => currentYear + 5 - i);

const EMPTY_FORM = {
  month: "",
  year: "",
  totalAmount: "",
  state: "",
};

export function VehicleRoadTaxSection({ vehicleId, branchId, registrationNumber }: Props) {
  const { user } = useSession();
  const userId = user?.id ?? "";

  const [entries, setEntries] = useState<RoadTaxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    try {
      const rows = await serverLoadRoadTax({ data: { userId, vehicleId } });
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.month) return toast.error("Select a month.");
    if (!form.year) return toast.error("Select a year.");
    if (!form.totalAmount || Number(form.totalAmount) <= 0) return toast.error("Enter a valid amount.");
    if (!form.state.trim()) return toast.error("State is required.");

    setSaving(true);
    try {
      await serverSaveRoadTax({
        data: {
          userId,
          vehicleId,
          branchId,
          registrationNumber,
          month: Number(form.month),
          year: Number(form.year),
          totalAmount: Number(form.totalAmount),
          state: form.state.trim(),
        },
      });
      toast.success("Road tax entry saved — paid expenditure created.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entry: RoadTaxEntry) {
    if (!window.confirm(`Delete road tax entry for ${MONTH_NAMES[entry.month - 1]} ${entry.year}? This will also remove the linked expenditure.`)) return;
    setDeletingId(entry.id);
    try {
      await serverDeleteRoadTax({ data: { userId, roadTaxId: entry.id } });
      toast.success("Road tax entry deleted.");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  const set = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <section className="surface-card p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold tracking-tight">Road Tax</h3>
        </div>
        {!showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="size-3.5" />
            Add Road Tax
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSave} className="mt-5 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Month <span className="text-destructive">*</span></Label>
              <Select value={form.month} onValueChange={set("month")}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Year <span className="text-destructive">*</span></Label>
              <Select value={form.year} onValueChange={set("year")}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Amount (₹) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                className="h-10"
                value={form.totalAmount}
                onChange={e => set("totalAmount")(e.target.value)}
                placeholder="e.g. 1500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">State <span className="text-destructive">*</span></Label>
              <Input
                className="h-10"
                value={form.state}
                onChange={e => set("state")(e.target.value)}
                placeholder="e.g. Maharashtra"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {saving ? "Saving…" : "Save Road Tax"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Entries list */}
      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No road tax entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Month / Year</th>
                  <th className="py-2 pr-3">State</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{MONTH_NAMES[e.month - 1]} {e.year}</td>
                    <td className="py-2 pr-3">{e.state}</td>
                    <td className="py-2 pr-3 text-right">{inr(e.total_amount)}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

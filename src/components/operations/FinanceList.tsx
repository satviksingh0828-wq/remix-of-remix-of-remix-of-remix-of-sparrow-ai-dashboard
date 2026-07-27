import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityPicker, type PickerOption } from "@/components/EntityPicker";
import { CsvIO } from "@/components/CsvIO";
import { useBranches } from "@/lib/use-branches";
import { inr, num } from "@/lib/trip-calc";
import { fetchAll } from "@/lib/fetch-all";
import {
  emptyFinanceRow,
  FINANCE_CONFIG,
  MONTHS,
  monthOf,
  yearOf,
  type FinanceKind,
  type FinanceRow,
} from "@/lib/finance";

type AnyRow = Record<string, unknown> & { id: string };

const CSV_COLUMNS = [
  "entry_date",
  "name",
  "amount",
  "note",
  "branch",
  "vehicle",
  "driver",
  "transporter",
  "status",
  "status_date",
];

export function FinanceList({ kind }: { kind: FinanceKind }) {
  const cfg = FINANCE_CONFIG[kind];
  const branches = useBranches();

  const [rows, setRows] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<FinanceRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<AnyRow[]>([]);
  const [drivers, setDrivers] = useState<AnyRow[]>([]);
  const [transporters, setTransporters] = useState<AnyRow[]>([]);

  const [year, setYear] = useState("all");
  const [month, setMonth] = useState("all");
  const [status, setStatus] = useState<"all" | "done" | "pending">("all");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAll<Record<string, unknown>>(() =>
        supabase.from(cfg.table).select("*").order("entry_date", { ascending: false }),
      );
      setRows(
        data.map((r) => ({
          id: r.id as string,
          name: String(r[cfg.nameCol] ?? ""),
          amount: String(r.amount ?? ""),
          note: String(r.note ?? ""),
          entry_date: String(r.entry_date ?? ""),
          branch_id: (r.branch_id as string) ?? null,
          vehicle_id: (r.vehicle_id as string) ?? null,
          driver_id: (r.driver_id as string) ?? null,
          transporter_id: (r.transporter_id as string) ?? null,
          settled: Boolean(r[cfg.statusCol]),
          settled_date: String(r[cfg.statusDateCol] ?? ""),
        })),
      );
    } catch {
      toast.error(`Could not load ${cfg.title.toLowerCase()}`);
    }
    setLoading(false);
  }

  async function loadMasters() {
    const [v, d, t] = await Promise.all([
      fetchAll<AnyRow>(() =>
        supabase.from("vehicles").select("*").order("registration_number"),
      ),
      fetchAll<AnyRow>(() => supabase.from("drivers").select("*").order("full_name")),
      fetchAll<AnyRow>(() =>
        supabase.from("transporters").select("*").order("transporter_name"),
      ),
    ]);
    setVehicles(v);
    setDrivers(d);
    setTransporters(t);
  }

  useEffect(() => {
    load();
    loadMasters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const branchOpts: PickerOption[] = branches.map((b) => ({
    id: b.id,
    label: b.branch_name,
    sub: b.branch_type ?? undefined,
  }));
  const vehicleOpts: PickerOption[] = vehicles.map((v) => ({
    id: v.id,
    label: String(v.registration_number ?? ""),
  }));
  const driverOpts: PickerOption[] = drivers.map((d) => ({
    id: d.id,
    label: String(d.full_name ?? ""),
  }));
  const transporterOpts: PickerOption[] = transporters.map((t) => ({
    id: t.id,
    label: String(t.transporter_name ?? ""),
  }));

  const nameOf = (opts: PickerOption[], id: string | null) =>
    (id ? opts.find((o) => o.id === id)?.label : "") ?? "";

  const years = useMemo(() => {
    const set = new Set(rows.map((r) => yearOf(r.entry_date)).filter(Boolean));
    set.add(String(new Date().getFullYear()));
    return Array.from(set).sort().reverse();
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (year !== "all" && yearOf(r.entry_date) !== year) return false;
    if (month !== "all" && monthOf(r.entry_date) !== month) return false;
    if (status === "done" && !r.settled) return false;
    if (status === "pending" && r.settled) return false;
    return true;
  });

  const total = filtered.reduce((s, r) => s + num(r.amount), 0);
  const pendingTotal = filtered
    .filter((r) => !r.settled)
    .reduce((s, r) => s + num(r.amount), 0);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editing.name.trim()) return toast.error(`${cfg.nameLabel} is required`);
    if (!editing.branch_id) return toast.error("Branch is required");
    setSaving(true);
    const payload: Record<string, unknown> = {
      [cfg.nameCol]: editing.name,
      amount: editing.amount,
      note: editing.note,
      entry_date: editing.entry_date,
      branch_id: editing.branch_id,
      vehicle_id: editing.vehicle_id,
      driver_id: editing.driver_id,
      transporter_id: editing.transporter_id,
      [cfg.statusCol]: editing.settled,
      [cfg.statusDateCol]: editing.settled_date,
    };
    const res = editing.id
      ? await supabase.from(cfg.table).update(payload as never).eq("id", editing.id)
      : await supabase.from(cfg.table).insert(payload as never);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  }

  async function settle(row: FinanceRow) {
    const { error } = await supabase
      .from(cfg.table)
      .update({
        [cfg.statusCol]: true,
        [cfg.statusDateCol]: new Date().toISOString().slice(0, 10),
      } as never)
      .eq("id", row.id!);
    if (error) return toast.error(error.message);
    toast.success(cfg.doneLabel);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from(cfg.table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const csvRows = filtered.map((r) => ({
    entry_date: r.entry_date,
    name: r.name,
    amount: r.amount,
    note: r.note,
    branch: nameOf(branchOpts, r.branch_id),
    vehicle: nameOf(vehicleOpts, r.vehicle_id),
    driver: nameOf(driverOpts, r.driver_id),
    transporter: nameOf(transporterOpts, r.transporter_id),
    status: r.settled ? cfg.doneLabel : cfg.pendingLabel,
    status_date: r.settled_date,
  }));

  async function onImport(imported: Record<string, string>[]) {
    const idBy = (opts: PickerOption[], label: string) =>
      opts.find((o) => o.label.trim().toLowerCase() === label.trim().toLowerCase())?.id ??
      null;
    const payload = imported
      .filter((r) => (r.name || "").trim() !== "")
      .map((r) => {
        const done = /^(yes|true|paid|received|1)$/i.test((r.status || "").trim());
        return {
          [cfg.nameCol]: r.name,
          amount: r.amount ?? "",
          note: r.note ?? "",
          entry_date: r.entry_date ?? "",
          branch_id: idBy(branchOpts, r.branch ?? ""),
          vehicle_id: idBy(vehicleOpts, r.vehicle ?? ""),
          driver_id: idBy(driverOpts, r.driver ?? ""),
          transporter_id: idBy(transporterOpts, r.transporter ?? ""),
          [cfg.statusCol]: done,
          [cfg.statusDateCol]: r.status_date ?? "",
        };
      });
    if (payload.length === 0) return { inserted: 0, failed: imported.length };
    const { error } = await supabase.from(cfg.table).insert(payload as never);
    if (error) {
      toast.error(error.message);
      return { inserted: 0, failed: payload.length };
    }
    await load();
    return { inserted: payload.length, failed: imported.length - payload.length };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setEditing(emptyFinanceRow())}>
          <Plus className="size-4" />
          New {cfg.single}
        </Button>
        <div className="ml-auto">
          <CsvIO
            entityLabel={cfg.title}
            filename={cfg.filename}
            columns={CSV_COLUMNS}
            rows={csvRows}
            onImport={onImport}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-muted/50 p-3">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {MONTHS.map((m, i) => (
              <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="done">{cfg.doneLabel}</SelectItem>
            <SelectItem value="pending">{cfg.pendingLabel}</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          Total <span className="font-semibold text-foreground">{inr(total)}</span> ·{" "}
          {cfg.pendingLabel.toLowerCase()}{" "}
          <span className="font-semibold text-foreground">{inr(pendingTotal)}</span>
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
          No {cfg.title.toLowerCase()} records for this filter.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3">{cfg.nameLabel}</th>
                <th className="py-2 pr-3">Branch</th>
                <th className="py-2 pr-3">Linked to</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const linked =
                  nameOf(vehicleOpts, r.vehicle_id) ||
                  nameOf(driverOpts, r.driver_id) ||
                  nameOf(transporterOpts, r.transporter_id) ||
                  "—";
                return (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">{r.entry_date || "—"}</td>
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3">{nameOf(branchOpts, r.branch_id) || "—"}</td>
                    <td className="py-2 pr-3">{linked}</td>
                    <td className="py-2 pr-3 text-right">{inr(num(r.amount))}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          r.settled
                            ? "rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary"
                            : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        }
                      >
                        {r.settled ? cfg.doneLabel : cfg.pendingLabel}
                      </span>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {!r.settled ? (
                        <Button variant="outline" size="sm" onClick={() => settle(r)}>
                          <Check className="size-4" />
                          {cfg.actionLabel}
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => setEditing(r)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => r.id && remove(r.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? `Edit ${cfg.single}` : `New ${cfg.single}`}
            </DialogTitle>
          </DialogHeader>
          {editing ? (
            <form onSubmit={save} className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {cfg.nameLabel}
                </Label>
                <Input
                  className="h-10"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Amount (₹)</Label>
                <Input
                  className="h-10"
                  type="number"
                  value={editing.amount}
                  onChange={(e) => setEditing({ ...editing, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Date</Label>
                <Input
                  className="h-10"
                  type="date"
                  value={editing.entry_date}
                  onChange={(e) => setEditing({ ...editing, entry_date: e.target.value })}
                />
              </div>
              <EntityPicker
                label="Branch (required)"
                value={editing.branch_id}
                options={branchOpts}
                onChange={(id) => setEditing({ ...editing, branch_id: id })}
              />
              <div className="text-xs text-muted-foreground sm:col-span-2">
                Optionally link this {cfg.single} to one vehicle, driver or transporter.
              </div>
              <EntityPicker
                label="Vehicle"
                value={editing.vehicle_id}
                options={vehicleOpts}
                onChange={(id) =>
                  setEditing({
                    ...editing,
                    vehicle_id: id,
                    driver_id: null,
                    transporter_id: null,
                  })
                }
              />
              <EntityPicker
                label="Driver"
                value={editing.driver_id}
                options={driverOpts}
                onChange={(id) =>
                  setEditing({
                    ...editing,
                    driver_id: id,
                    vehicle_id: null,
                    transporter_id: null,
                  })
                }
              />
              <EntityPicker
                label="Transporter"
                value={editing.transporter_id}
                options={transporterOpts}
                onChange={(id) =>
                  setEditing({
                    ...editing,
                    transporter_id: id,
                    vehicle_id: null,
                    driver_id: null,
                  })
                }
              />
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">Note</Label>
                <Input
                  className="h-10"
                  value={editing.note}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <Select
                  value={editing.settled ? "done" : "pending"}
                  onValueChange={(v) =>
                    setEditing({
                      ...editing,
                      settled: v === "done",
                      settled_date:
                        v === "done"
                          ? editing.settled_date ||
                            new Date().toISOString().slice(0, 10)
                          : "",
                    })
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{cfg.pendingLabel}</SelectItem>
                    <SelectItem value="done">{cfg.doneLabel}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  {cfg.doneLabel} on
                </Label>
                <Input
                  className="h-10"
                  type="date"
                  value={editing.settled_date}
                  onChange={(e) => setEditing({ ...editing, settled_date: e.target.value })}
                />
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Save, Trash2, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CsvIO } from "@/components/CsvIO";
import { BranchSelect } from "@/components/BranchSelect";
import { useBranches, branchName } from "@/lib/use-branches";
import { fetchAll } from "@/lib/fetch-all";

export type FieldDef = {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "email" | "date" | "number";
  options?: string[]; // if present → Select
  full?: boolean;
};
export type SectionDef = { title: string; fields: FieldDef[] };

export type MasterConfig = {
  table: "vehicles" | "drivers" | "transporters" | "locations";
  entityLabel: string; // "Vehicles"
  singular: string; // "vehicle"
  icon: LucideIcon;
  sections: SectionDef[];
  hasBranch: boolean;
  titleKey: string; // column used as primary display name
  subtitleKeys: string[]; // fields to join for subtitle
  emptyMsg: string;
};

type Row = Record<string, unknown> & { id?: string; branch_id?: string | null };

export function MasterList({ config }: { config: MasterConfig }) {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const branches = useBranches();

  const allFieldKeys = config.sections.flatMap((s) => s.fields.map((f) => f.key));
  const emptyRow: Row = Object.fromEntries(allFieldKeys.map((k) => [k, ""])) as Row;
  if (config.hasBranch) emptyRow.branch_id = null;

  const columns = [...allFieldKeys, ...(config.hasBranch ? ["branch_name"] : [])];

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchAll<Row>(() =>
        supabase.from(config.table).select("*").order("created_at", { ascending: true }),
      );
      setItems(rows);
    } catch {
      toast.error(`Could not load ${config.entityLabel.toLowerCase()}`);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [config.table]);

  const set = (k: string) => (v: string) => setEditing((f) => (f ? { ...f, [k]: v } : f));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { id, created_at: _c, updated_at: _u, branch_name: _bn, ...rest } = editing as Row & {
      created_at?: unknown;
      updated_at?: unknown;
      branch_name?: unknown;
    };
    const payload = rest as never;
    const res = id
      ? await supabase.from(config.table).update(payload).eq("id", id)
      : await supabase.from(config.table).insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(id ? `${config.singular} updated` : `${config.singular} created`);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from(config.table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`${config.singular} removed`);
    load();
  }

  async function onImport(rows: Record<string, string>[]) {
    const nameToId = new Map(
      branches.map((b) => [b.branch_name.toLowerCase(), b.id] as const),
    );
    const payload = rows
      .filter((r) => (r[config.titleKey] || "").trim() !== "")
      .map((r) => {
        const o: Record<string, unknown> = {};
        for (const k of allFieldKeys) o[k] = r[k] ?? "";
        if (config.hasBranch) {
          const n = (r.branch_name || "").trim().toLowerCase();
          o.branch_id = n ? nameToId.get(n) ?? null : null;
        }
        return o;
      });
    if (payload.length === 0) return { inserted: 0, failed: rows.length };
    const { error, count } = await supabase
      .from(config.table)
      .insert(payload as never, { count: "exact" });
    if (error) {
      toast.error(error.message);
      return { inserted: 0, failed: payload.length };
    }
    await load();
    return { inserted: count ?? payload.length, failed: rows.length - payload.length };
  }

  const rowsForExport = items.map((r) => ({
    ...r,
    branch_name: config.hasBranch
      ? branchName(branches, r.branch_id as string | null | undefined)
      : undefined,
  })) as Record<string, unknown>[];

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="animate-fade-up space-y-5">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
            <ArrowLeft className="size-4" />
            Back to list
          </Button>
          <h2 className="text-lg font-semibold tracking-tight">
            {editing.id ? `Edit ${config.singular}` : `New ${config.singular}`}
          </h2>
        </div>

        {config.sections.map((sec) => (
          <section key={sec.title} className="surface-card p-6">
            <h3 className="text-sm font-semibold tracking-tight">{sec.title}</h3>
            <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              {sec.fields.map((f) => {
                const val = String(editing[f.key] ?? "");
                if (f.options) {
                  return (
                    <div key={f.key} className={`space-y-1.5 ${f.full ? "sm:col-span-2" : ""}`}>
                      <Label className="text-xs font-medium text-muted-foreground">
                        {f.label}
                        {f.required ? <span className="text-destructive"> *</span> : null}
                      </Label>
                      <Select value={val || undefined} onValueChange={(v) => set(f.key)(v)}>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                return (
                  <div key={f.key} className={`space-y-1.5 ${f.full ? "sm:col-span-2" : ""}`}>
                    <Label className="text-xs font-medium text-muted-foreground">
                      {f.label}
                      {f.required ? <span className="text-destructive"> *</span> : null}
                    </Label>
                    <Input
                      type={f.type ?? "text"}
                      value={val}
                      required={f.required}
                      onChange={(e) => set(f.key)(e.target.value)}
                      className="h-10"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {config.hasBranch ? (
          <section className="surface-card p-6">
            <h3 className="text-sm font-semibold tracking-tight">Controlling branch</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Link this {config.singular} to a branch defined in Settings.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <BranchSelect
                value={(editing.branch_id as string | null | undefined) ?? null}
                onChange={(id: string | null) =>
                  setEditing((f) => (f ? { ...f, branch_id: id } : f))
                }
              />
            </div>
          </section>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="h-10">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Saving…" : `Save ${config.singular}`}
          </Button>
        </div>
      </form>
    );
  }

  const Icon = config.icon;

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{config.entityLabel}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{config.emptyMsg}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvIO
            entityLabel={config.entityLabel}
            filename={config.table}
            columns={columns}
            rows={rowsForExport}
            onImport={onImport}
          />
          <Button onClick={() => setEditing({ ...emptyRow })}>
            <Plus className="size-4" />
            New {config.singular}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Icon className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">No {config.entityLabel.toLowerCase()} yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one, or import a filled template.
          </p>
          <Button className="mt-5" onClick={() => setEditing({ ...emptyRow })}>
            <Plus className="size-4" />
            New {config.singular}
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((r, i) => (
            <li
              key={r.id as string}
              style={{ animationDelay: `${i * 40}ms` }}
              className="surface-card animate-fade-up flex items-center gap-4 p-4 transition-shadow hover:shadow-[var(--shadow-lift)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {String(r[config.titleKey] ?? "—")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {config.subtitleKeys
                    .map((k) => (k === "branch_name"
                      ? branchName(branches, r.branch_id as string | null | undefined)
                      : String(r[k] ?? "")))
                    .filter(Boolean)
                    .join(" · ") || "No details"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => r.id && remove(r.id as string)}
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

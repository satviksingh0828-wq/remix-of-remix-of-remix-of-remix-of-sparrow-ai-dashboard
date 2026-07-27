import { useEffect, useState } from "react";
import { ArrowLeft, Layers, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Field } from "./CompanySettings";
import { CsvIO } from "@/components/CsvIO";

type Dept = Record<string, string> & { id?: string };

const COLUMNS = ["name", "code", "description"];
const EMPTY: Dept = { name: "", code: "", description: "" };

export function DepartmentSettings() {
  const [items, setItems] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Dept | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) toast.error("Could not load departments");
    setItems((data as Dept[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const set = (k: string) => (v: string) => setEditing((f) => (f ? { ...f, [k]: v } : f));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { id, created_at: _c, updated_at: _u, ...rest } = editing;
    const payload = rest as never;
    const res = id
      ? await supabase.from("departments").update(payload).eq("id", id)
      : await supabase.from("departments").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(id ? "Department updated" : "Department created");
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Department removed");
    load();
  }

  async function onImport(rows: Record<string, string>[]) {
    const payload = rows
      .filter((r) => (r.name || "").trim() !== "")
      .map((r) => ({
        name: r.name,
        code: r.code ?? "",
        description: r.description ?? "",
      }));
    if (payload.length === 0) return { inserted: 0, failed: rows.length };
    const { error, count } = await supabase
      .from("departments")
      .insert(payload as never, { count: "exact" });
    if (error) {
      toast.error(error.message);
      return { inserted: 0, failed: payload.length };
    }
    await load();
    return { inserted: count ?? payload.length, failed: rows.length - payload.length };
  }

  if (editing) {
    return (
      <form onSubmit={onSubmit} className="animate-fade-up space-y-5">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(null)}>
            <ArrowLeft className="size-4" />
            Back to list
          </Button>
          <h2 className="text-lg font-semibold tracking-tight">
            {editing.id ? "Edit department" : "New department"}
          </h2>
        </div>
        <section className="surface-card p-6">
          <h3 className="text-sm font-semibold tracking-tight">Department details</h3>
          <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field label="Name" required value={editing.name} onChange={set("name")} />
            <Field label="Code" value={editing.code} onChange={set("code")} />
            <Field
              label="Description"
              full
              value={editing.description}
              onChange={set("description")}
            />
          </div>
        </section>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setEditing(null)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="h-10">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {saving ? "Saving…" : "Save department"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Departments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Controlling departments used across vehicles, drivers and transporters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvIO
            entityLabel="Departments"
            filename="departments"
            columns={COLUMNS}
            rows={items}
            onImport={onImport}
          />
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="size-4" />
            New department
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Layers className="size-6" />
          </span>
          <p className="mt-4 text-sm font-medium">No departments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a department to organise your fleet and staff.
          </p>
          <Button className="mt-5" onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="size-4" />
            New department
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((d, i) => (
            <li
              key={d.id}
              style={{ animationDelay: `${i * 40}ms` }}
              className="surface-card animate-fade-up flex items-center gap-4 p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Layers className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[d.code, d.description].filter(Boolean).join(" · ") || "No details"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(d)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => d.id && remove(d.id)}>
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

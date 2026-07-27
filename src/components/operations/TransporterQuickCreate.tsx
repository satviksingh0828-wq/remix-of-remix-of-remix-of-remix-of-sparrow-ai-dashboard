import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { TRANSPORTER_CONFIG } from "@/components/masters/configs";

const FIELDS = TRANSPORTER_CONFIG.sections;
const KEYS = FIELDS.flatMap((s) => s.fields.map((f) => f.key));

export function TransporterQuickCreate({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(KEYS.map((k) => [k, ""])),
  );
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.transporter_name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("transporters")
      .insert(form as never)
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) return toast.error(error?.message ?? "Failed to save");
    toast.success("Transporter created");
    onCreated((data as { id: string }).id);
    setForm(Object.fromEntries(KEYS.map((k) => [k, ""])));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New transporter</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          {FIELDS.map((section) => (
            <section key={section.title}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {section.title}
              </h4>
              <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                {section.fields.map((f) => (
                  <div
                    key={f.key}
                    className={`space-y-1.5 ${f.full ? "sm:col-span-2" : ""}`}
                  >
                    <Label className="text-xs font-medium text-muted-foreground">
                      {f.label}
                      {f.required ? <span className="text-destructive"> *</span> : null}
                    </Label>
                    {f.options ? (
                      <Select
                        value={form[f.key] || undefined}
                        onValueChange={(v) => setForm({ ...form, [f.key]: v })}
                      >
                        <SelectTrigger className="h-10">
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
                    ) : (
                      <Input
                        className="h-10"
                        type={f.type ?? "text"}
                        required={f.required}
                        value={form[f.key] ?? ""}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save transporter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Save, Wifi } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type AttendanceSettings = {
  id?: string;
  attendance_module_enabled: boolean;
  attendance_module_url: string;
  attendance_module_key: string;
};

export function AttendanceModuleSettings() {
  const [settings, setSettings] = useState<AttendanceSettings>({
    attendance_module_enabled: false,
    attendance_module_url: "",
    attendance_module_key: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const db = supabase as any;
      const { data, error } = await db.from("app_settings").select("*").limit(1).maybeSingle();
      if (!active) return;
      if (error) toast.error(error.message);
      if (data) {
        setSettings({
          id: data.id,
          attendance_module_enabled: Boolean(data.attendance_module_enabled),
          attendance_module_url: data.attendance_module_url ?? "",
          attendance_module_key: data.attendance_module_key ?? "",
        });
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  async function save() {
    setSaving(true);
    const db = supabase as any;
    const payload = {
      attendance_module_enabled: settings.attendance_module_enabled,
      attendance_module_url: settings.attendance_module_url.trim() || null,
      attendance_module_key: settings.attendance_module_key.trim() || null,
    };
    const result = settings.id
      ? await db.from("app_settings").update(payload).eq("id", settings.id)
      : await db.from("app_settings").insert(payload);
    setSaving(false);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success("Attendance module settings saved");
  }

  if (loading) {
    return <div className="surface-card flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading attendance settings…</div>;
  }

  return (
    <div className="space-y-6">
      <section className="surface-card p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wifi className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Attendance module</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect an optional attendance device or service. Manual attendance remains available in the HR Attendance tab.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
          <div>
            <p className="text-sm font-medium">Enable attendance module connection</p>
            <p className="mt-1 text-xs text-muted-foreground">Enables the device-sync options for managers and administrators.</p>
          </div>
          <Switch
            checked={settings.attendance_module_enabled}
            onCheckedChange={(checked) => setSettings((s) => ({ ...s, attendance_module_enabled: checked }))}
          />
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="attendance-url">Module URL</Label>
            <Input id="attendance-url" value={settings.attendance_module_url} onChange={(e) => setSettings((s) => ({ ...s, attendance_module_url: e.target.value }))} placeholder="https://attendance.example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attendance-key">Module key</Label>
            <Input id="attendance-key" type="password" value={settings.attendance_module_key} onChange={(e) => setSettings((s) => ({ ...s, attendance_module_key: e.target.value }))} placeholder="Optional device/API key" />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save settings
          </Button>
        </div>
      </section>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-primary" />
        Attendance and payroll data remain in the same Supabase project.
      </div>
    </div>
  );
}
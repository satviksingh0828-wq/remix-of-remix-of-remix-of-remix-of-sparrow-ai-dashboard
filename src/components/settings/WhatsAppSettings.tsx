import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle, QrCode, Save, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAppSettings, useUpdateAppSettings } from "@/lib/hooks";
import { connectWa, disconnectWa, getWaQr, getWaStatus, whatsappApiConfigured, type WaStatus } from "@/lib/whatsapp";

const AUTOMATIONS = [
  ["wa_auto_send_payroll", "Send payroll PDFs automatically", "Send a payslip when payroll is marked paid."],
  ["email_auto_send_payroll", "Send mail when payroll generated", "Email the generated payslip to the employee and CC Priyanshi."],
  ["wa_send_on_payment", "Send on payment", "Send a PDF when a payment action is completed."],
  ["wa_send_loan", "Loan PDFs", "Allow loan statements and payment receipts to be sent."],
  ["wa_send_advance", "Advance PDFs", "Allow advance statements and payment receipts to be sent."],
  ["wa_send_loss_deduction", "Loss deduction PDFs", "Allow loss deduction statements to be sent."],
  ["wa_send_attendance_monthly", "Attendance PDFs", "Allow monthly attendance reports to be sent."],
] as const;

type AutomationKey = (typeof AUTOMATIONS)[number][0];
type SettingsState = Record<AutomationKey, boolean>;

const initialState: SettingsState = {
  wa_auto_send_payroll: false,
  email_auto_send_payroll: false,
  wa_send_on_payment: false,
  wa_send_loan: false,
  wa_send_advance: false,
  wa_send_loss_deduction: false,
  wa_send_attendance_monthly: false,
};

export function WhatsAppSettings() {
  const { data: appSettings, isLoading } = useAppSettings();
  const updateSettings = useUpdateAppSettings();
  const [form, setForm] = useState<SettingsState>(initialState);
  const [status, setStatus] = useState<WaStatus>("unknown");
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!appSettings) return;
    setForm(Object.fromEntries(AUTOMATIONS.map(([key]) => [key, Boolean(appSettings[key])])) as SettingsState);
  }, [appSettings]);

  const refreshStatus = useCallback(async () => {
    try {
      const result = await getWaStatus();
      setStatus(result.status);
      if (result.status !== "qr") setQr(null);
      return result.status;
    } catch {
      setStatus("unknown");
      return "unknown" as WaStatus;
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function connect() {
    setBusy(true);
    try {
      await connectWa();
      const next = await refreshStatus();
      if (next === "qr") setQr(await getWaQr());
      toast.success(next === "qr" ? "Scan the QR code with WhatsApp" : "WhatsApp connection started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect WhatsApp");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await disconnectWa();
      setQr(null);
      setStatus("disconnected");
      toast.success("WhatsApp disconnected");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect WhatsApp");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!appSettings?.id) {
      toast.error("App settings are not available yet.");
      return;
    }
    updateSettings.mutate(
      { id: appSettings.id, values: { ...form } as never },
      {
        onSuccess: () => toast.success("WhatsApp settings saved"),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save WhatsApp settings"),
      },
    );
  }

  const connected = status === "connected" || status === "ready";
  return (
    <div className="animate-fade-up space-y-5">
      <section className="surface-card p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">WhatsApp for HR</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Send HR documents such as payslips, attendance reports, loan statements, advances, and deductions through the hosted WhatsApp service.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              {connected ? <Wifi className="size-4 text-green-600" /> : <WifiOff className="size-4 text-muted-foreground" />}
              Connection: <span className="capitalize">{status}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={connect} disabled={busy || !whatsappApiConfigured()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
                Connect / refresh QR
              </Button>
              <Button type="button" variant="ghost" onClick={disconnect} disabled={busy || !connected}>Disconnect</Button>
            </div>
          </div>
          {!whatsappApiConfigured() && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Set WHATSAPP_API_KEY in the server deployment environment to enable the connection.</p>}
          {qr && <img src={qr} alt="WhatsApp connection QR code" className="mt-4 size-64 rounded-lg border bg-white p-3" />}
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"><Save className="size-5" /></span>
          <div><h2 className="text-lg font-semibold tracking-tight">HR PDF sending</h2><p className="mt-1 text-sm text-muted-foreground">These controls affect HR only. Manual WhatsApp buttons remain available beside supported HR PDF actions.</p></div>
        </div>
        <div className="mt-6 space-y-3">
          {AUTOMATIONS.map(([key, label, description]) => (
            <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
              <div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></div>
              <Switch checked={form[key]} onCheckedChange={(checked) => setForm((current) => ({ ...current, [key]: checked }))} />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end"><Button type="button" onClick={save} disabled={isLoading || updateSettings.isPending} className="gap-2"><Save className="size-4" />Save settings</Button></div>
      </section>
    </div>
  );
}

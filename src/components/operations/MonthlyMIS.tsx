import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, Lock, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/lib/session";
import { useBranches } from "@/lib/use-branches";
import { serverLoadMisForm, serverSaveMisForm, type MisForm } from "@/lib/monthly-mis";
import { exportMisFormExcel, misScheduleLabel } from "@/lib/monthly-mis-excel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const currentMonth = new Date().toISOString().slice(0, 7);

export function MonthlyMIS() {
  const { user } = useSession();
  const allBranches = useBranches();
  const allowedBranches =
    user?.role === "admin"
      ? allBranches
      : allBranches.filter((b) => user?.branchIds.includes(b.id));
  const [branchId, setBranchId] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [form, setForm] = useState<MisForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branchId && allowedBranches[0]) setBranchId(allowedBranches[0].id);
  }, [allowedBranches, branchId]);

  useEffect(() => {
    if (!branchId || !user?.sessionToken) return;
    setLoading(true);
    serverLoadMisForm({ data: { token: user.sessionToken, branchId, month } })
      .then(setForm)
      .catch((error) => toast.error(error instanceof Error ? error.message : String(error)))
      .finally(() => setLoading(false));
  }, [branchId, month, user?.sessionToken]);

  const byActivity = useMemo(
    () =>
      new Map(
        form?.activities.map((activity) => [
          activity.id,
          form.entries.filter((entry) => entry.activity_id === activity.id),
        ]) ?? [],
      ),
    [form],
  );
  const due = form?.entries.length ?? 0;
  const done = form?.entries.filter((entry) => entry.completed).length ?? 0;
  const missed =
    form?.entries.filter(
      (entry) => !entry.completed && entry.due_date < new Date().toISOString().slice(0, 10),
    ).length ?? 0;

  function toggle(activityId: string, dueDate: string) {
    if (!form || form.status === "submitted") return;
    setForm({
      ...form,
      entries: form.entries.map((entry) =>
        entry.activity_id === activityId && entry.due_date === dueDate
          ? { ...entry, completed: !entry.completed }
          : entry,
      ),
    });
  }

  async function save(submit: boolean) {
    if (!form || !user?.sessionToken) return;
    if (
      submit &&
      !window.confirm(
        "Submit this Monthly MIS? It will be permanently locked and cannot be edited.",
      )
    )
      return;
    setSaving(true);
    try {
      await serverSaveMisForm({
        data: { token: user.sessionToken, branchId, month, entries: form.entries, submit },
      });
      toast.success(submit ? "Monthly MIS submitted and locked" : "Draft saved");
      const refreshed = await serverLoadMisForm({
        data: { token: user.sessionToken, branchId, month },
      });
      setForm(refreshed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>Assigned branch</span>
          <Select value={branchId} onValueChange={setBranchId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {allowedBranches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.branch_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1 text-xs font-medium text-muted-foreground">
          <span>MIS month</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="block h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          />
        </label>
        <div className="ml-auto flex items-center gap-2">
          {form && (
            <Button variant="outline" onClick={() => exportMisFormExcel(form)}>
              <Download className="size-4" />
              Export Excel
            </Button>
          )}
          {form?.status === "submitted" && (
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600">
              <Lock className="size-3.5" />
              Submitted & locked
            </span>
          )}
        </div>
      </div>
      {form && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Due", due],
            ["Done", done],
            ["Missed", missed],
            ["Compliance", `${due ? ((done / due) * 100).toFixed(1) : "100.0"}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>
      )}
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">Loading Monthly MIS…</div>
      ) : !form ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          No Monthly MIS form is configured for this branch.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <div className="border-b border-border bg-primary px-4 py-3 text-center font-semibold text-primary-foreground">
            MONTHLY MIS – DATE-WISE SUBMISSION CALENDAR
          </div>
          <table className="w-full min-w-[850px] text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="sticky left-0 z-10 min-w-64 bg-muted px-4 py-3 text-left">
                  MIS Activity
                </th>
                <th className="px-3 py-3 text-left">Schedule</th>
                <th className="px-3 py-3 text-left">Due dates / completion</th>
                <th className="px-3 py-3 text-center">Due</th>
                <th className="px-3 py-3 text-center">Done</th>
                <th className="px-3 py-3 text-center">Missed</th>
                <th className="px-3 py-3 text-center">Compliance %</th>
              </tr>
            </thead>
            <tbody>
              {form.activities.map((activity) => {
                const entries = byActivity.get(activity.id) ?? [];
                return (
                  <tr key={activity.id} className="border-t border-border align-top">
                    <td className="sticky left-0 bg-card px-4 py-3 font-medium">
                      {activity.activity_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      {misScheduleLabel(activity)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {entries.map((entry) => (
                          <button
                            key={entry.due_date}
                            type="button"
                            disabled={form.status === "submitted"}
                            onClick={() => toggle(activity.id, entry.due_date)}
                            title={entry.due_date}
                            className={`flex size-8 items-center justify-center rounded-md border text-xs font-semibold ${entry.completed ? "border-emerald-500 bg-emerald-500 text-white" : entry.due_date < new Date().toISOString().slice(0, 10) ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-background hover:bg-muted"}`}
                          >
                            {entry.completed ? (
                              <CheckCircle2 className="size-4" />
                            ) : (
                              Number(entry.due_date.slice(-2))
                            )}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold">{entries.length}</td>
                    <td className="px-3 py-3 text-center font-semibold text-emerald-600">
                      {entries.filter((e) => e.completed).length}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-destructive">
                      {
                        entries.filter(
                          (e) => !e.completed && e.due_date < new Date().toISOString().slice(0, 10),
                        ).length
                      }
                    </td>
                    <td className="px-3 py-3 text-center font-semibold">
                      {entries.length
                        ? `${((entries.filter((e) => e.completed).length / entries.length) * 100).toFixed(1)}%`
                        : "100.0%"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {form?.status === "draft" && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={saving} onClick={() => save(false)}>
            <Save className="size-4" />
            Save draft
          </Button>
          <Button disabled={saving} onClick={() => save(true)}>
            <Send className="size-4" />
            Submit & lock
          </Button>
        </div>
      )}
    </div>
  );
}

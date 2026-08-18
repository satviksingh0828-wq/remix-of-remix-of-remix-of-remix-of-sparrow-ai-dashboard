import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchModuleLogs, useAppSettings, useCheckinLogs, useSaveCheckinLogs } from "@/lib/hooks";
import { ymd } from "@/lib/attendance-utils";

export function AttendanceAutomarker() {
  const [date, setDate] = useState(ymd(new Date()));
  const { data: settings, isLoading: settingsLoading } = useAppSettings();
  const { data: logs = [], isLoading } = useCheckinLogs(date);
  const saveLogs = useSaveCheckinLogs();

  const refresh = async () => {
    if (!settings?.attendance_module_enabled || !settings.attendance_module_url) {
      toast.error("Enable and configure the attendance module in Settings first.");
      return;
    }
    try {
      const fetched = await fetchModuleLogs(
        settings.attendance_module_url,
        settings.attendance_module_key ?? "",
        date,
      );
      await saveLogs.mutateAsync(fetched);
      toast.success(`${fetched.length} attendance events synced`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sync attendance events");
    }
  };

  if (settingsLoading || isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance automarker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review check-in and check-out events received from the attendance module.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-auto"
          />
          <Button onClick={refresh} disabled={saveLogs.isPending} className="gap-2">
            <RefreshCw className="size-4" />
            Sync events
          </Button>
        </div>
      </header>
      {!settings?.attendance_module_enabled && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Attendance module is disabled. Enable it from Settings → Attendance Module before syncing.
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Event</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b last:border-0">
                <td className="px-4 py-3">{new Date(log.logged_at).toLocaleTimeString("en-IN")}</td>
                <td className="px-4 py-3 font-medium">
                  {log.employee_name}
                  <span className="ml-2 text-xs text-muted-foreground">{log.employee_number}</span>
                </td>
                <td className="px-4 py-3">{log.department}</td>
                <td className="px-4 py-3 capitalize">{log.kind.replace("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.length && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No module events for this date.
          </p>
        )}
      </div>
    </div>
  );
}

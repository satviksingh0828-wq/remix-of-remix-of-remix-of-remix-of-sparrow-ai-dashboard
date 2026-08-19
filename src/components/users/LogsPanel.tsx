import { useEffect, useState } from "react";
import { RefreshCw, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { serverListLogs, serverDeleteLogs } from "@/lib/log-actions";
import type { LogEntry } from "@/lib/log-actions";

const ENTITY_TYPES = [
  { value: "all", label: "All modules" },
  { value: "login", label: "Login" },
  { value: "trip", label: "Trips" },
  { value: "vehicle", label: "Vehicles" },
  { value: "driver", label: "Drivers" },
  { value: "transporter", label: "Transporters" },
  { value: "contract", label: "Contracts" },
  { value: "location", label: "Locations" },
  { value: "income", label: "Income" },
  { value: "expenditure", label: "Expenditure" },
  { value: "user", label: "Users" },
  { value: "settings", label: "Settings" },
  { value: "branch", label: "Branches" },
  { value: "employee", label: "HR Employees" },
  { value: "department", label: "HR Departments" },
  { value: "attendance", label: "HR Attendance" },
  { value: "holiday", label: "HR Holidays" },
  { value: "hr_settings", label: "HR Settings" },
  { value: "payroll", label: "HR Payroll" },
  { value: "loan", label: "HR Loans" },
  { value: "advance", label: "HR Advances" },
  { value: "loan_installment", label: "Loan Installments" },
  { value: "advance_installment", label: "Advance Installments" },
  { value: "loss_deduction", label: "Loss Deductions" },
  { value: "checkin_log", label: "Check-in Logs" },
];

function actionBadgeClass(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("creat") || a.includes("add")) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (a.includes("delet") || a.includes("remov")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (a.includes("close") || a.includes("lock")) return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  if (a.includes("reopen") || a.includes("restor")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (a.includes("fail") || a.includes("error")) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (a.includes("login") || a.includes("sign")) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  return "bg-muted text-muted-foreground";
}

export function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState("all");
  const [clearing, setClearing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await serverListLogs({
        data: {
          entity_type: entityFilter === "all" ? undefined : entityFilter,
          limit: 500,
        },
      });
      setLogs(rows as LogEntry[]);
    } catch (err) {
      toast.error("Could not load logs");
      void err;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter]);

  async function clearLogs() {
    const label =
      entityFilter === "all"
        ? "all logs"
        : `all ${ENTITY_TYPES.find((t) => t.value === entityFilter)?.label ?? entityFilter} logs`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    setClearing(true);
    try {
      await serverDeleteLogs({
        data: { entity_type: entityFilter === "all" ? undefined : entityFilter },
      });
      toast.success("Logs cleared");
      setLogs([]);
    } catch {
      toast.error("Could not clear logs");
    } finally {
      setClearing(false);
    }
  }

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Activity Logs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit trail of all actions across the system. Visible to admins only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
            disabled={clearing || logs.length === 0}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="size-4" />
            Clear {entityFilter === "all" ? "all" : "filtered"} logs
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/50 p-3">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="Filter by module" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {loading ? "Loading…" : `${logs.length} record${logs.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
          No logs found for this filter.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 whitespace-nowrap">Date / Time</th>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Module</th>
                <th className="py-2 pr-3">Action</th>
                <th className="py-2 pr-3">Record</th>
                <th className="py-2 pr-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-border/60 hover:bg-muted/30">
                  <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="py-2 pr-3 font-medium">{log.username || "—"}</td>
                  <td className="py-2 pr-3 capitalize text-muted-foreground">
                    {log.entity_type || "—"}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${actionBadgeClass(log.action)}`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    {log.entity_label ? (
                      <span className="font-medium">{log.entity_label}</span>
                    ) : log.entity_id ? (
                      <span className="font-mono text-xs text-muted-foreground">
                        {log.entity_id.slice(0, 8)}…
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2 pr-3 max-w-xs">
                    {log.details && Object.keys(log.details).length > 0 ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {Object.entries(log.details)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(", ")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

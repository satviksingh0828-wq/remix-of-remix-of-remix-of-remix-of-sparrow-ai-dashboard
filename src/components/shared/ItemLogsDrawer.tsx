/**
 * ItemLogsDrawer — reusable per-record audit log button + sheet.
 * Admin-only: renders nothing for non-admin users.
 */
import { useState } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { serverListLogsByEntity } from "@/lib/log-actions";
import { useSession } from "@/lib/session";
import type { LogEntry } from "@/lib/log-actions";

function actionBadgeClass(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("creat") || a.includes("add"))
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  if (a.includes("delet") || a.includes("remov"))
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (a.includes("close") || a.includes("lock"))
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  if (a.includes("reopen") || a.includes("restor"))
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  if (a.includes("fail") || a.includes("error"))
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (a.includes("login") || a.includes("sign"))
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  return "bg-muted text-muted-foreground";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ItemLogsButton({
  entityType,
  entityId,
  entityLabel,
}: {
  entityType: string;
  entityId: string;
  entityLabel: string;
}) {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Only render for admins
  if (user?.role !== "admin") return null;

  async function load() {
    setLoading(true);
    try {
      const rows = await serverListLogsByEntity({
        data: { entity_type: entityType, entity_id: entityId },
      });
      setLogs(rows as LogEntry[]);
    } catch {
      // silent — logs are non-critical
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    load();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleOpen}
        title="View activity logs"
        className="text-muted-foreground"
      >
        <ScrollText className="size-4" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="flex w-[480px] max-w-full flex-col overflow-hidden">
          <SheetHeader className="shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <ScrollText className="size-4 text-primary" />
              Activity Logs
            </SheetTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {entityLabel}
            </p>
          </SheetHeader>

          <div className="mt-4 flex-1 space-y-2 overflow-y-auto pb-6">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            ) : logs.length === 0 ? (
              <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
                No activity recorded for this record yet.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-border bg-card p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${actionBadgeClass(log.action)}`}
                    >
                      {log.action}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-medium">
                    {log.username || "unknown"}
                  </p>
                  {log.details && Object.keys(log.details).length > 0 ? (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {Object.entries(log.details)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * Admin-only notification bell.
 * Fetches live alerts (insurance expiry, road-tax expiry, manifest source
 * mismatches) from the server and shows them in a dropdown panel.
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, FileWarning, ShieldAlert, X } from "lucide-react";
import { serverFetchNotifications, type NotificationItem } from "@/lib/notifications";

// ── icon per kind ─────────────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: NotificationItem["kind"] }) {
  if (kind === "insurance")
    return <ShieldAlert className="size-4 shrink-0 text-amber-500" />;
  if (kind === "road_tax")
    return <AlertTriangle className="size-4 shrink-0 text-violet-500" />;
  return <FileWarning className="size-4 shrink-0 text-rose-500" />;
}

function urgencyClass(item: NotificationItem): string {
  if (item.daysLeft !== undefined && item.daysLeft <= 7)
    return "border-l-2 border-destructive";
  if (item.daysLeft !== undefined && item.daysLeft <= 15)
    return "border-l-2 border-amber-400";
  if (item.kind === "manifest_mismatch")
    return "border-l-2 border-rose-400";
  return "border-l-2 border-border";
}

// ── main component ────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [items, setItems]             = useState<NotificationItem[]>([]);
  const [loading, setLoading]         = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const panelRef                      = useRef<HTMLDivElement>(null);
  const buttonRef                     = useRef<HTMLButtonElement>(null);

  // Fetch notifications (cache 2 min)
  async function load(force = false) {
    if (!force && lastFetched && Date.now() - lastFetched < 120_000) return;
    setLoading(true);
    try {
      const data = await serverFetchNotifications();
      setItems(data);
      setLastFetched(Date.now());
    } catch {
      // silently ignore — non-critical
    } finally {
      setLoading(false);
    }
  }

  // Load on first render and every 2 min
  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 120_000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const count = items.length;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        aria-label={`Notifications${count > 0 ? ` (${count})` : ""}`}
        className="relative flex size-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[10px] font-bold leading-none text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-10 z-50 w-[340px] rounded-xl border border-border bg-card shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="size-4 text-primary" />
              <span className="text-sm font-semibold">Notifications</span>
              {count > 0 && (
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                  {count}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Bell className="size-8 opacity-30" />
                <span>All clear — no alerts</span>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className={`flex gap-3 px-4 py-3 ${urgencyClass(item)}`}>
                    <div className="mt-0.5">
                      <KindIcon kind={item.kind} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer: section counts */}
          {items.length > 0 && (
            <div className="flex items-center gap-3 border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
              {items.filter((i) => i.kind === "insurance").length > 0 && (
                <span className="flex items-center gap-1">
                  <ShieldAlert className="size-3 text-amber-500" />
                  {items.filter((i) => i.kind === "insurance").length} insurance
                </span>
              )}
              {items.filter((i) => i.kind === "road_tax").length > 0 && (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="size-3 text-violet-500" />
                  {items.filter((i) => i.kind === "road_tax").length} road tax
                </span>
              )}
              {items.filter((i) => i.kind === "manifest_mismatch").length > 0 && (
                <span className="flex items-center gap-1">
                  <FileWarning className="size-3 text-rose-500" />
                  {items.filter((i) => i.kind === "manifest_mismatch").length} mismatch
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

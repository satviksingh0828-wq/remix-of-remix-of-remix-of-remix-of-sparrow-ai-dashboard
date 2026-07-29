import { useEffect, useState } from "react";
import { Archive, Clock, Eye, Lock, Plus, RotateCcw, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/session";
import { closeTrip } from "@/lib/close-trip";
import { reopenTrip } from "@/lib/reopen-trip";
import { inr } from "@/lib/trip-calc";
import { fetchAll } from "@/lib/fetch-all";
import { logAction } from "@/lib/log-actions";
import { ItemLogsButton } from "@/components/shared/ItemLogsDrawer";
import { TripForm, emptyTrip, type TripRow } from "./TripForm";
import { ClosedTripDetail } from "./ClosedTripDetail";

type ClosedTrip = {
  id: string;
  trip_code: string;
  branch_name: string | null;
  start_date: string | null;
  end_date: string | null;
  net_income: number;
  closed_at: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/** Returns the auto-close deadline for a live trip. */
function getTripDeadline(t: TripRow): Date | null {
  // Reopened trips: auto-close 1 day after reopen
  if (t.reopened_at) {
    return new Date(new Date(t.reopened_at).getTime() + ONE_DAY_MS);
  }
  // Normal trips: auto-close 2 days after start_date + start_time
  if (t.start_date) {
    const isoStr = t.start_time
      ? `${t.start_date}T${t.start_time}:00`
      : `${t.start_date}T00:00:00`;
    return new Date(new Date(isoStr).getTime() + TWO_DAYS_MS);
  }
  // Fallback: 2 days from creation
  if (t.created_at) {
    return new Date(new Date(t.created_at as string).getTime() + TWO_DAYS_MS);
  }
  return null;
}

/** Live countdown badge shown on each trip row. Updates every minute. */
function TimeLeft({ trip }: { trip: TripRow }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const deadline = getTripDeadline(trip);
  if (!deadline) return null;

  const msLeft = deadline.getTime() - Date.now();

  if (msLeft <= 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
        <Clock className="size-3" />
        Closing…
      </span>
    );
  }

  const totalHours = Math.floor(msLeft / (1000 * 60 * 60));
  const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (totalHours >= 24) {
    const days = Math.floor(totalHours / 24);
    const hrs = totalHours % 24;
    return (
      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
        <Clock className="size-3" />
        {trip.reopened_at ? "Reopened · " : ""}Closes in {days}d {hrs}h
      </span>
    );
  }
  if (totalHours >= 4) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        <Clock className="size-3" />
        Closes in {totalHours}h {mins}m
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
      <Clock className="size-3" />
      Closes in {totalHours}h {mins}m
    </span>
  );
}

export function Trips() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [closed, setClosed] = useState<ClosedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TripRow | null>(null);
  const [viewingClosedId, setViewingClosedId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [reopeningId, setReopeningId] = useState<string | null>(null);

  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const isBasic = user?.role === "basic";
  const allowedBranchIds = isBasic ? (user?.branchIds ?? []) : null;

  // Closed trips: show last 90 days by default; admin can expand to all-time
  const [showAllClosed, setShowAllClosed] = useState(false);

  async function load() {
    setLoading(true);
    try {
      // Basic user with no branches: show nothing
      if (allowedBranchIds !== null && allowedBranchIds.length === 0) {
        setTrips([]);
        setClosed([]);
        setLoading(false);
        return;
      }

      // Default: closed_trips last 90 days only (prevents loading 50k archived rows on startup)
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const [live, archived] = await Promise.all([
        fetchAll<TripRow>(() => {
          let q = supabase
            .from("trips")
            .select("*")
            .order("created_at", { ascending: false });
          if (allowedBranchIds !== null) {
            q = q.in("branch_id", allowedBranchIds) as typeof q;
          }
          return q;
        }),
        fetchAll<ClosedTrip>(() => {
          let q = supabase
            .from("closed_trips")
            .select("id,trip_code,branch_name,start_date,end_date,net_income,closed_at")
            .order("closed_at", { ascending: false });
          if (!showAllClosed) {
            q = q.gte("closed_at", ninetyDaysAgo) as typeof q;
          }
          if (allowedBranchIds !== null) {
            q = q.in("branch_id", allowedBranchIds) as typeof q;
          }
          return q;
        }),
      ]);

      // Auto-close trips that have passed their deadline
      const now = Date.now();
      const stale = live.filter((t) => {
        const deadline = getTripDeadline(t);
        if (!deadline) return false;
        return now > deadline.getTime();
      });

      if (stale.length > 0) {
        let autoClosed = 0;
        for (const staleTrip of stale) {
          try {
            await closeTrip(staleTrip.id!);
            logAction("auto_closed", "trip", {
              entityId: staleTrip.id,
              entityLabel: staleTrip.trip_code,
              details: {
                reason: staleTrip.reopened_at
                  ? "auto-closed 1 day after reopen"
                  : "auto-closed after 2 days",
              },
            });
            autoClosed++;
          } catch {
            // ignore — continue with remaining trips
          }
        }
        if (autoClosed > 0) {
          toast.info(`${autoClosed} trip${autoClosed > 1 ? "s" : ""} auto-closed`);
        }

        // Reload after auto-close (same date window as initial load)
        const [freshLive, freshArchived] = await Promise.all([
          fetchAll<TripRow>(() => {
            let q = supabase
              .from("trips")
              .select("*")
              .order("created_at", { ascending: false });
            if (allowedBranchIds !== null) {
              q = q.in("branch_id", allowedBranchIds) as typeof q;
            }
            return q;
          }),
          fetchAll<ClosedTrip>(() => {
            let q = supabase
              .from("closed_trips")
              .select("id,trip_code,branch_name,start_date,end_date,net_income,closed_at")
              .order("closed_at", { ascending: false });
            if (!showAllClosed) {
              q = q.gte("closed_at", ninetyDaysAgo) as typeof q;
            }
            if (allowedBranchIds !== null) {
              q = q.in("branch_id", allowedBranchIds) as typeof q;
            }
            return q;
          }),
        ]);
        setTrips(freshLive);
        setClosed(freshArchived);
      } else {
        setTrips(live);
        setClosed(archived);
      }
    } catch {
      toast.error("Could not load trips");
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, showAllClosed]);

  async function remove(trip: TripRow) {
    if (!window.confirm("Delete this trip? This cannot be undone.")) return;
    const { error } = await supabase.from("trips").delete().eq("id", trip.id!);
    if (error) return toast.error(error.message);
    logAction("deleted", "trip", { entityId: trip.id, entityLabel: trip.trip_code });
    toast.success("Trip removed");
    load();
  }

  async function close(trip: TripRow) {
    if (
      !window.confirm(
        "Close this trip? A full snapshot is archived and the live trip is removed. This cannot be undone.",
      )
    )
      return;
    setClosingId(trip.id!);
    try {
      await closeTrip(trip.id!);
      logAction("closed", "trip", { entityId: trip.id, entityLabel: trip.trip_code });
      toast.success("Trip closed and archived");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not close trip");
    } finally {
      setClosingId(null);
    }
  }

  async function reopen(c: ClosedTrip) {
    if (!isAdmin) {
      toast.error("Only admins can reopen trips.");
      return;
    }
    if (
      !window.confirm(
        "Reopen this trip? It moves back to live trips (current contract rates apply) and will auto-close in 1 day if not manually closed.",
      )
    )
      return;
    setReopeningId(c.id);
    try {
      const newId = await reopenTrip(c.id);
      logAction("reopened", "trip", { entityId: newId, entityLabel: c.trip_code });
      toast.success("Trip reopened — auto-closes in 1 day");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reopen trip");
    } finally {
      setReopeningId(null);
    }
  }

  // ── Inline detail views (replace the list) ────────────────────────────────

  if (editing)
    return (
      <TripForm
        initial={editing}
        onBack={() => {
          setEditing(null);
          load();
        }}
        onSaved={load}
      />
    );

  if (viewingClosedId)
    return (
      <ClosedTripDetail
        closedId={viewingClosedId}
        onBack={() => {
          setViewingClosedId(null);
          load();
        }}
        onReopened={() => {
          setViewingClosedId(null);
          load();
        }}
      />
    );

  // ── List view ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => {
          const t = emptyTrip();
          // Auto-fill branch when user has exactly one allowed branch
          if (allowedBranchIds?.length === 1) t.branch_id = allowedBranchIds[0];
          setEditing(t);
        }}>
          <Plus className="size-4" />
          New trip
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : trips.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
          {isBasic && allowedBranchIds?.length === 0
            ? "No branches assigned to your account. Contact your administrator."
            : "No trips yet. Create a trip to record manifests, income and expenses."}
        </p>
      ) : (
        <ul className="space-y-2">
          {trips.map((t) => (
            <li
              key={t.id}
              className="surface-card flex flex-wrap items-center gap-3 p-4 transition-colors hover:bg-muted/40"
            >
              <Truck className="size-4 shrink-0 text-primary" />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setEditing(t)}
              >
                <span className="block text-sm font-medium">{t.trip_code}</span>
                <span className="block text-xs text-muted-foreground">
                  {[
                    t.ownership === "own" ? "Own vehicle" : "Rented",
                    t.start_date,
                    t.start_time,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
              {/* Auto-close countdown — visible to all users */}
              <TimeLeft trip={t} />
              {/* Admin-only: per-row logs */}
              {isAdmin && t.id ? (
                <ItemLogsButton
                  entityType="trip"
                  entityId={t.id}
                  entityLabel={t.trip_code}
                />
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(t)}
                aria-label="Delete trip"
              >
                <Trash2 className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={closingId === t.id}
                onClick={() => close(t)}
                title="Close & archive this trip"
              >
                <Lock className="size-4" />
                Close
              </Button>
            </li>
          ))}
        </ul>
      )}

      {closed.length > 0 ? (
        <section className="space-y-2 pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Archive className="size-4 text-muted-foreground" />
            Closed trips
            {!showAllClosed && (
              <span className="text-xs font-normal text-muted-foreground">(last 90 days)</span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground">
            Archived snapshots. Later changes to masters, contracts or rates never affect
            these.
          </p>
          <ul className="space-y-2">
            {closed.map((c) => (
              <li key={c.id} className="surface-card flex items-center gap-3 p-4">
                <Archive className="size-4 text-muted-foreground" />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setViewingClosedId(c.id)}
                >
                  <span className="block text-sm font-medium">{c.trip_code}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[c.branch_name, c.start_date, c.end_date]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </button>
                {/* Net income shown to admins only */}
                {isAdmin ? (
                  <span className="text-sm font-semibold">{inr(Number(c.net_income ?? 0))}</span>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewingClosedId(c.id)}
                  title="View full archived details"
                >
                  <Eye className="size-4" />
                  Details
                </Button>
                {/* Admin-only: reopen trips */}
                {isAdmin ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={reopeningId === c.id}
                    onClick={() => reopen(c)}
                    title="Move back to live trips (admin only)"
                  >
                    <RotateCcw className="size-4" />
                    Reopen
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {/* Load older closed trips if viewing only last 90 days */}
          {!showAllClosed && (
            <button
              type="button"
              className="mt-2 w-full rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              onClick={() => setShowAllClosed(true)}
            >
              Load all archived trips
            </button>
          )}
        </section>
      ) : null}
    </div>
  );
}

import { useEffect, useState, useMemo } from "react";
import { Archive, Building2, Clock, Eye, Plus, RotateCcw, Search, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  branch_id: string | null;
  branch_name: string | null;
  start_date: string | null;
  end_date: string | null;
  net_income: number;
  closed_at: string;
};

type BranchOption = { id: string; name: string };

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

/** Returns the auto-close deadline for a live trip. */
function getTripDeadline(t: TripRow): Date | null {
  // Bulk-imported trips are intentionally kept open until a user closes them manually.
  if (t.notes === "IMPORT_OPEN_TRIP") return null;
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
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [branches, setBranches] = useState<BranchOption[]>([]);

  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const isBasic = user?.role === "basic";
  const isViewer = user?.role === "viewer";
  const allowedBranchIds = user?.role === "basic" ? (user?.branchIds ?? []) : null;

  // Closed trips: load archived records in 15-day windows to avoid pulling all history at once.
  const [closedDaysToLoad, setClosedDaysToLoad] = useState(15);

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

      // Default: closed_trips last 15 days only; the list can extend in 15-day increments.
      const closedSince = new Date(Date.now() - closedDaysToLoad * 24 * 60 * 60 * 1000)
        .toISOString();

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
            .select("id,trip_code,branch_id,branch_name,start_date,end_date,net_income,closed_at")
            .order("closed_at", { ascending: false });
          q = q.gte("closed_at", closedSince) as typeof q;
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
              .select("id,trip_code,branch_id,branch_name,start_date,end_date,net_income,closed_at")
              .order("closed_at", { ascending: false });
            q = q.gte("closed_at", closedSince) as typeof q;
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

  // Fetch available branches for the filter (admin/viewer sees all; basic users see their allowed branches)
  useEffect(() => {
    async function loadBranches() {
      let q = supabase.from("branches").select("id,branch_name").order("branch_name");
      if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
        q = q.in("id", allowedBranchIds) as typeof q;
      }
      const { data } = await q;
      if (data) {
        setBranches((data as { id: string; branch_name: string }[]).map(b => ({ id: b.id, name: b.branch_name })));
      }
    }
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, closedDaysToLoad]);

  async function remove(trip: TripRow) {
    if (!window.confirm("Delete this trip? This cannot be undone.")) return;
    // Delete advance/balance entry by trip_code (stable across open/close/reopen).
    await supabase
      .from("approval_charge_advances" as never)
      .delete()
      .eq("trip_code", trip.trip_code);
    const { error } = await supabase.from("trips").delete().eq("id", trip.id!);
    if (error) return toast.error(error.message);
    logAction("deleted", "trip", { entityId: trip.id, entityLabel: trip.trip_code });
    toast.success("Trip removed");
    load();
  }

  async function removeClosed(c: ClosedTrip) {
    if (!window.confirm("Permanently delete this closed trip? This cannot be undone.")) return;
    // Delete advance/balance entry linked to this trip code.
    await supabase
      .from("approval_charge_advances" as never)
      .delete()
      .eq("trip_code", c.trip_code);
    const { error } = await supabase.from("closed_trips").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    logAction("deleted", "trip", { entityId: c.id, entityLabel: c.trip_code });
    toast.success("Closed trip deleted");
    load();
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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const matchesTripSearch = (id: string | null | undefined, tripCode: string | null | undefined) => {
    if (!normalizedSearch) return true;
    return [id, tripCode].some((value) =>
      (value ?? "").toLowerCase().includes(normalizedSearch),
    );
  };

  const visibleTrips = useMemo(() =>
    trips.filter((t) =>
      matchesTripSearch(t.id, t.trip_code) &&
      (branchFilter === "all" || t.branch_id === branchFilter)
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trips, normalizedSearch, branchFilter]
  );
  const visibleClosed = useMemo(() =>
    closed.filter((c) =>
      matchesTripSearch(c.id, c.trip_code) &&
      (branchFilter === "all" || c.branch_id === branchFilter)
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [closed, normalizedSearch, branchFilter]
  );

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
      <div className="flex flex-wrap items-center gap-2">
        {!isViewer ? (
        <Button
          size="sm"
          className="w-fit"
          onClick={() => {
            const t = emptyTrip();
            // Auto-fill branch when user has exactly one allowed branch
            if (allowedBranchIds?.length === 1) t.branch_id = allowedBranchIds[0];
            setEditing(t);
          }}
        >
          <Plus className="size-4" />
          New trip
        </Button>
        ) : null}
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search trip ID or code"
            className="pl-9"
            aria-label="Search trips by trip ID or code"
          />
        </div>
        {/* Branch filter — shown when there are multiple branches available */}
        {branches.length > 1 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="h-9 w-44">
              <Building2 className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : visibleTrips.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">
          {isBasic && allowedBranchIds?.length === 0
            ? "No branches assigned to your account. Contact your administrator."
            : normalizedSearch
              ? "No live trips match your search."
              : "No trips yet. Create a trip to record manifests, income and expenses."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visibleTrips.map((t) => (
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
              {!isViewer && !isBasic && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(t)}
                  aria-label="Delete trip"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading ? (
        <section className="space-y-2 pt-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <Archive className="size-4 text-muted-foreground" />
            Closed trips
            <span className="text-xs font-normal text-muted-foreground">
              (last {closedDaysToLoad} days)
            </span>
          </h3>
          <p className="text-xs text-muted-foreground">
            Archived snapshots. Later changes to masters, contracts or rates never affect
            these.
          </p>
          {visibleClosed.length === 0 ? (
            <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
              {normalizedSearch
                ? "No closed trips match your search in the loaded date range."
                : "No closed trips found in the loaded date range."}
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleClosed.map((c) => (
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
                  {/* Admin-only: reopen + delete closed trips */}
                  {isAdmin ? (
                    <>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeClosed(c)}
                        title="Permanently delete this closed trip"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {/* Load older closed trips in safe 15-day increments. */}
          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            onClick={() => setClosedDaysToLoad((days) => days + 15)}
          >
            Load next 15 days
          </button>
        </section>
      ) : null}
    </div>
  );
}

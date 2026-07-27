import { useEffect, useState } from "react";
import { Archive, Lock, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { closeTrip } from "@/lib/close-trip";
import { inr } from "@/lib/trip-calc";
import { fetchAll } from "@/lib/fetch-all";
import { TripForm, emptyTrip, type TripRow } from "./TripForm";

type ClosedTrip = {
  id: string;
  trip_code: string;
  branch_name: string | null;
  start_date: string | null;
  end_date: string | null;
  net_income: number;
  closed_at: string;
};

export function Trips() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [closed, setClosed] = useState<ClosedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TripRow | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [live, archived] = await Promise.all([
        fetchAll<TripRow>(() =>
          supabase.from("trips").select("*").order("created_at", { ascending: false }),
        ),
        fetchAll<ClosedTrip>(() =>
          supabase
            .from("closed_trips")
            .select("id,trip_code,branch_name,start_date,end_date,net_income,closed_at")
            .order("closed_at", { ascending: false }),
        ),
      ]);
      setTrips(live);
      setClosed(archived);
    } catch {
      toast.error("Could not load trips");
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Trip removed");
    load();
  }

  async function close(id: string) {
    if (
      !window.confirm(
        "Close this trip? A full snapshot is archived and the live trip is removed. This cannot be undone.",
      )
    )
      return;
    setClosingId(id);
    try {
      await closeTrip(id);
      toast.success("Trip closed and archived");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not close trip");
    } finally {
      setClosingId(null);
    }
  }

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setEditing(emptyTrip())}>
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
          No trips yet. Create a trip to record manifests, income and expenses.
        </p>
      ) : (
        <ul className="space-y-2">
          {trips.map((t) => (
            <li
              key={t.id}
              className="surface-card flex items-center gap-3 p-4 transition-colors hover:bg-muted/40"
            >
              <Truck className="size-4 text-primary" />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setEditing(t)}
              >
                <span className="block text-sm font-medium">{t.trip_code}</span>
                <span className="block text-xs text-muted-foreground">
                  {[
                    t.ownership === "own" ? "Own vehicle" : "Third party",
                    t.start_date,
                    t.start_time,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => t.id && remove(t.id)}
                aria-label="Delete trip"
              >
                <Trash2 className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={closingId === t.id}
                onClick={() => t.id && close(t.id)}
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
          </h3>
          <p className="text-xs text-muted-foreground">
            Archived snapshots. Later changes to masters, contracts or rates never affect
            these.
          </p>
          <ul className="space-y-2">
            {closed.map((c) => (
              <li key={c.id} className="surface-card flex items-center gap-3 p-4">
                <Archive className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{c.trip_code}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[c.branch_name, c.start_date, c.end_date]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </div>
                <span className="text-sm font-semibold">{inr(Number(c.net_income ?? 0))}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

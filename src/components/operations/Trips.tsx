import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TripForm, emptyTrip, type TripRow } from "./TripForm";

export function Trips() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TripRow | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load trips");
    setTrips((data as unknown as TripRow[]) ?? []);
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

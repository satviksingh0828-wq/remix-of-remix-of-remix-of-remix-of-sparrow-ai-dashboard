import { useState, useEffect, useMemo, Fragment } from "react";
import { ChevronDown, ChevronRight, Download, RefreshCw, Search, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr, num } from "@/lib/trip-calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv, toCsv } from "@/lib/csv";

interface VehicleRow {
  vehicle_id: string;
  registration_number: string;
  nickname?: string;
  total_fuel: number;
  total_parking: number;
  total_distance: number;
  trip_count: number;
}

interface TripLog {
  id: string;
  trip_code: string;
  trip_date: string;
  fuel_expense: number;
  parking_charges: number;
  odometer_start: number | null;
  odometer_end: number | null;
}

export function VehicleExpenseReport() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 7) + "-01";

  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<TripLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const vehicles = await fetchAll<any>(() =>
        supabase.from("vehicles").select("id,registration_number,nickname").order("registration_number")
      );

      let q = supabase.from("vehicle_trip_logs" as any).select("vehicle_id,fuel_expense,parking_charges,odometer_start,odometer_end");
      if (dateFrom) q = (q as any).gte("trip_date", dateFrom);
      if (dateTo)   q = (q as any).lte("trip_date", dateTo);
      const logs = await fetchAll<any>(() => q);

      const agg: Record<string, { fuel: number; parking: number; distance: number; trips: number }> = {};
      vehicles.forEach((v: any) => { agg[v.id] = { fuel: 0, parking: 0, distance: 0, trips: 0 }; });

      logs.forEach((l: any) => {
        if (!l.vehicle_id || !agg[l.vehicle_id]) return;
        agg[l.vehicle_id].fuel    += Number(l.fuel_expense    ?? 0);
        agg[l.vehicle_id].parking += Number(l.parking_charges ?? 0);
        const dist = l.odometer_end != null && l.odometer_start != null
          ? Number(l.odometer_end) - Number(l.odometer_start) : 0;
        agg[l.vehicle_id].distance += dist > 0 ? dist : 0;
        agg[l.vehicle_id].trips    += 1;
      });

      setRows(vehicles.map((v: any) => ({
        vehicle_id: v.id,
        registration_number: v.registration_number,
        nickname: v.nickname,
        total_fuel: agg[v.id].fuel,
        total_parking: agg[v.id].parking,
        total_distance: agg[v.id].distance,
        trip_count: agg[v.id].trips,
      })));
    } catch (err: any) {
      toast.error("Failed to load vehicle report: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(vehicleId: string) {
    setLoadingHistory(true);
    setSelectedId(vehicleId);
    try {
      let q = supabase.from("vehicle_trip_logs" as any).select("*").eq("vehicle_id", vehicleId).order("trip_date", { ascending: false });
      if (dateFrom) q = (q as any).gte("trip_date", dateFrom);
      if (dateTo)   q = (q as any).lte("trip_date", dateTo);
      const { data, error } = await q;
      if (error) throw error;
      setHistory(data as any[]);
    } catch (err: any) {
      toast.error("Failed to load history: " + err.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => { loadData(); }, [dateFrom, dateTo]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter(r =>
      r.registration_number.toLowerCase().includes(s) ||
      (r.nickname ?? "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  function handleExport() {
    const csv = toCsv(
      filtered.map(r => ({
        Vehicle: r.registration_number,
        Nickname: r.nickname ?? "—",
        "Trips": r.trip_count,
        "Total Distance (km)": r.total_distance,
        "Total Fuel (₹)": r.total_fuel,
        "Total Parking (₹)": r.total_parking,
      })),
      ["Vehicle", "Nickname", "Trips", "Total Distance (km)", "Total Fuel (₹)", "Total Parking (₹)"]
    );
    downloadCsv(csv, `vehicle_expense_report_${dateFrom}_${dateTo}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search vehicle..." className="h-9 pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" className="h-9 w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" className="h-9 w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9 gap-2">
            <Download className="size-4" /> Export
          </Button>
          <Button variant="ghost" size="icon" onClick={loadData} disabled={loading} className="h-9 w-9">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-4 py-3"></th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Nickname</th>
                <th className="px-4 py-3 text-right">Trips</th>
                <th className="px-4 py-3 text-right">Total Distance</th>
                <th className="px-4 py-3 text-right">Total Fuel</th>
                <th className="px-4 py-3 text-right">Total Parking</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="mx-auto mb-2 size-6 animate-spin opacity-20" />Loading…
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground">No data for this period.</td></tr>
              ) : (
                filtered.map(row => {
                  const isExpanded = selectedId === row.vehicle_id;
                  return (
                    <Fragment key={row.vehicle_id}>
                      <tr className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 text-center text-muted-foreground text-xs">{row.trip_count}</td>
                        <td className="px-4 py-3 font-medium">{row.registration_number}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.nickname ?? "—"}</td>
                        <td className="px-4 py-3 text-right">{row.trip_count}</td>
                        <td className="px-4 py-3 text-right font-medium">{row.total_distance > 0 ? `${row.total_distance.toLocaleString()} km` : "—"}</td>
                        <td className="px-4 py-3 text-right text-orange-600 font-medium">{row.total_fuel > 0 ? inr(row.total_fuel) : "—"}</td>
                        <td className="px-4 py-3 text-right text-blue-600 font-medium">{row.total_parking > 0 ? inr(row.total_parking) : "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                            onClick={() => isExpanded ? setSelectedId(null) : loadHistory(row.vehicle_id)}>
                            {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            {isExpanded ? "Hide" : "History"}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border">
                          <td colSpan={8} className="p-0">
                            <div className="max-h-[300px] overflow-y-auto p-4">
                              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Trip History</h4>
                              {loadingHistory ? (
                                <div className="py-4 text-center text-muted-foreground">Loading…</div>
                              ) : history.length === 0 ? (
                                <div className="py-4 text-center text-muted-foreground">No trips in this period.</div>
                              ) : (
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-foreground border-b border-border">
                                      <th className="pb-2 text-left font-semibold">Date</th>
                                      <th className="pb-2 text-left font-semibold">Trip</th>
                                      <th className="pb-2 text-right font-semibold">Odo Start</th>
                                      <th className="pb-2 text-right font-semibold">Odo End</th>
                                      <th className="pb-2 text-right font-semibold">Distance</th>
                                      <th className="pb-2 text-right font-semibold">Fuel</th>
                                      <th className="pb-2 text-right font-semibold">Parking</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/50">
                                    {history.map(h => {
                                      const dist = h.odometer_end != null && h.odometer_start != null
                                        ? Number(h.odometer_end) - Number(h.odometer_start) : null;
                                      return (
                                        <tr key={h.id}>
                                          <td className="py-2">{h.trip_date}</td>
                                          <td className="py-2 font-medium">{h.trip_code}</td>
                                          <td className="py-2 text-right text-muted-foreground">{h.odometer_start ?? "—"}</td>
                                          <td className="py-2 text-right text-muted-foreground">{h.odometer_end ?? "—"}</td>
                                          <td className="py-2 text-right">{dist != null && dist > 0 ? `${dist} km` : "—"}</td>
                                          <td className="py-2 text-right text-orange-600">{Number(h.fuel_expense) > 0 ? inr(Number(h.fuel_expense)) : "—"}</td>
                                          <td className="py-2 text-right text-blue-600">{Number(h.parking_charges) > 0 ? inr(Number(h.parking_charges)) : "—"}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

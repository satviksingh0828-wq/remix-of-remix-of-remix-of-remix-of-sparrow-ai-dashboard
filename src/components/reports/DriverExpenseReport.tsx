import { useState, useEffect, useMemo, Fragment } from "react";
import { ChevronDown, ChevronRight, Download, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/trip-calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv, toCsv } from "@/lib/csv";

interface DriverRow {
  driver_id: string;
  full_name: string;
  total_bata: number;
  total_morning: number;
  total_night: number;
  trip_count: number;
}

interface TripLog {
  id: string;
  trip_code: string;
  trip_date: string;
  driver_bata: number;
  morning_exp: number;
  night_exp: number;
}

export function DriverExpenseReport() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = today.slice(0, 7) + "-01";

  const [rows, setRows] = useState<DriverRow[]>([]);
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
      const drivers = await fetchAll<any>(() =>
        supabase.from("drivers").select("id,full_name").order("full_name")
      );

      let q = supabase.from("driver_expense_logs" as any).select("driver_id,driver_bata,morning_exp,night_exp");
      if (dateFrom) q = (q as any).gte("trip_date", dateFrom);
      if (dateTo)   q = (q as any).lte("trip_date", dateTo);
      const logs = await fetchAll<any>(() => q);

      const agg: Record<string, { bata: number; morning: number; night: number; trips: number }> = {};
      drivers.forEach((d: any) => { agg[d.id] = { bata: 0, morning: 0, night: 0, trips: 0 }; });

      logs.forEach((l: any) => {
        if (!l.driver_id || !agg[l.driver_id]) return;
        agg[l.driver_id].bata    += Number(l.driver_bata ?? 0);
        agg[l.driver_id].morning += Number(l.morning_exp ?? 0);
        agg[l.driver_id].night   += Number(l.night_exp   ?? 0);
        agg[l.driver_id].trips   += 1;
      });

      setRows(drivers.map((d: any) => ({
        driver_id: d.id,
        name: d.name,
        total_bata:    agg[d.id].bata,
        total_morning: agg[d.id].morning,
        total_night:   agg[d.id].night,
        trip_count:    agg[d.id].trips,
      })));
    } catch (err: any) {
      toast.error("Failed to load driver report: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(driverId: string) {
    setLoadingHistory(true);
    setSelectedId(driverId);
    try {
      let q = supabase.from("driver_expense_logs" as any).select("*").eq("driver_id", driverId).order("trip_date", { ascending: false });
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
    return rows.filter(r => r.name.toLowerCase().includes(s));
  }, [rows, search]);

  function handleExport() {
    const csv = toCsv(
      filtered.map(r => ({
        Driver: r.name,
        Trips: r.trip_count,
        "Driver Bata (₹)": r.total_bata,
        "Morning Exp. (₹)": r.total_morning,
        "Night Exp. (₹)": r.total_night,
        "Total (₹)": r.total_bata + r.total_morning + r.total_night,
      })),
      ["Driver", "Trips", "Driver Bata (₹)", "Morning Exp. (₹)", "Night Exp. (₹)", "Total (₹)"]
    );
    downloadCsv(csv, `driver_expense_report_${dateFrom}_${dateTo}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search driver…" className="h-9 pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3 text-right">Trips</th>
                <th className="px-4 py-3 text-right">Driver Bata</th>
                <th className="px-4 py-3 text-right">Morning Exp.</th>
                <th className="px-4 py-3 text-right">Night Exp.</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="mx-auto mb-2 size-6 animate-spin opacity-20" />Loading…
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">No data for this period.</td></tr>
              ) : (
                filtered.map(row => {
                  const total = row.total_bata + row.total_morning + row.total_night;
                  const isExpanded = selectedId === row.driver_id;
                  return (
                    <Fragment key={row.driver_id}>
                      <tr className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.trip_count}</td>
                        <td className="px-4 py-3 text-right text-purple-600 font-medium">{row.total_bata > 0 ? inr(row.total_bata) : "—"}</td>
                        <td className="px-4 py-3 text-right text-amber-600 font-medium">{row.total_morning > 0 ? inr(row.total_morning) : "—"}</td>
                        <td className="px-4 py-3 text-right text-blue-600 font-medium">{row.total_night > 0 ? inr(row.total_night) : "—"}</td>
                        <td className="px-4 py-3 text-right font-bold">{total > 0 ? inr(total) : "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                            onClick={() => isExpanded ? setSelectedId(null) : loadHistory(row.driver_id)}>
                            {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            {isExpanded ? "Hide" : "History"}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border">
                          <td colSpan={7} className="p-0">
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
                                      <th className="pb-2 text-right font-semibold">Bata</th>
                                      <th className="pb-2 text-right font-semibold">Morning</th>
                                      <th className="pb-2 text-right font-semibold">Night</th>
                                      <th className="pb-2 text-right font-semibold">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/50">
                                    {history.map(h => {
                                      const t = Number(h.driver_bata) + Number(h.morning_exp) + Number(h.night_exp);
                                      return (
                                        <tr key={h.id}>
                                          <td className="py-2">{h.trip_date}</td>
                                          <td className="py-2 font-medium">{h.trip_code}</td>
                                          <td className="py-2 text-right text-purple-600">{Number(h.driver_bata) > 0 ? inr(Number(h.driver_bata)) : "—"}</td>
                                          <td className="py-2 text-right text-amber-600">{Number(h.morning_exp) > 0 ? inr(Number(h.morning_exp)) : "—"}</td>
                                          <td className="py-2 text-right text-blue-600">{Number(h.night_exp) > 0 ? inr(Number(h.night_exp)) : "—"}</td>
                                          <td className="py-2 text-right font-semibold">{t > 0 ? inr(t) : "—"}</td>
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

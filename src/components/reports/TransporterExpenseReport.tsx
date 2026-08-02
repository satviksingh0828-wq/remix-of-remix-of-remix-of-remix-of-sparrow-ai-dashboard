import { useState, useEffect, useMemo, Fragment } from "react";
import { ChevronDown, ChevronRight, Download, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/trip-calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv, toCsv } from "@/lib/csv";

const MONTHS = [
  { v: "01", l: "January" }, { v: "02", l: "February" }, { v: "03", l: "March" },
  { v: "04", l: "April" },   { v: "05", l: "May" },       { v: "06", l: "June" },
  { v: "07", l: "July" },    { v: "08", l: "August" },    { v: "09", l: "September" },
  { v: "10", l: "October" }, { v: "11", l: "November" },  { v: "12", l: "December" },
];

interface TransporterRow {
  transporter_id: string;
  transporter_name: string;
  total_hire: number;
  total_approval: number; // stored from other income (Approval Charge)
  trip_count: number;
}

interface TripLog {
  id: string;
  trip_code: string;
  trip_date: string;
  hire_charges: number;
  approval_charge: number;
}

export function TransporterExpenseReport() {
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

  const [year, setYear]   = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const years = useMemo(() => {
    const arr: string[] = [];
    for (let y = now.getFullYear(); y >= 2020; y--) arr.push(String(y));
    return arr;
  }, []);

  const [rows, setRows] = useState<TransporterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<TripLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  function dateRange() {
    const start = `${year}-${month === "all" ? "01" : month}-01`;
    let end: string;
    if (month === "all") {
      end = `${Number(year) + 1}-01-01`;
    } else {
      const nm = Number(month) + 1;
      end = nm > 12 ? `${Number(year) + 1}-01-01` : `${year}-${String(nm).padStart(2, "0")}-01`;
    }
    return { start, end };
  }

  async function loadData() {
    setLoading(true);
    try {
      const { start, end } = dateRange();

      const transporters = await fetchAll<any>(() =>
        supabase.from("transporters").select("id,transporter_name").order("transporter_name")
      );

      const logs = await fetchAll<any>(() =>
        supabase.from("transporter_expense_logs" as any)
          .select("transporter_id,hire_charges,approval_charge,trip_date")
          .gte("trip_date", start)
          .lt("trip_date", end)
      );

      const agg: Record<string, { hire: number; approval: number; trips: number }> = {};
      transporters.forEach((d: any) => { agg[d.id] = { hire: 0, approval: 0, trips: 0 }; });

      logs.forEach((l: any) => {
        if (!l.transporter_id || !agg[l.transporter_id]) return;
        agg[l.transporter_id].hire     += Number(l.hire_charges ?? 0);
        agg[l.transporter_id].approval += Number(l.approval_charge ?? 0);
        agg[l.transporter_id].trips    += 1;
      });

      setRows(transporters.map((d: any) => ({
        transporter_id: d.id,
        transporter_name: d.transporter_name ?? "—",
        total_hire:     agg[d.id].hire,
        total_approval: agg[d.id].approval,
        trip_count:     agg[d.id].trips,
      })));
    } catch (err: any) {
      toast.error("Failed to load transporter report: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(transporterId: string) {
    setLoadingHistory(true);
    setSelectedId(transporterId);
    try {
      const { start, end } = dateRange();
      const { data, error } = await supabase
        .from("transporter_expense_logs" as any)
        .select("*")
        .eq("transporter_id", transporterId)
        .gte("trip_date", start)
        .lt("trip_date", end)
        .order("trip_date", { ascending: false });
      if (error) throw error;
      setHistory(data as any[]);
    } catch (err: any) {
      toast.error("Failed to load history: " + err.message);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => { loadData(); }, [year, month]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return rows.filter(r => (r.transporter_name ?? "").toLowerCase().includes(s));
  }, [rows, search]);

  function handleExport() {
    const csv = toCsv(
      filtered.filter(r => r.trip_count > 0).map(r => ({
        Transporter: r.transporter_name,
        Trips: r.trip_count,
        "Hire Charges (₹)": r.total_hire,
        "Other Income / Approval (₹)": r.total_approval,
        "Total (₹)": r.total_hire + r.total_approval,
      })),
      ["Transporter", "Trips", "Hire Charges (₹)", "Other Income / Approval (₹)", "Total (₹)"]
    );
    const label = month === "all" ? year : `${year}-${month}`;
    downloadCsv(csv, `transporter_expense_${label}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="Search transporter…" className="h-9 pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Select value={year} onValueChange={v => { setYear(v); setSelectedId(null); }}>
          <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={month} onValueChange={v => { setMonth(v); setSelectedId(null); }}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {MONTHS.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}
          </SelectContent>
        </Select>

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
                <th className="px-4 py-3">Transporter</th>
                <th className="px-4 py-3 text-right">Trips</th>
                <th className="px-4 py-3 text-right">Hire Charges</th>
                <th className="px-4 py-3 text-right">Other Income</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="mx-auto mb-2 size-6 animate-spin opacity-20" />Loading…
                </td></tr>
              ) : filtered.filter(r => r.trip_count > 0).length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No trips found for this period.</td></tr>
              ) : (
                filtered.filter(r => r.trip_count > 0).map(row => {
                  const total = row.total_hire + row.total_approval;
                  const isExpanded = selectedId === row.transporter_id;
                  return (
                    <Fragment key={row.transporter_id}>
                      <tr className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{row.transporter_name}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{row.trip_count}</td>
                        <td className="px-4 py-3 text-right text-purple-600 font-medium">{row.total_hire > 0 ? inr(row.total_hire) : "—"}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">{row.total_approval > 0 ? inr(row.total_approval) : "—"}</td>
                        <td className="px-4 py-3 text-right font-bold">{total > 0 ? inr(total) : "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                            onClick={() => isExpanded ? setSelectedId(null) : loadHistory(row.transporter_id)}>
                            {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            {isExpanded ? "Hide" : "History"}
                          </Button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-muted/10 border-b border-border">
                          <td colSpan={6} className="p-0">
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
                                      <th className="pb-2 text-right font-semibold">Hire Charges</th>
                                      <th className="pb-2 text-right font-semibold">Other Income</th>
                                      <th className="pb-2 text-right font-semibold">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/50">
                                    {history.map((h: any) => {
                                      const t = Number(h.hire_charges) + Number(h.approval_charge);
                                      return (
                                        <tr key={h.id}>
                                          <td className="py-2">{h.trip_date}</td>
                                          <td className="py-2 font-medium">{h.trip_code}</td>
                                          <td className="py-2 text-right text-purple-600">{Number(h.hire_charges) > 0 ? inr(Number(h.hire_charges)) : "—"}</td>
                                          <td className="py-2 text-right text-emerald-600">{Number(h.approval_charge) > 0 ? inr(Number(h.approval_charge)) : "—"}</td>
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

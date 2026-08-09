import { useState, useEffect, useMemo } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/trip-calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { fetchAll } from "@/lib/fetch-all";
import { downloadCsv, toCsv } from "@/lib/csv";
import { reportDateRange, tripCodesForBranch, useReportFilters } from "@/lib/report-filters";

const MONTHS = [
  { v: "01", l: "January" },
  { v: "02", l: "February" },
  { v: "03", l: "March" },
  { v: "04", l: "April" },
  { v: "05", l: "May" },
  { v: "06", l: "June" },
  { v: "07", l: "July" },
  { v: "08", l: "August" },
  { v: "09", l: "September" },
  { v: "10", l: "October" },
  { v: "11", l: "November" },
  { v: "12", l: "December" },
];

interface OtherLog {
  id: string;
  trip_code: string;
  trip_date: string;
  dala_charges: number;
  unloading: number;
  sunday_exp: number;
  other_amount: number;
  other_details: { name: string; amount: number }[];
}

interface Totals {
  dala: number;
  unloading: number;
  sunday: number;
  other: number;
}

export function OtherExpenseReport() {
  const { branchId, financialYear } = useReportFilters();
  const now = new Date();
  const currentYear = String(now.getFullYear());
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const years = useMemo(() => {
    const arr: string[] = [];
    for (let y = now.getFullYear(); y >= 2020; y--) arr.push(String(y));
    return arr;
  }, []);

  const [logs, setLogs] = useState<OtherLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  function calendarDateRange() {
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

  function dateRange() {
    return reportDateRange(financialYear, calendarDateRange);
  }

  async function loadData() {
    setLoading(true);
    try {
      const { start, end } = dateRange();
      const branchTripCodes = await tripCodesForBranch(branchId);
      const data = await fetchAll<any>(() =>
        supabase
          .from("other_expense_logs" as any)
          .select("*")
          .gte("trip_date", start)
          .lt("trip_date", end)
          .order("trip_date", { ascending: false }),
      );
      setLogs(
        (branchTripCodes
          ? data.filter((log: OtherLog) => branchTripCodes.has(log.trip_code))
          : data) as OtherLog[],
      );
    } catch (err: any) {
      toast.error("Failed to load other expenses: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [year, month, financialYear, branchId]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return logs.filter((l) => (l.trip_code ?? "").toLowerCase().includes(s));
  }, [logs, search]);

  const totals: Totals = useMemo(
    () =>
      filtered.reduce(
        (acc, l) => ({
          dala: acc.dala + Number(l.dala_charges ?? 0),
          unloading: acc.unloading + Number(l.unloading ?? 0),
          sunday: acc.sunday + Number(l.sunday_exp ?? 0),
          other: acc.other + Number(l.other_amount ?? 0),
        }),
        { dala: 0, unloading: 0, sunday: 0, other: 0 },
      ),
    [filtered],
  );

  function handleExport() {
    const csv = toCsv(
      filtered.map((l) => ({
        "Trip Code": l.trip_code,
        Date: l.trip_date,
        "Dala Charges": l.dala_charges,
        Unloading: l.unloading,
        Sunday: l.sunday_exp,
        Other: l.other_amount,
        "Other Details": (l.other_details ?? [])
          .map((d: any) => `${d.name}: ${d.amount}`)
          .join("; "),
        Total:
          Number(l.dala_charges) +
          Number(l.unloading) +
          Number(l.sunday_exp) +
          Number(l.other_amount),
      })),
      [
        "Trip Code",
        "Date",
        "Dala Charges",
        "Unloading",
        "Sunday",
        "Other",
        "Other Details",
        "Total",
      ],
    );
    const label =
      financialYear !== "none"
        ? `FY-${financialYear}-${Number(financialYear) + 1}`
        : month === "all"
          ? year
          : `${year}-${month}`;
    downloadCsv(csv, `other_expense_${label}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 p-3">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search trip code…"
            className="h-9 pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {MONTHS.map((m) => (
              <SelectItem key={m.v} value={m.v}>
                {m.l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="h-9 gap-2">
            <Download className="size-4" /> Export
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            disabled={loading}
            className="h-9 w-9"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Dala Charges", value: totals.dala, color: "text-rose-600" },
            { label: "Unloading", value: totals.unloading, color: "text-indigo-600" },
            { label: "Sunday", value: totals.sunday, color: "text-teal-600" },
            { label: "Other", value: totals.other, color: "text-orange-600" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className={`mt-1 text-xl font-bold ${c.color}`}>{inr(c.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Trip Code</th>
                <th className="px-4 py-3 text-right">Dala Charges</th>
                <th className="px-4 py-3 text-right">Unloading</th>
                <th className="px-4 py-3 text-right">Sunday</th>
                <th className="px-4 py-3 text-right">Other</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto mb-2 size-6 animate-spin opacity-20" />
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No data for this period.
                  </td>
                </tr>
              ) : (
                <>
                  {filtered.map((row) => {
                    const total =
                      Number(row.dala_charges) +
                      Number(row.unloading) +
                      Number(row.sunday_exp) +
                      Number(row.other_amount);
                    const details: { name: string; amount: number }[] = row.other_details ?? [];
                    return (
                      <tr key={row.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3 text-muted-foreground">{row.trip_date}</td>
                        <td className="px-4 py-3 font-medium">{row.trip_code}</td>
                        <td className="px-4 py-3 text-right text-rose-600">
                          {Number(row.dala_charges) > 0 ? inr(Number(row.dala_charges)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-indigo-600">
                          {Number(row.unloading) > 0 ? inr(Number(row.unloading)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-teal-600">
                          {Number(row.sunday_exp) > 0 ? inr(Number(row.sunday_exp)) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-orange-600">
                          {Number(row.other_amount) > 0 ? (
                            <span title={details.map((d) => `${d.name}: ₹${d.amount}`).join(", ")}>
                              {inr(Number(row.other_amount))}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {total > 0 ? inr(total) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length > 1 && (
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold text-sm">
                      <td className="px-4 py-3 text-muted-foreground" colSpan={2}>
                        Total ({filtered.length} trips)
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600">
                        {totals.dala > 0 ? inr(totals.dala) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-indigo-600">
                        {totals.unloading > 0 ? inr(totals.unloading) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-teal-600">
                        {totals.sunday > 0 ? inr(totals.sunday) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        {totals.other > 0 ? inr(totals.other) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inr(totals.dala + totals.unloading + totals.sunday + totals.other)}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

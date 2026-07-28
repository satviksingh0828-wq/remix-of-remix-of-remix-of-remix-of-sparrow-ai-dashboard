/**
 * TripAveragesPanel — Admin-only. Monthly trip P&L with distribution of
 * other income/expenses to each trip by weight or quantity.
 */
import { useState, useMemo } from "react";
import { RefreshCw, Scale, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { serverFetchTripAverages, type TripAveragesData } from "@/lib/pnl";
import { inr } from "@/lib/trip-calc";

const MONTHS = [
  { value: "1",  label: "January" },  { value: "2",  label: "February" },
  { value: "3",  label: "March" },    { value: "4",  label: "April" },
  { value: "5",  label: "May" },      { value: "6",  label: "June" },
  { value: "7",  label: "July" },     { value: "8",  label: "August" },
  { value: "9",  label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

type DistMethod = "weight" | "quantity";

function SummaryCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const isPos = value >= 0;
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-bold tracking-tight ${
        highlight ? (isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : "text-foreground"
      }`}>{inr(value)}</p>
    </div>
  );
}

export function TripAveragesPanel() {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - 3 + i), [currentYear]);

  const [year,   setYear]   = useState(String(currentYear));
  const [month,  setMonth]  = useState(String(currentMonth));
  const [method, setMethod] = useState<DistMethod>("weight");
  const [data,   setData]   = useState<TripAveragesData | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const result = await serverFetchTripAverages({
        data: { year: Number(year), month: Number(month) },
      });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load trip averages");
    }
    setLoading(false);
  }

  // Compute distribution per trip
  const rows = useMemo(() => {
    if (!data) return [];
    const trips = data.trips;
    const totalBase = method === "weight"
      ? trips.reduce((s, t) => s + t.total_weight, 0)
      : trips.reduce((s, t) => s + t.total_quantity, 0);

    return trips.map(t => {
      const base = method === "weight" ? t.total_weight : t.total_quantity;
      const distRatio = totalBase > 0 ? base / totalBase : 0;
      const distAmount = distRatio * data.otherNetPnL;
      const finalNet = t.net_income + distAmount;
      return { ...t, base, distRatio, distAmount, finalNet };
    });
  }, [data, method]);

  const totalBase = useMemo(() => {
    if (!data) return 0;
    return method === "weight"
      ? data.trips.reduce((s, t) => s + t.total_weight, 0)
      : data.trips.reduce((s, t) => s + t.total_quantity, 0);
  }, [data, method]);

  const monthLabel = MONTHS.find(m => m.value === month)?.label ?? "";

  return (
    <div className="animate-fade-up space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={load} disabled={loading} size="sm">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Load
        </Button>

        {/* Distribution method toggle */}
        {data && (
          <div className="ml-auto flex items-center gap-1 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => setMethod("weight")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                method === "weight" ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scale className="size-3.5" /> By Weight
            </button>
            <button
              type="button"
              onClick={() => setMethod("quantity")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                method === "quantity" ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="size-3.5" /> By Quantity
            </button>
          </div>
        )}
      </div>

      {!data && !loading && (
        <div className="rounded-xl border border-dashed border-border px-4 py-14 text-center">
          <p className="text-sm text-muted-foreground">Select a year and month, then click <strong>Load</strong> to view trip distribution.</p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {data && !loading && (
        <>
          {/* Other P&L summary */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Other P&amp;L — {monthLabel} {year} <span className="normal-case">(excluding trip income/expense)</span>
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="Other Income" value={data.otherIncome} />
              <SummaryCard label="Fixed Income" value={data.fixedIncome} />
              <SummaryCard label="Expenditures" value={data.totalExpenditure} />
              <SummaryCard label="Other Net P&L" value={data.otherNetPnL} highlight />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              This net is distributed across {data.trips.length} trip{data.trips.length !== 1 ? "s" : ""} by{" "}
              <strong>{method}</strong>. Total month {method}: <strong>{totalBase.toLocaleString()}{method === "weight" ? " kg" : " units"}</strong>.
            </p>
          </div>

          {data.trips.length === 0 ? (
            <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              No closed trips in {monthLabel} {year}.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3 text-right">Income</th>
                    <th className="px-4 py-3 text-right">Expense</th>
                    <th className="px-4 py-3 text-right">Trip Net</th>
                    <th className="px-4 py-3 text-right">
                      {method === "weight" ? "Weight (kg)" : "Quantity"}
                    </th>
                    <th className="px-4 py-3 text-right">Share %</th>
                    <th className="px-4 py-3 text-right">Distribution</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">Final Net</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{row.trip_code || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.branch_name || "—"}</td>
                      <td className="px-4 py-3 text-right">{inr(row.total_income)}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{inr(row.total_expense)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${row.net_income >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {inr(row.net_income)}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {row.base > 0 ? row.base.toLocaleString() : <span className="text-xs opacity-50">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {totalBase > 0 ? `${(row.distRatio * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right ${row.distAmount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {inr(row.distAmount)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${row.finalNet >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {inr(row.finalNet)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                    <td className="px-4 py-3" colSpan={2}>Totals</td>
                    <td className="px-4 py-3 text-right">{inr(rows.reduce((s, r) => s + r.total_income, 0))}</td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{inr(rows.reduce((s, r) => s + r.total_expense, 0))}</td>
                    <td className={`px-4 py-3 text-right ${rows.reduce((s,r)=>s+r.net_income,0)>=0?"text-green-600 dark:text-green-400":"text-red-600 dark:text-red-400"}`}>
                      {inr(rows.reduce((s, r) => s + r.net_income, 0))}
                    </td>
                    <td className="px-4 py-3 text-right">{totalBase.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">100%</td>
                    <td className={`px-4 py-3 text-right ${data.otherNetPnL>=0?"text-green-600 dark:text-green-400":"text-red-600 dark:text-red-400"}`}>
                      {inr(data.otherNetPnL)}
                    </td>
                    <td className={`px-4 py-3 text-right ${rows.reduce((s,r)=>s+r.finalNet,0)>=0?"text-green-600 dark:text-green-400":"text-red-600 dark:text-red-400"}`}>
                      {inr(rows.reduce((s, r) => s + r.finalNet, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Note about zero weight/quantity trips */}
          {rows.some(r => r.base === 0) && (
            <p className="text-xs text-muted-foreground">
              ⚠ Some trips have no {method} data recorded — they receive 0% distribution. Ensure manifests include {method === "weight" ? "weight (kg)" : "quantity"} values.
            </p>
          )}
        </>
      )}
    </div>
  );
}

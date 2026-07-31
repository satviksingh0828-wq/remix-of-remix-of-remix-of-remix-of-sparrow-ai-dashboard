/**
 * TripAveragesPanel — Admin-only. Monthly trip P&L with distribution of
 * other income/expenses to each trip by weight or quantity.
 * Supports expandable manifest breakdown per trip and Excel exports.
 */
import { useState, useMemo } from "react";
import { RefreshCw, Scale, Package, FileDown, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { serverFetchTripAverages, type TripAveragesData } from "@/lib/pnl";
import { inr } from "@/lib/trip-calc";
import { financialYearLabel, financialYearOptions } from "@/lib/financial-year";

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

function netColor(v: number) {
  return v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

export function TripAveragesPanel() {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - 3 + i), [currentYear]);
  const financialYears = useMemo(() => financialYearOptions(currentYear), [currentYear]);

  const [year,        setYear]        = useState(String(currentYear));
  const [month,       setMonth]       = useState(String(currentMonth));
  const [financialYear, setFinancialYear] = useState("none");
  const [day,         setDay]         = useState<string>("");
  const [method,      setMethod]      = useState<DistMethod>("weight");
  const [data,        setData]        = useState<TripAveragesData | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setExpandedId(null);
    setDay("");
    try {
      const result = await serverFetchTripAverages({
        data: financialYear !== "none"
          ? { financialYearStart: Number(financialYear) }
          : { year: Number(year), month: Number(month) },
      });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load trip averages");
    }
    setLoading(false);
  }

  // ── Compute distribution per trip ─────────────────────────────────────────
  const rows = useMemo(() => {
    if (!data) return [];
    const trips = data.trips;
    const totalBase = method === "weight"
      ? trips.reduce((s, t) => s + t.total_weight, 0)
      : trips.reduce((s, t) => s + t.total_quantity, 0);

    return trips.map(t => {
      const base       = method === "weight" ? t.total_weight : t.total_quantity;
      const distRatio  = totalBase > 0 ? base / totalBase : 0;
      const distAmount = distRatio * data.otherNetPnL;
      const finalNet   = t.net_income + distAmount;

      // Distribute finalNet + distAmount across manifests by weight
      const tripTotalWeight = t.manifests.reduce((s, m) => s + m.weight_kg, 0);
      const manifestRows = t.manifests.map(m => {
        const mShare = tripTotalWeight > 0 ? m.weight_kg / tripTotalWeight : (t.manifests.length > 0 ? 1 / t.manifests.length : 0);
        const mDist  = mShare * distAmount;   // manifest's portion of other P&L distribution
        const mNet   = mShare * finalNet;     // manifest's final net (trip net share + mDist)
        return { ...m, mShare, mDist, mNet };
      });

      return { ...t, base, distRatio, distAmount, finalNet, manifestRows };
    });
  }, [data, method]);

  // Day-wise filter — filter rows by the day of closed_at
  const filteredRows = useMemo(() => {
    if (!day) return rows;
    const d = Number(day);
    return rows.filter(r => {
      if (!r.closed_at) return false;
      return new Date(r.closed_at).getDate() === d;
    });
  }, [rows, day]);

  const totalBase = useMemo(() => {
    if (!data) return 0;
    const source = day ? filteredRows : rows;
    return method === "weight"
      ? source.reduce((s, r) => s + r.base, 0)
      : source.reduce((s, r) => s + r.base, 0);
  }, [data, method, rows, filteredRows, day]);

  const monthLabel = financialYear !== "none" ? `FY ${financialYearLabel(Number(financialYear))}` : MONTHS.find(m => m.value === month)?.label ?? "";

  // ── Excel exports ─────────────────────────────────────────────────────────
  function exportTripWise() {
    if (!rows.length) return toast.error("No data to export");
    const sheetData: (string | number)[][] = [
      ["Trip", "Branch", "Income (₹)", "Expense (₹)", "Trip Net (₹)",
       method === "weight" ? "Weight (kg)" : "Quantity",
       "Share %", "Distribution (₹)", "Final Net (₹)"],
      ...rows.map(r => [
        r.trip_code,
        r.branch_name,
        r.total_income,
        r.total_expense,
        r.net_income,
        r.base,
        totalBase > 0 ? parseFloat((r.distRatio * 100).toFixed(2)) : 0,
        parseFloat(r.distAmount.toFixed(2)),
        parseFloat(r.finalNet.toFixed(2)),
      ]),
      // totals row
      ["TOTALS", "",
        rows.reduce((s, r) => s + r.total_income, 0),
        rows.reduce((s, r) => s + r.total_expense, 0),
        rows.reduce((s, r) => s + r.net_income, 0),
        totalBase,
        100,
        parseFloat((data?.otherNetPnL ?? 0).toFixed(2)),
        parseFloat(rows.reduce((s, r) => s + r.finalNet, 0).toFixed(2)),
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [18, 16, 14, 14, 14, 14, 10, 16, 14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trip Wise");
    XLSX.writeFile(wb, financialYear !== "none" ? `trip-averages-trip-wise-fy-${financialYearLabel(Number(financialYear))}.xlsx` : `trip-averages-trip-wise-${year}-${month.padStart(2, "0")}.xlsx`);
  }

  function exportManifestWise() {
    if (!rows.length) return toast.error("No data to export");
    const sheetData: (string | number)[][] = [
      ["Trip", "Branch", "Trip Income (₹)", "Trip Expense (₹)", "Trip Net (₹)",
       "Trip " + (method === "weight" ? "Weight (kg)" : "Quantity"),
       "Trip Share %", "Trip Distribution (₹)", "Trip Final Net (₹)",
       "Manifest No.", "From", "To", "Weight (kg)", "Quantity",
       "Manifest Income (₹)", "Manifest Weight Share %", "Manifest Distribution (₹)", "Manifest Net (₹)"],
    ];
    for (const r of rows) {
      if (r.manifestRows.length === 0) {
        // Trip with no manifests — still one row
        sheetData.push([
          r.trip_code, r.branch_name,
          r.total_income, r.total_expense, r.net_income,
          r.base,
          totalBase > 0 ? parseFloat((r.distRatio * 100).toFixed(2)) : 0,
          parseFloat(r.distAmount.toFixed(2)),
          parseFloat(r.finalNet.toFixed(2)),
          "—", "—", "—", "", "", "", "", "", "",
        ]);
      } else {
        for (const m of r.manifestRows) {
          sheetData.push([
            r.trip_code, r.branch_name,
            r.total_income, r.total_expense, r.net_income,
            r.base,
            totalBase > 0 ? parseFloat((r.distRatio * 100).toFixed(2)) : 0,
            parseFloat(r.distAmount.toFixed(2)),
            parseFloat(r.finalNet.toFixed(2)),
            m.manifest_number || "—",
            m.from_location,
            m.to_location,
            m.weight_kg,
            m.quantity,
            parseFloat(m.manifest_income.toFixed(2)),
            parseFloat((m.mShare * 100).toFixed(2)),
            parseFloat(m.mDist.toFixed(2)),
            parseFloat(m.mNet.toFixed(2)),
          ]);
        }
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [16,14,14,14,14,14,10,14,14,14,16,16,12,10,16,14,14].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manifest Wise");
    XLSX.writeFile(wb, financialYear !== "none" ? `trip-averages-manifest-wise-fy-${financialYearLabel(Number(financialYear))}.xlsx` : `trip-averages-manifest-wise-${year}-${month.padStart(2, "0")}.xlsx`);
  }

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
        <Select value={financialYear} onValueChange={setFinancialYear}>
          <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="none">Financial Year: None</SelectItem>{financialYears.map(fy => <SelectItem key={fy.value} value={fy.value}>FY {fy.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={load} disabled={loading} size="sm">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Load
        </Button>

        {/* Day filter — appears once data is loaded */}
        {data && (
          <Select value={day === "" ? "all" : day} onValueChange={v => setDay(v === "all" ? "" : v)}>
            <SelectTrigger className="h-9 w-32"><SelectValue placeholder="All Days" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Distribution method toggle */}
        {data && (
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
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

        {/* Export dropdown */}
        {data && rows.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto">
                <FileDown className="size-4" />
                Export Excel
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportTripWise}>
                Export Trip Wise
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportManifestWise}>
                Export Manifest Wise
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              Click any trip row to see its manifest breakdown.
            </p>
          </div>

          {data.trips.length === 0 ? (
            <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              No closed trips in {monthLabel} {year}.
            </p>
          ) : filteredRows.length === 0 ? (
            <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              No closed trips on Day {day} of {monthLabel} {year}.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-8 px-2 py-3" />
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
                  {filteredRows.map(row => {
                    const isExpanded = expandedId === row.id;
                    return (
                      <>
                        {/* ── Trip row ── */}
                        <tr
                          key={row.id}
                          className="cursor-pointer border-b border-border/60 hover:bg-muted/30"
                          onClick={() => setExpandedId(isExpanded ? null : row.id)}
                        >
                          <td className="px-2 py-3 text-center text-muted-foreground">
                            {isExpanded
                              ? <ChevronDown className="size-4 inline" />
                              : <ChevronRight className="size-4 inline" />}
                          </td>
                          <td className="px-4 py-3 font-medium">{row.trip_code || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{row.branch_name || "—"}</td>
                          <td className="px-4 py-3 text-right">{inr(row.total_income)}</td>
                          <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{inr(row.total_expense)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${netColor(row.net_income)}`}>
                            {inr(row.net_income)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {row.base > 0 ? row.base.toLocaleString() : <span className="text-xs opacity-50">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {totalBase > 0 ? `${(row.distRatio * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className={`px-4 py-3 text-right ${netColor(row.distAmount)}`}>
                            {inr(row.distAmount)}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${netColor(row.finalNet)}`}>
                            {inr(row.finalNet)}
                          </td>
                        </tr>

                        {/* ── Expanded manifest breakdown ── */}
                        {isExpanded && (
                          <tr key={`${row.id}-expanded`} className="border-b border-border bg-muted/10">
                            <td colSpan={10} className="px-6 py-0">
                              <div className="py-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Manifests — {row.trip_code}
                                  <span className="ml-2 normal-case font-normal">
                                    (Final Net {inr(row.finalNet)} distributed weight-wise across {row.manifestRows.length} manifest{row.manifestRows.length !== 1 ? "s" : ""})
                                  </span>
                                </p>
                                {row.manifestRows.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2">No manifests recorded in this trip's snapshot.</p>
                                ) : (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                                        <th className="py-1.5 pr-4">Manifest No.</th>
                                        <th className="py-1.5 pr-4">From</th>
                                        <th className="py-1.5 pr-4">To</th>
                                        <th className="py-1.5 pr-4 text-right">Weight (kg)</th>
                                        <th className="py-1.5 pr-4 text-right">Qty</th>
                                        <th className="py-1.5 pr-4 text-right">Manifest Income</th>
                                        <th className="py-1.5 pr-4 text-right">Weight Share %</th>
                                        <th className="py-1.5 pr-4 text-right">Distribution (₹)</th>
                                        <th className="py-1.5 text-right font-semibold text-foreground">Net</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.manifestRows.map((m, i) => (
                                        <tr key={i} className="border-b border-border/40">
                                          <td className="py-1.5 pr-4 font-medium">{m.manifest_number || "—"}</td>
                                          <td className="py-1.5 pr-4 text-muted-foreground">{m.from_location}</td>
                                          <td className="py-1.5 pr-4 text-muted-foreground">{m.to_location}</td>
                                          <td className="py-1.5 pr-4 text-right">{m.weight_kg > 0 ? m.weight_kg.toLocaleString() : "—"}</td>
                                          <td className="py-1.5 pr-4 text-right">{m.quantity > 0 ? m.quantity.toLocaleString() : "—"}</td>
                                          <td className="py-1.5 pr-4 text-right">{inr(m.manifest_income)}</td>
                                          <td className="py-1.5 pr-4 text-right text-muted-foreground">
                                            {(m.mShare * 100).toFixed(1)}%
                                          </td>
                                          <td className={`py-1.5 pr-4 text-right ${netColor(m.mDist)}`}>
                                            {inr(m.mDist)}
                                          </td>
                                          <td className={`py-1.5 text-right font-semibold ${netColor(m.mNet)}`}>
                                            {inr(m.mNet)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t border-border font-semibold">
                                        <td className="py-1.5 pr-4" colSpan={3}>Totals</td>
                                        <td className="py-1.5 pr-4 text-right">
                                          {row.manifestRows.reduce((s, m) => s + m.weight_kg, 0).toLocaleString()}
                                        </td>
                                        <td className="py-1.5 pr-4 text-right">
                                          {row.manifestRows.reduce((s, m) => s + m.quantity, 0).toLocaleString()}
                                        </td>
                                        <td className="py-1.5 pr-4 text-right">
                                          {inr(row.manifestRows.reduce((s, m) => s + m.manifest_income, 0))}
                                        </td>
                                        <td className="py-1.5 pr-4 text-right">100%</td>
                                        <td className={`py-1.5 pr-4 text-right ${netColor(row.distAmount)}`}>
                                          {inr(row.distAmount)}
                                        </td>
                                        <td className={`py-1.5 text-right font-semibold ${netColor(row.finalNet)}`}>
                                          {inr(row.finalNet)}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                    <td className="px-2 py-3" />
                    <td className="px-4 py-3" colSpan={2}>Totals</td>
                    <td className="px-4 py-3 text-right">{inr(filteredRows.reduce((s, r) => s + r.total_income, 0))}</td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{inr(filteredRows.reduce((s, r) => s + r.total_expense, 0))}</td>
                    <td className={`px-4 py-3 text-right ${netColor(filteredRows.reduce((s,r)=>s+r.net_income,0))}`}>
                      {inr(filteredRows.reduce((s, r) => s + r.net_income, 0))}
                    </td>
                    <td className="px-4 py-3 text-right">{totalBase.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{day ? "—" : "100%"}</td>
                    <td className={`px-4 py-3 text-right ${netColor(filteredRows.reduce((s,r)=>s+r.distAmount,0))}`}>
                      {inr(filteredRows.reduce((s,r)=>s+r.distAmount,0))}
                    </td>
                    <td className={`px-4 py-3 text-right ${netColor(filteredRows.reduce((s,r)=>s+r.finalNet,0))}`}>
                      {inr(filteredRows.reduce((s, r) => s + r.finalNet, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {filteredRows.some(r => r.base === 0) && (
            <p className="text-xs text-muted-foreground">
              ⚠ Some trips have no {method} data recorded — they receive 0% distribution. Ensure manifests include {method === "weight" ? "weight (kg)" : "quantity"} values.
            </p>
          )}
        </>
      )}
    </div>
  );
}

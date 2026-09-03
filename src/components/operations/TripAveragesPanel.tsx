/**
 * TripAveragesPanel — Admin-only. Monthly trip P&L with distribution of
 * other income/expenses to each trip by weight or quantity, computed
 * per-branch so each branch's own income/expenditure pool is distributed
 * only among that branch's trips.
 * Supports expandable manifest breakdown per trip and Excel exports.
 */
import { useState, useMemo } from "react";
import {
  RefreshCw,
  Scale,
  Package,
  FileDown,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { buildBranchOperationalPools, distributionShare } from "@/lib/operational-distribution";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

type DistMethod = "weight" | "quantity";

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  const isPos = value >= 0;
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-lg font-bold tracking-tight ${
          highlight
            ? isPos
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
            : "text-foreground"
        }`}
      >
        {inr(value)}
      </p>
    </div>
  );
}

function netColor(v: number) {
  return v >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

function ownershipLabel(value: string) {
  return value === "own" ? "Own" : value === "third_party" ? "Renter" : "—";
}

function excelDate(value: string) {
  if (!value) return "—";
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const [, year, month, day] = match;
  const monthName = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][Number(month) - 1];
  return monthName ? `${day}-${monthName}-${year}` : value;
}

/** Monthly operational income less operational expense, scoped strictly by branch. */
type BranchPnL = {
  otherIncome: number;
  expenditure: number;
  net: number;
};

function computeBranchOtherPnL(
  data: TripAveragesData,
  branchIds: string[],
): Map<string, BranchPnL> {
  const pools = buildBranchOperationalPools(branchIds, data.incomeRows, data.expenditureRows);
  return new Map(
    Array.from(pools, ([branchId, pool]) => [
      branchId,
      { otherIncome: pool.income, expenditure: pool.expense, net: pool.net },
    ]),
  );
}

export function TripAveragesPanel() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const years = useMemo(
    () => Array.from({ length: 6 }, (_, i) => currentYear - 3 + i),
    [currentYear],
  );
  const financialYears = useMemo(() => financialYearOptions(currentYear), [currentYear]);

  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));
  const [financialYear, setFinancialYear] = useState("none");
  const [day, setDay] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [method, setMethod] = useState<DistMethod>("weight");
  const [data, setData] = useState<TripAveragesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setExpandedId(null);
    setDay("");
    setBranchFilter("all");
    try {
      const result = await serverFetchTripAverages({
        data:
          financialYear !== "none"
            ? { financialYearStart: Number(financialYear) }
            : { year: Number(year), month: Number(month) },
      });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load trip averages");
    }
    setLoading(false);
  }

  // ── Unique branches from the loaded trips ─────────────────────────────────
  const branches = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    for (const t of data.trips) {
      if (t.branch_id && !seen.has(t.branch_id)) {
        seen.set(t.branch_id, t.branch_name || t.branch_id);
      }
    }
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // ── Per-branch other P&L ──────────────────────────────────────────────────
  const branchPnLMap = useMemo(() => {
    if (!data) return new Map<string, BranchPnL>();
    return computeBranchOtherPnL(
      data,
      branches.map((b) => b.id),
    );
  }, [data, branches]);

  // ── Compute distribution per trip (branch-wise) ───────────────────────────
  const rows = useMemo(() => {
    if (!data) return [];
    const trips = data.trips;

    // Group trips by branch_id (known or null/unassigned)
    const byBranch = new Map<string | null, typeof trips>();
    for (const t of trips) {
      const bid = t.branch_id ?? null;
      if (!byBranch.has(bid)) byBranch.set(bid, []);
      byBranch.get(bid)!.push(t);
    }

    return trips.map((t) => {
      const bid = t.branch_id ?? null;
      const branchTrips = byBranch.get(bid) ?? [t];
      const branchTotalBase =
        method === "weight"
          ? branchTrips.reduce((s, bt) => s + bt.total_weight, 0)
          : branchTrips.reduce((s, bt) => s + bt.total_quantity, 0);

      // Strict branch/month operational pool; unassigned rows are excluded.
      const branchPnL = (bid ? branchPnLMap.get(bid) : undefined) ?? {
        otherIncome: 0,
        expenditure: 0,
        net: 0,
      };

      const base = method === "weight" ? t.total_weight : t.total_quantity;

      // Formula: (branch operational income - branch operational expense)
      // ÷ branch weight/quantity × this trip's weight/quantity.
      const distRatio = distributionShare(base, branchTotalBase, branchTrips.length);
      const distAmount = distRatio * branchPnL.net;
      const finalNet = t.net_income + distAmount;

      // Apply the selected method consistently at manifest level too.
      const manifestTotalBase = t.manifests.reduce(
        (sum, manifest) => sum + (method === "weight" ? manifest.weight_kg : manifest.quantity),
        0,
      );
      const manifestRows = t.manifests.map((m) => {
        const manifestBase = method === "weight" ? m.weight_kg : m.quantity;
        const mShare = distributionShare(manifestBase, manifestTotalBase, t.manifests.length);
        const mDist = mShare * distAmount;
        const mNet = mShare * t.net_income + mDist;
        return { ...m, mShare, mDist, mNet };
      });

      return {
        ...t,
        base,
        distRatio,
        distAmount,
        finalNet,
        manifestRows,
        branchOtherNetPnL: branchPnL.net,
      };
    });
  }, [data, method, branchPnLMap]);

  // ── Branch filter ─────────────────────────────────────────────────────────
  const branchFilteredRows = useMemo(() => {
    if (branchFilter === "all") return rows;
    return rows.filter((r) => r.branch_id === branchFilter);
  }, [rows, branchFilter]);

  // ── Day-wise filter ───────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!day) return branchFilteredRows;
    const d = Number(day);
    return branchFilteredRows.filter((r) => {
      if (!r.closed_at) return false;
      return new Date(r.closed_at).getDate() === d;
    });
  }, [branchFilteredRows, day]);

  // totalBase for footer (within the currently filtered set)
  const totalBase = useMemo(() => {
    return filteredRows.reduce((s, r) => s + r.base, 0);
  }, [filteredRows]);

  const monthLabel =
    financialYear !== "none"
      ? `FY ${financialYearLabel(Number(financialYear))}`
      : (MONTHS.find((m) => m.value === month)?.label ?? "");

  // Summary values for the selected branch (or all).
  // When a branch is selected, use the same trip-count-weighted allocation that
  // drives the distribution — so the cards are always consistent with the table.
  const selectedBranchPnL = branchFilter !== "all" ? branchPnLMap.get(branchFilter) : null;
  const allBranchPnL = Array.from(branchPnLMap.values());
  const summaryOtherIncome = selectedBranchPnL
    ? selectedBranchPnL.otherIncome
    : allBranchPnL.reduce((sum, pool) => sum + pool.otherIncome, 0);
  const summaryFixedIncome = data?.fixedIncome ?? 0;
  const summaryExpenditure = selectedBranchPnL
    ? selectedBranchPnL.expenditure
    : allBranchPnL.reduce((sum, pool) => sum + pool.expenditure, 0);
  const summaryNet = selectedBranchPnL
    ? selectedBranchPnL.net
    : allBranchPnL.reduce((sum, pool) => sum + pool.net, 0);

  // ── Excel exports ─────────────────────────────────────────────────────────
  function exportExcel() {
    if (!rows.length) return toast.error("No data to export");
    const exportRows = filteredRows;
    const tripSheetData: (string | number)[][] = [
      [
        "Branch",
        "Trip",
        "No. of Manifest",
        "Weight (kg)",
        "Quantity",
        "Distance Travelled (km)",
        "Type (Renter/Own)",
        "Income (₹)",
        "Expense (₹)",
        "Trip Net (₹)",
        method === "weight" ? "Weight (kg)" : "Quantity",
        "Share %",
        "Branch Operational P&L (₹)",
        "Distribution (₹)",
        "Final Net (₹)",
      ],
      ...exportRows.map((r) => [
        r.branch_name,
        r.trip_code,
        r.manifests.length,
        r.total_weight,
        r.total_quantity,
        r.distance_travelled ?? "—",
        ownershipLabel(r.ownership),
        r.total_income,
        r.total_expense,
        r.net_income,
        r.base,
        parseFloat((r.distRatio * 100).toFixed(2)),
        parseFloat(r.branchOtherNetPnL.toFixed(2)),
        parseFloat(r.distAmount.toFixed(2)),
        parseFloat(r.finalNet.toFixed(2)),
      ]),
    ];

    const manifestSheetData: (string | number)[][] = [
      [
        "Branch",
        "Trip",
        "Trip Start Date",
        "Trip End Date",
        "Trip Income (₹)",
        "Trip Expense (₹)",
        "Trip Net (₹)",
        "Trip " + (method === "weight" ? "Weight (kg)" : "Quantity"),
        "Trip Share %",
        "Distribution (₹)",
        "Trip Final Net (₹)",
        "Manifest No.",
        "From",
        "To",
        "Weight (kg)",
        "Quantity",
        "Manifest Income (₹)",
        `Manifest ${method === "weight" ? "Weight" : "Quantity"} Share %`,
        "Manifest Distribution (₹)",
        "Manifest Net (₹)",
      ],
    ];
    for (const r of exportRows) {
      if (r.manifestRows.length === 0) {
        manifestSheetData.push([
          r.branch_name,
          r.trip_code,
          excelDate(r.start_date),
          excelDate(r.end_date),
          r.total_income,
          r.total_expense,
          r.net_income,
          r.base,
          parseFloat((r.distRatio * 100).toFixed(2)),
          parseFloat(r.distAmount.toFixed(2)),
          parseFloat(r.finalNet.toFixed(2)),
          "—",
          "—",
          "—",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
      } else {
        for (const m of r.manifestRows) {
          manifestSheetData.push([
            r.branch_name,
            r.trip_code,
            excelDate(r.start_date),
            excelDate(r.end_date),
            r.total_income,
            r.total_expense,
            r.net_income,
            r.base,
            parseFloat((r.distRatio * 100).toFixed(2)),
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

    const tripSheet = XLSX.utils.aoa_to_sheet(tripSheetData);
    tripSheet["!cols"] = [18, 16, 16, 14, 14, 22, 18, 16, 16, 16, 14, 12, 24, 18, 16].map((w) => ({
      wch: w,
    }));
    const manifestSheet = XLSX.utils.aoa_to_sheet(manifestSheetData);
    manifestSheet["!cols"] = [
      18, 16, 16, 16, 16, 16, 16, 16, 12, 18, 16, 18, 20, 20, 14, 12, 18, 24, 22, 18,
    ].map((w) => ({ wch: w }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, tripSheet, "Trip Wise");
    XLSX.utils.book_append_sheet(wb, manifestSheet, "Manifest Wise");
    XLSX.writeFile(
      wb,
      financialYear !== "none"
        ? `trip-averages-fy-${financialYearLabel(Number(financialYear))}.xlsx`
        : `trip-averages-${year}-${month.padStart(2, "0")}.xlsx`,
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
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
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={financialYear} onValueChange={setFinancialYear}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Financial Year: None</SelectItem>
            {financialYears.map((fy) => (
              <SelectItem key={fy.value} value={fy.value}>
                FY {fy.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={load} disabled={loading} size="sm">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Load
        </Button>

        {/* Branch filter — appears once data is loaded and has multiple branches */}
        {data && branches.length > 1 && (
          <Select
            value={branchFilter}
            onValueChange={(v) => {
              setBranchFilter(v);
              setDay("");
              setExpandedId(null);
            }}
          >
            <SelectTrigger className="h-9 w-44">
              <Building2 className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Day filter — appears once data is loaded */}
        {data && (
          <Select
            value={day === "" ? "all" : day}
            onValueChange={(v) => setDay(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="All Days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <SelectItem key={d} value={String(d)}>
                  Day {d}
                </SelectItem>
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
                method === "weight"
                  ? "bg-card font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Scale className="size-3.5" /> By Weight
            </button>
            <button
              type="button"
              onClick={() => setMethod("quantity")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                method === "quantity"
                  ? "bg-card font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
              <DropdownMenuItem onClick={exportExcel}>
                Export Trip Wise + Manifest Wise tabs
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {!data && !loading && (
        <div className="rounded-xl border border-dashed border-border px-4 py-14 text-center">
          <p className="text-sm text-muted-foreground">
            Select a year and month, then click <strong>Load</strong> to view trip distribution.
          </p>
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
          {/* Other P&L summary — scoped to selected branch */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Other P&amp;L — {monthLabel}
              {financialYear === "none" ? ` ${year}` : ""}
              {branchFilter !== "all" && branches.find((b) => b.id === branchFilter) ? (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium normal-case text-primary">
                  {branches.find((b) => b.id === branchFilter)?.name}
                </span>
              ) : null}
              <span className="ml-2 normal-case font-normal">(excluding trip income/expense)</span>
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryCard label="Other Income" value={summaryOtherIncome} />
              <SummaryCard label="Fixed Income" value={summaryFixedIncome} />
              <SummaryCard label="Expenditures" value={summaryExpenditure} />
              <SummaryCard label="Other Net P&L" value={summaryNet} highlight />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Distribution is <strong>branch-wise</strong> — each branch's operational income minus
              operational expense is distributed only among that branch's trips by{" "}
              <strong>{method}</strong>.
              {branchFilter !== "all" ? (
                <>
                  {" "}
                  Showing <strong>{branchFilteredRows.length}</strong> trip
                  {branchFilteredRows.length !== 1 ? "s" : ""} for the selected branch.
                </>
              ) : (
                <>
                  {" "}
                  Total {data.trips.length} trip{data.trips.length !== 1 ? "s" : ""} across{" "}
                  {branches.length} branch{branches.length !== 1 ? "es" : ""}.
                </>
              )}{" "}
              Click any trip row to see its manifest breakdown.
            </p>
          </div>

          {data.trips.length === 0 ? (
            <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              No closed trips in {monthLabel} {year}.
            </p>
          ) : filteredRows.length === 0 ? (
            <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              {branchFilter !== "all" && day
                ? `No closed trips on Day ${day} for the selected branch.`
                : branchFilter !== "all"
                  ? "No closed trips for the selected branch in this period."
                  : `No closed trips on Day ${day} of ${monthLabel} ${year}.`}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-8 px-2 py-3" />
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3 text-right">No. of Manifest</th>
                    <th className="px-4 py-3 text-right">Weight (kg)</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Distance Travelled</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Income</th>
                    <th className="px-4 py-3 text-right">Expense</th>
                    <th className="px-4 py-3 text-right">Trip Net</th>
                    <th className="px-4 py-3 text-right">
                      {method === "weight" ? "Weight (kg)" : "Quantity"}
                    </th>
                    <th className="px-4 py-3 text-right">Branch Share %</th>
                    <th className="px-4 py-3 text-right">Distribution</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">
                      Final Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
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
                            {isExpanded ? (
                              <ChevronDown className="size-4 inline" />
                            ) : (
                              <ChevronRight className="size-4 inline" />
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium">{row.trip_code || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.branch_name || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">{row.manifests.length}</td>
                          <td className="px-4 py-3 text-right">
                            {row.total_weight.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.total_quantity.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.distance_travelled === null
                              ? "—"
                              : `${row.distance_travelled.toLocaleString()} km`}
                          </td>
                          <td className="px-4 py-3">{ownershipLabel(row.ownership)}</td>
                          <td className="px-4 py-3 text-right">{inr(row.total_income)}</td>
                          <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                            {inr(row.total_expense)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${netColor(row.net_income)}`}
                          >
                            {inr(row.net_income)}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {row.base > 0 ? (
                              row.base.toLocaleString()
                            ) : (
                              <span className="text-xs opacity-50">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-muted-foreground">
                            {row.base > 0 ? `${(row.distRatio * 100).toFixed(1)}%` : "—"}
                          </td>
                          <td className={`px-4 py-3 text-right ${netColor(row.distAmount)}`}>
                            {inr(row.distAmount)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${netColor(row.finalNet)}`}
                          >
                            {inr(row.finalNet)}
                          </td>
                        </tr>

                        {/* ── Expanded manifest breakdown ── */}
                        {isExpanded && (
                          <tr
                            key={`${row.id}-expanded`}
                            className="border-b border-border bg-muted/10"
                          >
                            <td colSpan={15} className="px-6 py-0">
                              <div className="py-3">
                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Manifests — {row.trip_code}
                                  <span className="ml-2 normal-case font-normal">
                                    (Final Net {inr(row.finalNet)} distributed by {method} across{" "}
                                    {row.manifestRows.length} manifest
                                    {row.manifestRows.length !== 1 ? "s" : ""})
                                  </span>
                                </p>
                                {row.manifestRows.length === 0 ? (
                                  <p className="text-xs text-muted-foreground py-2">
                                    No manifests recorded in this trip's snapshot.
                                  </p>
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
                                        <th className="py-1.5 pr-4 text-right">
                                          {method === "weight" ? "Weight" : "Quantity"} Share %
                                        </th>
                                        <th className="py-1.5 pr-4 text-right">Distribution (₹)</th>
                                        <th className="py-1.5 text-right font-semibold text-foreground">
                                          Net
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.manifestRows.map((m, i) => (
                                        <tr key={i} className="border-b border-border/40">
                                          <td className="py-1.5 pr-4 font-medium">
                                            {m.manifest_number || "—"}
                                          </td>
                                          <td className="py-1.5 pr-4 text-muted-foreground">
                                            {m.from_location}
                                          </td>
                                          <td className="py-1.5 pr-4 text-muted-foreground">
                                            {m.to_location}
                                          </td>
                                          <td className="py-1.5 pr-4 text-right">
                                            {m.weight_kg > 0 ? m.weight_kg.toLocaleString() : "—"}
                                          </td>
                                          <td className="py-1.5 pr-4 text-right">
                                            {m.quantity > 0 ? m.quantity.toLocaleString() : "—"}
                                          </td>
                                          <td className="py-1.5 pr-4 text-right">
                                            {inr(m.manifest_income)}
                                          </td>
                                          <td className="py-1.5 pr-4 text-right text-muted-foreground">
                                            {(m.mShare * 100).toFixed(1)}%
                                          </td>
                                          <td
                                            className={`py-1.5 pr-4 text-right ${netColor(m.mDist)}`}
                                          >
                                            {inr(m.mDist)}
                                          </td>
                                          <td
                                            className={`py-1.5 text-right font-semibold ${netColor(m.mNet)}`}
                                          >
                                            {inr(m.mNet)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr className="border-t border-border font-semibold">
                                        <td className="py-1.5 pr-4" colSpan={3}>
                                          Totals
                                        </td>
                                        <td className="py-1.5 pr-4 text-right">
                                          {row.manifestRows
                                            .reduce((s, m) => s + m.weight_kg, 0)
                                            .toLocaleString()}
                                        </td>
                                        <td className="py-1.5 pr-4 text-right">
                                          {row.manifestRows
                                            .reduce((s, m) => s + m.quantity, 0)
                                            .toLocaleString()}
                                        </td>
                                        <td className="py-1.5 pr-4 text-right">
                                          {inr(
                                            row.manifestRows.reduce(
                                              (s, m) => s + m.manifest_income,
                                              0,
                                            ),
                                          )}
                                        </td>
                                        <td className="py-1.5 pr-4 text-right">100%</td>
                                        <td
                                          className={`py-1.5 pr-4 text-right ${netColor(row.distAmount)}`}
                                        >
                                          {inr(row.distAmount)}
                                        </td>
                                        <td
                                          className={`py-1.5 text-right font-semibold ${netColor(row.finalNet)}`}
                                        >
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
                    <td className="px-4 py-3" colSpan={7}>
                      Totals
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inr(filteredRows.reduce((s, r) => s + r.total_income, 0))}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                      {inr(filteredRows.reduce((s, r) => s + r.total_expense, 0))}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${netColor(filteredRows.reduce((s, r) => s + r.net_income, 0))}`}
                    >
                      {inr(filteredRows.reduce((s, r) => s + r.net_income, 0))}
                    </td>
                    <td className="px-4 py-3 text-right">{totalBase.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {branchFilter !== "all" && !day ? "100%" : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${netColor(filteredRows.reduce((s, r) => s + r.distAmount, 0))}`}
                    >
                      {inr(filteredRows.reduce((s, r) => s + r.distAmount, 0))}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${netColor(filteredRows.reduce((s, r) => s + r.finalNet, 0))}`}
                    >
                      {inr(filteredRows.reduce((s, r) => s + r.finalNet, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {filteredRows.some((r) => r.base === 0) && (
            <p className="text-xs text-muted-foreground">
              ⚠ Some trips have no {method} data recorded — they receive 0% distribution. Ensure
              manifests include {method === "weight" ? "weight (kg)" : "quantity"} values.
            </p>
          )}
        </>
      )}
    </div>
  );
}

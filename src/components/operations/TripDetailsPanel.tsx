/**
 * TripDetailsPanel — branch-scoped booking report for basic users.
 *
 * It intentionally uses the Trip Averages period controls and distribution
 * rules, but presents the operational detail needed by every role. Monetary
 * values and income/expense distributions are rendered only for admin and
 * manager (viewer) users.
 */
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FileDown,
  Package,
  RefreshCw,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/session";
import { serverFetchTripDetails, type TripAveragesData, type TripAveragesRow } from "@/lib/pnl";
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
type BranchPool = { income: number; expense: number; net: number };

function moneyColor(value: number) {
  return value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

function displayDate(value: string) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date
        .toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
        .replace(/ /g, "-");
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

function ownershipLabel(value: string) {
  return value === "own" ? "Own" : value === "third_party" ? "Renter" : "—";
}

function buildBranchPools(data: TripAveragesData, branches: Array<{ id: string }>) {
  return buildBranchOperationalPools(
    branches.map((branch) => branch.id),
    data.incomeRows,
    data.expenditureRows,
  );
}

export function TripDetailsPanel() {
  const { user } = useSession();
  const canSeeMoney =
    user?.role === "admin" || user?.role === "semi_admin" || user?.role === "viewer";
  const canSeeExpense = canSeeMoney || user?.role === "basic";
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = useMemo(
    () => Array.from({ length: 6 }, (_, index) => currentYear - 3 + index),
    [currentYear],
  );
  const financialYears = useMemo(() => financialYearOptions(currentYear), [currentYear]);

  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));
  const [financialYear, setFinancialYear] = useState("none");
  const [day, setDay] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [method, setMethod] = useState<DistMethod>("weight");
  const [data, setData] = useState<TripAveragesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    if (!user?.sessionToken) {
      toast.error("Your session has expired. Please sign in again.");
      return;
    }
    setLoading(true);
    setExpandedId(null);
    try {
      const result = await serverFetchTripDetails({
        data: {
          sessionToken: user.sessionToken,
          ...(financialYear !== "none"
            ? { financialYearStart: Number(financialYear) }
            : { year: Number(year), month: Number(month) }),
        },
      });
      setData(result);
      setBranchFilter("all");
      setDay("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load trip details");
    } finally {
      setLoading(false);
    }
  }

  const branches = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    for (const trip of data.trips) {
      if (trip.branch_id && !seen.has(trip.branch_id)) {
        seen.set(trip.branch_id, trip.branch_name || trip.branch_id);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [data]);

  const pools = useMemo(
    () => (data ? buildBranchPools(data, branches) : new Map<string, BranchPool>()),
    [data, branches],
  );

  const rows = useMemo(() => {
    if (!data) return [];
    const byBranch = new Map<string | null, TripAveragesRow[]>();
    for (const trip of data.trips) {
      const branch = trip.branch_id ?? null;
      if (!byBranch.has(branch)) byBranch.set(branch, []);
      byBranch.get(branch)!.push(trip);
    }

    return data.trips.map((trip) => {
      const branchTrips = byBranch.get(trip.branch_id ?? null) ?? [trip];
      const branchBase = branchTrips.reduce(
        (sum, item) => sum + (method === "weight" ? item.total_weight : item.total_quantity),
        0,
      );
      const branchPool = trip.branch_id
        ? (pools.get(trip.branch_id) ?? { income: 0, expense: 0, net: 0 })
        : { income: 0, expense: 0, net: 0 };
      const base = method === "weight" ? trip.total_weight : trip.total_quantity;
      const tripShare = distributionShare(base, branchBase, branchTrips.length);
      const operationalDistribution = branchPool.net * tripShare;
      const distributedProfit = trip.net_income + operationalDistribution;
      const manifestBaseTotal = trip.manifests.reduce(
        (sum, manifest) => sum + (method === "weight" ? manifest.weight_kg : manifest.quantity),
        0,
      );
      const manifestRows = trip.manifests.map((manifest) => {
        const manifestBase = method === "weight" ? manifest.weight_kg : manifest.quantity;
        const manifestShare = distributionShare(
          manifestBase,
          manifestBaseTotal,
          trip.manifests.length,
        );
        const allocatedTripExpense = trip.total_expense * manifestShare;
        const allocatedDistribution = operationalDistribution * manifestShare;
        return {
          ...manifest,
          manifestShare,
          allocatedTripExpense,
          allocatedDistribution,
          manifestProfit: trip.net_income * manifestShare + allocatedDistribution,
        };
      });
      return {
        ...trip,
        base,
        tripShare,
        operationalDistribution,
        distributedProfit,
        manifestRows,
      };
    });
  }, [data, method, pools]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        if (branchFilter !== "all" && row.branch_id !== branchFilter) return false;
        if (day && new Date(row.closed_at).getDate() !== Number(day)) return false;
        return true;
      }),
    [rows, branchFilter, day],
  );

  const monthLabel =
    financialYear !== "none"
      ? `FY ${financialYearLabel(Number(financialYear))}`
      : (MONTHS.find((item) => item.value === month)?.label ?? "");

  const total = (
    field:
      | "total_income"
      | "total_expense"
      | "net_income"
      | "operationalDistribution"
      | "distributedProfit",
  ) => filteredRows.reduce((sum, row) => sum + row[field], 0);

  function exportExcel() {
    if (!filteredRows.length) {
      toast.error("No trip details to export");
      return;
    }

    const tripHeaders = canSeeMoney
      ? [
          "Branch",
          "Trip",
          "Trip Start Date",
          "Trip End Date",
          "No. of Manifest",
          "Weight (kg)",
          "Quantity",
          "Distance Travelled (km)",
          "Type (Renter/Own)",
          "Vehicle Number",
          "Distribution (₹)",
          "Trip Income (₹)",
          "Trip Expense (₹)",
          "Trip Profit (₹)",
          "Final Profit (₹)",
        ]
      : canSeeExpense
        ? [
            "Branch",
            "Trip",
            "Trip Start Date",
            "Trip End Date",
            "No. of Manifest",
            "Weight (kg)",
            "Quantity",
            "Distance Travelled (km)",
            "Type (Renter/Own)",
            "Vehicle Number",
            "Trip Expense (₹)",
          ]
        : [
            "Branch",
            "Trip",
            "Trip Start Date",
            "Trip End Date",
            "No. of Manifest",
            "Weight (kg)",
            "Quantity",
            "Distance Travelled (km)",
            "Type (Renter/Own)",
            "Vehicle Number",
          ];
    const tripRows: (string | number)[][] = [
      tripHeaders,
      ...filteredRows.map((row) =>
        canSeeMoney
          ? [
              row.branch_name || "—",
              row.trip_code || "—",
              excelDate(row.start_date),
              excelDate(row.end_date),
              row.manifests.length,
              row.total_weight,
              row.total_quantity,
              row.distance_travelled ?? "—",
              ownershipLabel(row.ownership),
              row.vehicle_number || "—",
              row.operationalDistribution,
              row.total_income,
              row.total_expense,
              row.net_income,
              row.distributedProfit,
            ]
          : canSeeExpense
            ? [
                row.branch_name || "—",
                row.trip_code || "—",
                excelDate(row.start_date),
                excelDate(row.end_date),
                row.manifests.length,
                row.total_weight,
                row.total_quantity,
                row.distance_travelled ?? "—",
                ownershipLabel(row.ownership),
                row.vehicle_number || "—",
                row.total_expense,
              ]
            : [
                row.branch_name || "—",
                row.trip_code || "—",
                excelDate(row.start_date),
                excelDate(row.end_date),
                row.manifests.length,
                row.total_weight,
                row.total_quantity,
                row.distance_travelled ?? "—",
                ownershipLabel(row.ownership),
                row.vehicle_number || "—",
              ],
      ),
    ];

    const manifestHeaders = canSeeMoney
      ? [
          "Branch",
          "Trip",
          "Trip Start Date",
          "Trip End Date",
          "Manifest Date",
          "Manifest No.",
          "From Location",
          "From Location Pin Code",
          "To Location",
          "To Location Pin Code",
          "Weight (kg)",
          "Quantity",
          "Trip Expense (₹)",
          "Manifest Freight Income (₹)",
          "Manifest Loading Income (₹)",
          "Manifest Income (₹)",
          "Distribution (₹)",
          "Profit (₹)",
        ]
      : canSeeExpense
        ? [
            "Branch",
            "Trip",
            "Trip Start Date",
            "Trip End Date",
            "Manifest Date",
            "Manifest No.",
            "From Location",
            "From Location Pin Code",
            "To Location",
            "To Location Pin Code",
            "Weight (kg)",
            "Quantity",
            "Trip Expense (₹)",
          ]
        : [
            "Branch",
            "Trip",
            "Trip Start Date",
            "Trip End Date",
            "Manifest Date",
            "Manifest No.",
            "From Location",
            "From Location Pin Code",
            "To Location",
            "To Location Pin Code",
            "Weight (kg)",
            "Quantity",
          ];
    const manifestRows: (string | number)[][] = [manifestHeaders];

    for (const row of filteredRows) {
      if (row.manifestRows.length === 0) {
        manifestRows.push(
          canSeeMoney
            ? [
                row.branch_name || "—",
                row.trip_code || "—",
                excelDate(row.start_date),
                excelDate(row.end_date),
                "—",
                "—",
                "—",
                "—",
                "—",
                "—",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
              ]
            : canSeeExpense
              ? [
                  row.branch_name || "—",
                  row.trip_code || "—",
                  excelDate(row.start_date),
                  excelDate(row.end_date),
                  "—",
                  "—",
                  "—",
                  "—",
                  "—",
                  "—",
                  "",
                  "",
                  "",
                ]
              : [
                  row.branch_name || "—",
                  row.trip_code || "—",
                  excelDate(row.start_date),
                  excelDate(row.end_date),
                  "—",
                  "—",
                  "—",
                  "—",
                  "—",
                  "—",
                  "",
                  "",
                ],
        );
        continue;
      }

      for (const manifest of row.manifestRows) {
        const base: (string | number)[] = [
          row.branch_name || "—",
          row.trip_code || "—",
          excelDate(row.start_date),
          excelDate(row.end_date),
          excelDate(manifest.manifest_date),
          manifest.manifest_number || "—",
          manifest.from_location || "—",
          manifest.from_pin_code || "—",
          manifest.to_location || "—",
          manifest.to_pin_code || "—",
          manifest.weight_kg,
          manifest.quantity,
        ];
        manifestRows.push(
          canSeeMoney
            ? [
                ...base,
                manifest.allocatedTripExpense,
                manifest.freight_income,
                manifest.loading_income,
                manifest.manifest_income,
                manifest.allocatedDistribution,
                manifest.manifestProfit,
              ]
            : canSeeExpense
              ? [...base, manifest.allocatedTripExpense]
              : base,
        );
      }
    }

    const tripSheet = XLSX.utils.aoa_to_sheet(tripRows);
    tripSheet["!cols"] = (
      canSeeMoney
        ? [18, 18, 16, 16, 16, 14, 12, 22, 18, 20, 18, 18, 18, 18, 18]
        : canSeeExpense
          ? [18, 18, 16, 16, 16, 14, 12, 22, 18, 20, 18]
          : [18, 18, 16, 16, 16, 14, 12, 22, 18, 20]
    ).map((wch) => ({ wch }));
    const manifestSheet = XLSX.utils.aoa_to_sheet(manifestRows);
    manifestSheet["!cols"] = (
      canSeeMoney
        ? [18, 18, 16, 16, 16, 18, 20, 22, 20, 22, 12, 12, 18, 28, 28, 20, 20, 16]
        : canSeeExpense
          ? [18, 18, 16, 16, 16, 18, 20, 22, 20, 22, 12, 12, 18]
          : [18, 18, 16, 16, 16, 18, 20, 22, 20, 22, 12, 12]
    ).map((wch) => ({ wch }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, tripSheet, "Trip Wise");
    XLSX.utils.book_append_sheet(workbook, manifestSheet, "Manifest Wise");
    const filename =
      financialYear !== "none"
        ? `booking-report-fy-${financialYearLabel(Number(financialYear))}.xlsx`
        : `booking-report-${year}-${month.padStart(2, "0")}.xlsx`;
    XLSX.writeFile(workbook, filename);
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="h-9 w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((item) => (
              <SelectItem key={item} value={String(item)}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
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
            {financialYears.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                FY {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={load} disabled={loading} size="sm">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Load
        </Button>
        {data && branches.length > 0 && (
          <Select
            value={branchFilter}
            onValueChange={(value) => {
              setBranchFilter(value);
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
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {data && (
          <>
            <Select
              value={day || "all"}
              onValueChange={(value) => setDay(value === "all" ? "" : value)}
            >
              <SelectTrigger className="h-9 w-32">
                <SelectValue placeholder="All Days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {Array.from({ length: 31 }, (_, index) => index + 1).map((item) => (
                  <SelectItem key={item} value={String(item)}>
                    Day {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setMethod("weight")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${method === "weight" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
              >
                <Scale className="size-3.5" /> By Weight
              </button>
              <button
                type="button"
                onClick={() => setMethod("quantity")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${method === "quantity" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
              >
                <Package className="size-3.5" /> By Quantity
              </button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  <FileDown className="size-4" /> Export Excel
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportExcel}>
                  Export Trip Wise + Manifest Wise tabs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>

      {!data && !loading && (
        <div className="rounded-xl border border-dashed border-border px-4 py-14 text-center text-sm text-muted-foreground">
          Select a year and month, then click <strong>Load</strong> to view trip details.
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
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Booking Report — {monthLabel}
              {financialYear === "none" ? ` ${year}` : ""}
              {branchFilter !== "all" && (
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium normal-case text-primary">
                  {branches.find((branch) => branch.id === branchFilter)?.name}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {canSeeMoney ? (
                <>
                  Operational income less operational expense is distributed branch-wise by{" "}
                  <strong>{method}</strong>. Click a trip to see its manifest details and
                  distribution.
                </>
              ) : canSeeExpense ? (
                <>
                  Trip expenses are shown trip-wise and expense distributions are shown
                  manifest-wise. Income and profit amounts are hidden for basic users.
                </>
              ) : (
                <>Showing trips only from your assigned branches. Financial amounts are hidden.</>
              )}
            </p>
          </div>

          {filteredRows.length === 0 ? (
            <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              No trips match the selected period and filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="w-8 px-2 py-3" />
                    <th className="px-4 py-3">Branch</th>
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Trip Start Date</th>
                    <th className="px-4 py-3">Trip End Date</th>
                    <th className="px-4 py-3 text-right">No. of Manifest</th>
                    <th className="px-4 py-3 text-right">Weight (kg)</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Distance Travelled</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Vehicle Number</th>
                    {canSeeMoney && (
                      <>
                        <th className="px-4 py-3 text-right">Trip Expense</th>
                        <th className="px-4 py-3 text-right">Distribution</th>
                        <th className="px-4 py-3 text-right">Trip Income</th>
                        <th className="px-4 py-3 text-right">Trip Profit</th>
                        <th className="px-4 py-3 text-right">Final Profit</th>
                      </>
                    )}
                    {!canSeeMoney && canSeeExpense && (
                      <th className="px-4 py-3 text-right">Trip Expense</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const open = expandedId === row.id;
                    return (
                      <>
                        <tr
                          key={row.id}
                          onClick={() => setExpandedId(open ? null : row.id)}
                          className="cursor-pointer border-b border-border/60 hover:bg-muted/30"
                        >
                          <td className="px-2 py-3 text-center text-muted-foreground">
                            {open ? (
                              <ChevronDown className="inline size-4" />
                            ) : (
                              <ChevronRight className="inline size-4" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.branch_name || "—"}
                          </td>
                          <td className="px-4 py-3 font-medium">{row.trip_code || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {displayDate(row.start_date)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {displayDate(row.end_date)}
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
                          <td className="px-4 py-3">{row.vehicle_number || "—"}</td>
                          {canSeeMoney && (
                            <>
                              <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                                {inr(row.total_expense)}
                              </td>
                              <td
                                className={`px-4 py-3 text-right ${moneyColor(row.operationalDistribution)}`}
                              >
                                {inr(row.operationalDistribution)}
                              </td>
                              <td className="px-4 py-3 text-right">{inr(row.total_income)}</td>
                              <td
                                className={`px-4 py-3 text-right font-medium ${moneyColor(row.net_income)}`}
                              >
                                {inr(row.net_income)}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-semibold ${moneyColor(row.distributedProfit)}`}
                              >
                                {inr(row.distributedProfit)}
                              </td>
                            </>
                          )}
                          {!canSeeMoney && canSeeExpense && (
                            <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                              {inr(row.total_expense)}
                            </td>
                          )}
                        </tr>
                        {open && (
                          <tr
                            key={`${row.id}-details`}
                            className="border-b border-border bg-muted/10"
                          >
                            <td
                              colSpan={canSeeMoney ? 16 : canSeeExpense ? 12 : 11}
                              className="px-6 py-3"
                            >
                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Manifest details — {row.trip_code}
                              </p>
                              {row.manifestRows.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  No manifests recorded for this trip.
                                </p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[760px] text-xs">
                                    <thead>
                                      <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                                        <th className="py-1.5 pr-4">Manifest Date</th>
                                        <th className="py-1.5 pr-4">Manifest No.</th>
                                        <th className="py-1.5 pr-4">From Location</th>
                                        <th className="py-1.5 pr-4">To Location</th>
                                        <th className="py-1.5 pr-4 text-right">Weight</th>
                                        <th className="py-1.5 pr-4 text-right">Qty</th>
                                        {canSeeMoney && (
                                          <>
                                            <th className="py-1.5 pr-4 text-right">Trip Expense</th>
                                            <th className="py-1.5 pr-4 text-right">Income</th>
                                            <th className="py-1.5 pr-4 text-right">Distribution</th>
                                            <th className="py-1.5 text-right">Profit</th>
                                          </>
                                        )}
                                        {!canSeeMoney && canSeeExpense && (
                                          <th className="py-1.5 text-right">Trip Expense</th>
                                        )}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {row.manifestRows.map((manifest, index) => (
                                        <tr
                                          key={`${row.id}-${index}`}
                                          className="border-b border-border/40"
                                        >
                                          <td className="py-1.5 pr-4 font-medium">
                                            {displayDate(manifest.manifest_date)}
                                          </td>
                                          <td className="py-1.5 pr-4 font-medium">
                                            {manifest.manifest_number || "—"}
                                          </td>
                                          <td className="py-1.5 pr-4">{manifest.from_location}</td>
                                          <td className="py-1.5 pr-4">{manifest.to_location}</td>
                                          <td className="py-1.5 pr-4 text-right">
                                            {manifest.weight_kg || "—"}
                                          </td>
                                          <td className="py-1.5 pr-4 text-right">
                                            {manifest.quantity || "—"}
                                          </td>
                                          {canSeeMoney && (
                                            <>
                                              <td className="py-1.5 pr-4 text-right">
                                                {inr(manifest.allocatedTripExpense)}
                                              </td>
                                              <td className="py-1.5 pr-4 text-right text-green-600 dark:text-green-400">
                                                {inr(manifest.manifest_income)}
                                              </td>
                                              <td
                                                className={`py-1.5 pr-4 text-right ${moneyColor(manifest.allocatedDistribution)}`}
                                              >
                                                {inr(manifest.allocatedDistribution)}
                                              </td>
                                              <td
                                                className={`py-1.5 text-right font-semibold ${moneyColor(manifest.manifestProfit)}`}
                                              >
                                                {inr(manifest.manifestProfit)}
                                              </td>
                                            </>
                                          )}
                                          {!canSeeMoney && canSeeExpense && (
                                            <td className="py-1.5 text-right text-red-600 dark:text-red-400">
                                              {inr(manifest.allocatedTripExpense)}
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                {canSeeMoney && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                      <td className="px-2 py-3" />
                      <td className="px-4 py-3" colSpan={10}>
                        Totals
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                        {inr(total("total_expense"))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                        {inr(total("operationalDistribution"))}
                      </td>
                      <td className="px-4 py-3 text-right">{inr(total("total_income"))}</td>
                      <td className={`px-4 py-3 text-right ${moneyColor(total("net_income"))}`}>
                        {inr(total("net_income"))}
                      </td>
                      <td
                        className={`px-4 py-3 text-right ${moneyColor(total("distributedProfit"))}`}
                      >
                        {inr(total("distributedProfit"))}
                      </td>
                    </tr>
                  </tfoot>
                )}
                {!canSeeMoney && canSeeExpense && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                      <td className="px-2 py-3" />
                      <td className="px-4 py-3" colSpan={10}>
                        Totals
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                        {inr(total("total_expense"))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * TripDetailsPanel — period trip and manifest detail.
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
type BranchPool = { income: number; expense: number };

function moneyColor(value: number) {
  return value >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
}

function buildBranchPools(
  data: TripAveragesData,
  branches: Array<{ id: string }>,
  tripCounts: Map<string, number>,
) {
  const pools = new Map<string, BranchPool>();
  for (const branch of branches) pools.set(branch.id, { income: 0, expense: 0 });

  for (const row of data.incomeRows) {
    if (row.branch_id && pools.has(row.branch_id)) {
      pools.get(row.branch_id)!.income += row.amount;
    }
  }
  for (const row of data.expenditureRows) {
    if (row.branch_id && pools.has(row.branch_id)) {
      pools.get(row.branch_id)!.expense += row.amount;
    }
  }

  const recipients = branches.filter((branch) => {
    const pool = pools.get(branch.id)!;
    return pool.income > 0 || pool.expense > 0;
  });
  const usableRecipients = recipients.length > 0 ? recipients : branches;
  const totalTrips = usableRecipients.reduce(
    (sum, branch) => sum + (tripCounts.get(branch.id) ?? 0),
    0,
  );
  const share = (branchId: string) =>
    totalTrips > 0
      ? (tripCounts.get(branchId) ?? 0) / totalTrips
      : usableRecipients.length > 0
        ? 1 / usableRecipients.length
        : 0;

  for (const row of data.incomeRows) {
    if (!row.branch_id || !pools.has(row.branch_id)) {
      for (const branch of usableRecipients) {
        pools.get(branch.id)!.income += row.amount * share(branch.id);
      }
    }
  }
  for (const row of data.expenditureRows) {
    if (!row.branch_id || !pools.has(row.branch_id)) {
      for (const branch of usableRecipients) {
        pools.get(branch.id)!.expense += row.amount * share(branch.id);
      }
    }
  }
  for (const branch of usableRecipients) {
    pools.get(branch.id)!.income += data.fixedIncome * share(branch.id);
  }
  return pools;
}

export function TripDetailsPanel() {
  const { user } = useSession();
  const canSeeMoney = user?.role === "admin" || user?.role === "viewer";
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

  const tripCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const trip of data?.trips ?? []) {
      if (trip.branch_id) {
        counts.set(trip.branch_id, (counts.get(trip.branch_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [data]);

  const pools = useMemo(
    () => (data ? buildBranchPools(data, branches, tripCounts) : new Map<string, BranchPool>()),
    [data, branches, tripCounts],
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
        ? (pools.get(trip.branch_id) ?? { income: 0, expense: 0 })
        : { income: 0, expense: 0 };
      const base = method === "weight" ? trip.total_weight : trip.total_quantity;
      const tripShare = branchBase > 0 ? base / branchBase : 1 / Math.max(branchTrips.length, 1);
      const incomeDistribution = branchPool.income * tripShare;
      const expenseDistribution = branchPool.expense * tripShare;
      const distributedIncome = trip.total_income + incomeDistribution;
      const distributedExpense = trip.total_expense + expenseDistribution;
      const distributedProfit = distributedIncome - distributedExpense;
      const manifestWeight = trip.manifests.reduce((sum, manifest) => sum + manifest.weight_kg, 0);
      const manifestRows = trip.manifests.map((manifest) => {
        const manifestShare =
          manifestWeight > 0
            ? manifest.weight_kg / manifestWeight
            : 1 / Math.max(trip.manifests.length, 1);
        return {
          ...manifest,
          manifestShare,
          allocatedIncome: distributedIncome * manifestShare,
          allocatedExpense: distributedExpense * manifestShare,
          manifestProfit: distributedProfit * manifestShare,
        };
      });
      return {
        ...trip,
        base,
        tripShare,
        incomeDistribution,
        expenseDistribution,
        distributedIncome,
        distributedExpense,
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
      | "incomeDistribution"
      | "expenseDistribution"
      | "distributedProfit",
  ) => filteredRows.reduce((sum, row) => sum + row[field], 0);

  function exportExcel() {
    if (!filteredRows.length) {
      toast.error("No trip details to export");
      return;
    }

    const tripHeaders = canSeeMoney
      ? [
          "Trip",
          "Branch",
          "Trip Income (₹)",
          "Trip Expense (₹)",
          "Trip Profit (₹)",
          "Final Profit (₹)",
        ]
      : canSeeExpense
        ? ["Trip", "Branch", "Trip Expense (₹)", "Expense Dist. (₹)"]
        : ["Trip", "Branch"];
    const tripRows: (string | number)[][] = [
      tripHeaders,
      ...filteredRows.map((row) =>
        canSeeMoney
          ? [
              row.trip_code || "—",
              row.branch_name || "—",
              row.total_income,
              row.total_expense,
              row.net_income,
              row.distributedProfit,
            ]
          : canSeeExpense
            ? [row.trip_code || "—", row.branch_name || "—", row.total_expense, row.expenseDistribution]
            : [row.trip_code || "—", row.branch_name || "—"],
      ),
    ];
    if (canSeeMoney) {
      tripRows.push([
        "TOTALS",
        "",
        total("total_income"),
        total("total_expense"),
        total("net_income"),
        total("distributedProfit"),
      ]);
    } else if (canSeeExpense) {
      tripRows.push([
        "TOTALS",
        "",
        total("total_expense"),
        total("expenseDistribution"),
      ]);
    } else {
      tripRows.push(["TOTALS", ""]);
    }

    const manifestHeaders = canSeeMoney
      ? [
          "Trip",
          "Branch",
          "Manifest No.",
          "From Location",
          "To Location",
          "Weight (kg)",
          "Quantity",
          "Manifest Income (₹)",
          "Distributed Income (₹)",
          "Distributed Expense (₹)",
          "Profit (₹)",
        ]
      : [
          "Trip",
          "Branch",
          "Manifest No.",
          "From Location",
          "To Location",
          "Weight (kg)",
          "Quantity",
        ];
    const manifestRows: (string | number)[][] = [manifestHeaders];
    let manifestIncomeTotal = 0;
    let distributedIncomeTotal = 0;
    let distributedExpenseTotal = 0;
    let manifestProfitTotal = 0;

    for (const row of filteredRows) {
      if (row.manifestRows.length === 0) {
        manifestRows.push([row.trip_code || "—", row.branch_name || "—", "—", "—", "—", "", ""]);
        continue;
      }

      for (const manifest of row.manifestRows) {
        manifestIncomeTotal += manifest.manifest_income;
        distributedIncomeTotal += manifest.allocatedIncome;
        distributedExpenseTotal += manifest.allocatedExpense;
        manifestProfitTotal += manifest.manifestProfit;
        const base: (string | number)[] = [
          row.trip_code || "—",
          row.branch_name || "—",
          manifest.manifest_number || "—",
          manifest.from_location || "—",
          manifest.to_location || "—",
          manifest.weight_kg,
          manifest.quantity,
        ];
        manifestRows.push(
          canSeeMoney
            ? [
                ...base,
                manifest.manifest_income,
                manifest.allocatedIncome,
                manifest.allocatedExpense,
                manifest.manifestProfit,
              ]
            : base,
        );
      }
    }
    const manifestTotals = ["TOTALS", "", "", "", "", "", ""];
    if (canSeeMoney) {
      manifestTotals.push(
        manifestIncomeTotal,
        distributedIncomeTotal,
        distributedExpenseTotal,
        manifestProfitTotal,
      );
    }
    manifestRows.push(manifestTotals);

    const tripSheet = XLSX.utils.aoa_to_sheet(tripRows);
    tripSheet["!cols"] = (
      canSeeMoney
        ? [18, 18, 16, 16, 16, 16]
        : canSeeExpense
          ? [18, 18, 16, 18]
          : [18, 18]
    ).map((wch) => ({ wch }));
    const manifestSheet = XLSX.utils.aoa_to_sheet(manifestRows);
    manifestSheet["!cols"] = (
      canSeeMoney
        ? [18, 18, 16, 20, 20, 12, 12, 18, 20, 20, 16]
        : [18, 18, 16, 20, 20, 12, 12]
    ).map((wch) => ({ wch }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, tripSheet, "Trip Wise");
    XLSX.utils.book_append_sheet(workbook, manifestSheet, "Manifest Wise");
    const filename =
      financialYear !== "none"
        ? `trip-details-fy-${financialYearLabel(Number(financialYear))}.xlsx`
        : `trip-details-${year}-${month.padStart(2, "0")}.xlsx`;
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
              Trip Details — {monthLabel}
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
                  Income and expense pools are distributed branch-wise by <strong>{method}</strong>.
                  Click a trip to see its manifest details and distribution.
                </>
              ) : canSeeExpense ? (
                <>
                  Trip expenses and expense distributions are shown trip-wise. Income and profit
                  amounts are hidden for basic users.
                </>
              ) : (
                <>
                  Showing trips only from your assigned branches. Financial amounts are hidden.
                </>
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
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Branch</th>
                    {canSeeMoney && (
                      <>
                        <th className="px-4 py-3 text-right">Trip Income</th>
                        <th className="px-4 py-3 text-right">Trip Expense</th>
                        <th className="px-4 py-3 text-right">Trip Profit</th>
                        <th className="px-4 py-3 text-right">Final Profit</th>
                      </>
                    )}
                    {!canSeeMoney && canSeeExpense && (
                      <>
                        <th className="px-4 py-3 text-right">Trip Expense</th>
                        <th className="px-4 py-3 text-right">Expense Dist.</th>
                      </>
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
                          <td className="px-4 py-3 font-medium">{row.trip_code || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.branch_name || "—"}
                          </td>
                          {canSeeMoney && (
                            <>
                              <td className="px-4 py-3 text-right">{inr(row.total_income)}</td>
                              <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                                {inr(row.total_expense)}
                              </td>
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
                            <>
                              <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                                {inr(row.total_expense)}
                              </td>
                              <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                                {inr(row.expenseDistribution)}
                              </td>
                            </>
                          )}
                        </tr>
                        {open && (
                          <tr
                            key={`${row.id}-details`}
                            className="border-b border-border bg-muted/10"
                          >
                            <td
                              colSpan={canSeeMoney ? 7 : canSeeExpense ? 5 : 3}
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
                                        <th className="py-1.5 pr-4">Manifest No.</th>
                                        <th className="py-1.5 pr-4">From Location</th>
                                        <th className="py-1.5 pr-4">To Location</th>
                                        <th className="py-1.5 pr-4 text-right">Weight</th>
                                        <th className="py-1.5 pr-4 text-right">Qty</th>
                                        {canSeeMoney && (
                                          <>
                                            <th className="py-1.5 pr-4 text-right">Income</th>
                                            <th className="py-1.5 pr-4 text-right">Income Dist.</th>
                                            <th className="py-1.5 pr-4 text-right">
                                              Expense Dist.
                                            </th>
                                            <th className="py-1.5 text-right">Profit</th>
                                          </>
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
                                                {inr(manifest.manifest_income)}
                                              </td>
                                              <td className="py-1.5 pr-4 text-right text-green-600 dark:text-green-400">
                                                {inr(manifest.allocatedIncome)}
                                              </td>
                                              <td className="py-1.5 pr-4 text-right text-red-600 dark:text-red-400">
                                                {inr(manifest.allocatedExpense)}
                                              </td>
                                              <td
                                                className={`py-1.5 text-right font-semibold ${moneyColor(manifest.manifestProfit)}`}
                                              >
                                                {inr(manifest.manifestProfit)}
                                              </td>
                                            </>
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
                      <td className="px-4 py-3" colSpan={2}>
                        Totals
                      </td>
                      <td className="px-4 py-3 text-right">{inr(total("total_income"))}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                        {inr(total("total_expense"))}
                      </td>
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
                      <td className="px-4 py-3" colSpan={2}>
                        Totals
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                        {inr(total("total_expense"))}
                      </td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                        {inr(total("expenseDistribution"))}
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

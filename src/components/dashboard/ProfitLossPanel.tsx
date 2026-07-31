/**
 * ProfitLossPanel — Year/Month P&L with branch sub-tabs and charts.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  serverFetchPnLYear, serverFetchPnLPeriod,
  computePnL, computeMonthlyPnL,
  type PnLRawData, type PnLStats,
} from "@/lib/pnl";
import { inr } from "@/lib/trip-calc";
import { financialYearLabel, financialYearOptions } from "@/lib/financial-year";

const MONTH_OPTIONS = [
  { value: "0",  label: "All Year" },
  { value: "1",  label: "January" },  { value: "2",  label: "February" },
  { value: "3",  label: "March" },    { value: "4",  label: "April" },
  { value: "5",  label: "May" },      { value: "6",  label: "June" },
  { value: "7",  label: "July" },     { value: "8",  label: "August" },
  { value: "9",  label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const PIE_COLORS = ["#22c55e", "#3b82f6", "#8b5cf6", "#f97316", "#ef4444"];
const BAR_COLORS = { tripIncome: "#22c55e", otherIncome: "#3b82f6", fixedIncome: "#8b5cf6", expenditures: "#ef4444" };

function StatCard({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const isPos = value >= 0;
  return (
    <div className="surface-card p-3 sm:p-4">
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      <p className={`mt-1 text-base sm:text-xl font-bold tracking-tight break-all ${
        positive !== undefined
          ? isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          : "text-foreground"
      }`}>
        {inr(value)}
      </p>
    </div>
  );
}

function formatYAxis(v: number) {
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

export function ProfitLossPanel() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]       = useState(String(currentYear));
  const [month, setMonth]     = useState("0");
  const [financialYear, setFinancialYear] = useState("none");
  const [data, setData]       = useState<PnLRawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchTab, setBranchTab] = useState<string>("all");

  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - 3 + i), [currentYear]);
  const financialYears = useMemo(() => financialYearOptions(currentYear), [currentYear]);

  async function load(y: string, m: string, fy = financialYear) {
    setLoading(true);
    try {
      const mn = Number(m);
      const result = fy !== "none"
        ? await serverFetchPnLPeriod({ data: { period: { financialYearStart: Number(fy) } } })
        : mn > 0
          ? await serverFetchPnLPeriod({ data: { period: { year: Number(y), month: mn } } })
          : await serverFetchPnLYear({ data: { year: Number(y) } });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load P&L data");
    }
    setLoading(false);
  }

  useEffect(() => { load(year, month, financialYear); }, [year, month, financialYear]);

  const branchId = branchTab === "all" ? null : branchTab;
  const monthNum = Number(month);

  const stats = useMemo<PnLStats | null>(
    () => (data ? computePnL(data, branchId) : null),
    [data, branchId],
  );

  const monthlyData = useMemo(() => {
    if (!data || monthNum > 0) return [];
    return computeMonthlyPnL(data, branchId);
  }, [data, branchId, monthNum]);

  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: "Trip Income", value: stats.tripIncome },
      { name: "Other Income", value: stats.otherIncome },
      { name: "Fixed Income", value: stats.fixedIncome },
      { name: "Expenditures", value: stats.totalExpenditure },
      { name: "Trip Expenses", value: stats.tripExpense },
    ].filter(d => d.value > 0);
  }, [stats]);

  const periodLabel = financialYear !== "none" ? `FY ${financialYearLabel(Number(financialYear))}` : monthNum > 0 ? `${MONTH_OPTIONS[monthNum]?.label} ${year}` : year;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const branches = data?.branches ?? [];

  return (
    <div className="animate-fade-up space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={year} onValueChange={v => setYear(v)}>
          <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={month} onValueChange={v => setMonth(v)}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={financialYear} onValueChange={setFinancialYear}>
          <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Financial Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Financial Year: None</SelectItem>
            {financialYears.map(fy => <SelectItem key={fy.value} value={fy.value}>FY {fy.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => load(year, month, financialYear)} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {data ? `${data.closedTrips.length} closed trips · ${branches.length} branch${branches.length !== 1 ? "es" : ""}` : ""}
        </span>
      </div>

      {/* Branch sub-tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted/40 p-1.5">
        <button type="button" onClick={() => setBranchTab("all")}
          className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${branchTab === "all" ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          All Branches
        </button>
        {branches.map(b => (
          <button key={b.id} type="button" onClick={() => setBranchTab(b.id)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${branchTab === b.id ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {b.branch_name}
          </button>
        ))}
      </div>

      {!stats ? (
        <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
          No data found for {periodLabel}.
        </p>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Trip Gross Profit" value={stats.tripGrossProfit} positive />
            <StatCard label="Other Income" value={stats.otherIncome} />
            <StatCard label="Fixed Income" value={stats.fixedIncome} />
            <StatCard label="Expenditures" value={stats.totalExpenditure} />
            <StatCard label="Total Income" value={stats.totalIncome} />
            <StatCard label="Net P&L" value={stats.netPnL} positive />
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            <div className="surface-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Trips Closed</p>
              <p className="mt-0.5 text-lg font-bold">{stats.tripCount}</p>
            </div>
            <div className="surface-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Trip Income</p>
              <p className="mt-0.5 text-sm font-semibold">{inr(stats.tripIncome)}</p>
            </div>
            <div className="surface-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Trip Expenses</p>
              <p className="mt-0.5 text-sm font-semibold text-red-600 dark:text-red-400">{inr(stats.tripExpense)}</p>
            </div>
            <div className="surface-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Expense</p>
              <p className="mt-0.5 text-sm font-semibold text-red-600 dark:text-red-400">{inr(stats.totalExpense)}</p>
            </div>
            <div className="surface-card p-3 text-center">
              <p className="text-xs text-muted-foreground">Margin</p>
              <p className={`mt-0.5 text-sm font-semibold ${stats.totalIncome > 0 ? (stats.netPnL / stats.totalIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : ""}`}>
                {stats.totalIncome > 0 ? `${((stats.netPnL / stats.totalIncome) * 100).toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>

          {/* Monthly bar chart (all year only) */}
          {monthlyData.length > 0 && (
            <div className="surface-card p-5">
              <h3 className="mb-4 text-sm font-semibold tracking-tight">Monthly Trend — {periodLabel}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="tripIncome" name="Trip Income" fill={BAR_COLORS.tripIncome} radius={[2,2,0,0]} />
                  <Bar dataKey="otherIncome" name="Other Income" fill={BAR_COLORS.otherIncome} radius={[2,2,0,0]} />
                  <Bar dataKey="fixedIncome" name="Fixed Income" fill={BAR_COLORS.fixedIncome} radius={[2,2,0,0]} />
                  <Bar dataKey="expenditures" name="Expenditures" fill={BAR_COLORS.expenditures} radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Net P&L chart (all year only) */}
          {monthlyData.length > 0 && (
            <div className="surface-card p-5">
              <h3 className="mb-4 text-sm font-semibold tracking-tight">Net P&amp;L by Month — {periodLabel}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="netPnL" name="Net P&L" fill="#f59e0b" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Pie: income breakdown */}
          {pieData.length > 0 && (
            <div className="surface-card p-5">
              <h3 className="mb-4 text-sm font-semibold tracking-tight">Income &amp; Expense Breakdown — {periodLabel}</h3>
              <div className="flex flex-wrap items-center gap-8">
                <PieChart width={220} height={220}>
                  <Pie data={pieData} cx={100} cy={100} innerRadius={55} outerRadius={95} paddingAngle={2} dataKey="value">
                    {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
                <div className="space-y-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="size-3 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}:</span>
                      <span className="font-medium">{inr(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

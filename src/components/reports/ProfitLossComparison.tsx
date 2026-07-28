/**
 * ProfitLossComparison — Compare P&L between two periods (month or full year).
 */
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowLeftRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
  serverFetchPnLPeriod,
  computePnL,
  type PnLRawData,
  type PnLStats,
  type PeriodSpec,
} from "@/lib/pnl";
import { inr } from "@/lib/trip-calc";

const MONTHS = [
  { value: "0", label: "Full Year" },
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

function periodLabel(year: string, month: string) {
  const m = Number(month);
  if (m === 0) return String(year);
  return `${MONTHS[m]?.label} ${year}`;
}

function PeriodSelector({
  label,
  year,
  month,
  onYear,
  onMonth,
  years,
}: {
  label: string;
  year: string;
  month: string;
  onYear: (v: string) => void;
  onMonth: (v: string) => void;
  years: number[];
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        <Select value={year} onValueChange={onYear}>
          <SelectTrigger className="h-9 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={month} onValueChange={onMonth}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function CompareCard({
  label,
  val1,
  val2,
  highlight,
}: {
  label: string;
  val1: number;
  val2: number;
  highlight?: boolean;
}) {
  const diff = val2 - val1;
  const pct = val1 !== 0 ? ((diff / Math.abs(val1)) * 100).toFixed(1) : null;
  const improved = diff >= 0;

  return (
    <div className={`surface-card p-4 ${highlight ? "ring-1 ring-primary" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-muted-foreground">Period 1</p>
          <p className="text-base font-bold">{inr(val1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Period 2</p>
          <p className="text-base font-bold">{inr(val2)}</p>
        </div>
      </div>
      {pct !== null ? (
        <p className={`mt-2 text-xs font-semibold ${improved ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {improved ? "▲" : "▼"} {Math.abs(Number(pct))}% ({inr(Math.abs(diff))})
        </p>
      ) : null}
    </div>
  );
}

function formatYAxis(v: number) {
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

export function ProfitLossComparison() {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 7 }, (_, i) => currentYear - 4 + i), [currentYear]);

  const [p1Year, setP1Year] = useState(String(currentYear - 1));
  const [p1Month, setP1Month] = useState("0");
  const [p2Year, setP2Year] = useState(String(currentYear));
  const [p2Month, setP2Month] = useState("0");

  const [data1, setData1] = useState<PnLRawData | null>(null);
  const [data2, setData2] = useState<PnLRawData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [branchFilter, setBranchFilter] = useState<string>("all");

  async function run() {
    setLoading(true);
    try {
      const period1: PeriodSpec = {
        year: Number(p1Year),
        month: Number(p1Month) === 0 ? undefined : Number(p1Month),
      };
      const period2: PeriodSpec = {
        year: Number(p2Year),
        month: Number(p2Month) === 0 ? undefined : Number(p2Month),
      };

      const [r1, r2] = await Promise.all([
        serverFetchPnLPeriod({ data: { period: period1 } }),
        serverFetchPnLPeriod({ data: { period: period2 } }),
      ]);
      setData1(r1);
      setData2(r2);
      setHasLoaded(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load data");
    }
    setLoading(false);
  }

  const branchId = branchFilter === "all" ? null : branchFilter;

  const stats1 = useMemo<PnLStats | null>(
    () => (data1 ? computePnL(data1, branchId) : null),
    [data1, branchId],
  );
  const stats2 = useMemo<PnLStats | null>(
    () => (data2 ? computePnL(data2, branchId) : null),
    [data2, branchId],
  );

  const branches = data1?.branches ?? data2?.branches ?? [];

  // Build comparison bar chart data
  const barData = useMemo(() => {
    if (!stats1 || !stats2) return [];
    return [
      { name: "Trip Income",     p1: stats1.tripIncome,      p2: stats2.tripIncome },
      { name: "Other Income",    p1: stats1.otherIncome,     p2: stats2.otherIncome },
      { name: "Fixed Income",    p1: stats1.fixedIncome,     p2: stats2.fixedIncome },
      { name: "Trip Expenses",   p1: stats1.tripExpense,     p2: stats2.tripExpense },
      { name: "Expenditures",    p1: stats1.totalExpenditure,p2: stats2.totalExpenditure },
      { name: "Net P&L",         p1: stats1.netPnL,          p2: stats2.netPnL },
    ];
  }, [stats1, stats2]);

  return (
    <div className="animate-fade-up space-y-6">
      {/* Period selectors */}
      <div className="surface-card p-5">
        <div className="flex flex-wrap items-end gap-6">
          <PeriodSelector
            label="Period 1"
            year={p1Year}
            month={p1Month}
            onYear={setP1Year}
            onMonth={setP1Month}
            years={years}
          />
          <div className="flex items-center pb-1">
            <ArrowLeftRight className="size-5 text-muted-foreground" />
          </div>
          <PeriodSelector
            label="Period 2"
            year={p2Year}
            month={p2Month}
            onYear={setP2Year}
            onMonth={setP2Month}
            years={years}
          />
          <Button onClick={run} disabled={loading} className="self-end">
            {loading ? <RefreshCw className="size-4 animate-spin" /> : null}
            Compare
          </Button>
        </div>
      </div>

      {!hasLoaded && !loading ? (
        <div className="rounded-xl bg-muted px-4 py-12 text-center text-sm text-muted-foreground">
          Select two periods above and click <strong>Compare</strong> to generate the report.
        </div>
      ) : loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : stats1 && stats2 ? (
        <>
          {/* Period labels */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-blue-500" />
              <span className="font-medium">{periodLabel(p1Year, p1Month)}</span>
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-green-500" />
              <span className="font-medium">{periodLabel(p2Year, p2Month)}</span>
            </span>
          </div>

          {/* Branch filter */}
          {branches.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 rounded-xl bg-muted/40 p-1.5">
              <button
                type="button"
                onClick={() => setBranchFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  branchFilter === "all" ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Branches
              </button>
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchFilter(b.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    branchFilter === b.id ? "bg-card font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {b.branch_name}
                </button>
              ))}
            </div>
          ) : null}

          {/* Comparison cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CompareCard label="Net P&L" val1={stats1.netPnL} val2={stats2.netPnL} highlight />
            <CompareCard label="Trip Gross Profit" val1={stats1.tripGrossProfit} val2={stats2.tripGrossProfit} />
            <CompareCard label="Total Income" val1={stats1.totalIncome} val2={stats2.totalIncome} />
            <CompareCard label="Trip Income" val1={stats1.tripIncome} val2={stats2.tripIncome} />
            <CompareCard label="Other Income" val1={stats1.otherIncome} val2={stats2.otherIncome} />
            <CompareCard label="Fixed Income" val1={stats1.fixedIncome} val2={stats2.fixedIncome} />
            <CompareCard label="Total Expenses" val1={stats1.totalExpense} val2={stats2.totalExpense} />
            <CompareCard label="Trip Expenses" val1={stats1.tripExpense} val2={stats2.tripExpense} />
            <CompareCard label="Expenditures" val1={stats1.totalExpenditure} val2={stats2.totalExpenditure} />
          </div>

          {/* Trips count comparison */}
          <div className="surface-card p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Trips Closed — {periodLabel(p1Year, p1Month)}</p>
                <p className="mt-0.5 text-xl font-bold">{stats1.tripCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trips Closed — {periodLabel(p2Year, p2Month)}</p>
                <p className="mt-0.5 text-xl font-bold">{stats2.tripCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Change</p>
                <p className={`mt-0.5 text-xl font-bold ${stats2.tripCount >= stats1.tripCount ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {stats2.tripCount >= stats1.tripCount ? "+" : ""}{stats2.tripCount - stats1.tripCount}
                </p>
              </div>
              {stats1.tripCount > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground">% Change</p>
                  <p className={`mt-0.5 text-xl font-bold ${stats2.tripCount >= stats1.tripCount ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {(((stats2.tripCount - stats1.tripCount) / stats1.tripCount) * 100).toFixed(1)}%
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          {/* Comparison bar chart */}
          <div className="surface-card p-5">
            <h3 className="mb-4 text-sm font-semibold tracking-tight">
              Side-by-side: {periodLabel(p1Year, p1Month)} vs {periodLabel(p2Year, p2Month)}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => inr(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="p1" name={periodLabel(p1Year, p1Month)} fill="#3b82f6" radius={[2,2,0,0]} />
                <Bar dataKey="p2" name={periodLabel(p2Year, p2Month)} fill="#22c55e" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Net P&L comparison bar */}
          <div className="surface-card p-5">
            <h3 className="mb-4 text-sm font-semibold tracking-tight">Net P&L Comparison</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[
                  { name: periodLabel(p1Year, p1Month), value: stats1.netPnL },
                  { name: periodLabel(p2Year, p2Month), value: stats2.netPnL },
                ]}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: number) => inr(v)}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="value" name="Net P&L" radius={[4,4,0,0]}>
                  {[stats1.netPnL, stats2.netPnL].map((v, i) => (
                    <Cell key={i} fill={v >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : null}
    </div>
  );
}

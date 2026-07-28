/**
 * TripSummaryPanel — Plain trips dashboard: trip net only, no other income/fixed charges.
 * Shows all branches + branch-wise breakdown with charts.
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
import { serverFetchPnLYear, serverFetchPnLPeriod, type PnLRawData } from "@/lib/pnl";
import { inr } from "@/lib/trip-calc";

const MONTH_OPTIONS = [
  { value: "0", label: "All Year" },
  { value: "1", label: "January" }, { value: "2", label: "February" },
  { value: "3", label: "March" }, { value: "4", label: "April" },
  { value: "5", label: "May" }, { value: "6", label: "June" },
  { value: "7", label: "July" }, { value: "8", label: "August" },
  { value: "9", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const BRANCH_COLORS = ["#22c55e","#3b82f6","#8b5cf6","#f97316","#ef4444","#06b6d4","#f59e0b","#ec4899"];

function fmt(v: number) {
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

function KpiCard({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  const isPos = value >= 0;
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tracking-tight ${
        positive !== undefined
          ? isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          : "text-foreground"
      }`}>
        {inr(value)}
      </p>
    </div>
  );
}

function computeTripStats(data: PnLRawData, branchId: string | null, monthNum: number) {
  const trips = data.closedTrips.filter(t => {
    const branchOk = branchId ? t.branch_id === branchId : true;
    const monthOk = monthNum > 0
      ? t.closed_at.startsWith(`${data.year}-${String(monthNum).padStart(2, "0")}`)
      : true;
    return branchOk && monthOk;
  });
  const totalIncome = trips.reduce((s, t) => s + t.total_income, 0);
  const totalExpense = trips.reduce((s, t) => s + t.total_expense, 0);
  const netIncome = trips.reduce((s, t) => s + t.net_income, 0);
  return { totalIncome, totalExpense, netIncome, count: trips.length };
}

export function TripSummaryPanel() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState("0");
  const [data, setData] = useState<PnLRawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchTab, setBranchTab] = useState("all");

  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - 3 + i), [currentYear]);

  async function load(y: string, m: string) {
    setLoading(true);
    try {
      const mn = Number(m);
      const result = mn > 0
        ? await serverFetchPnLPeriod({ data: { period: { year: Number(y), month: mn } } })
        : await serverFetchPnLYear({ data: { year: Number(y) } });
      setData(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load trips");
    }
    setLoading(false);
  }

  useEffect(() => { load(year, month); }, [year, month]);

  const branches = data?.branches ?? [];
  const branchId = branchTab === "all" ? null : branchTab;
  const monthNum = Number(month);

  const stats = useMemo(
    () => data ? computeTripStats(data, branchId, monthNum) : null,
    [data, branchId, monthNum],
  );

  // Monthly bar chart data (only when "all year")
  const monthlyData = useMemo(() => {
    if (!data || monthNum > 0) return [];
    return SHORT_MONTHS.map((m, idx) => {
      const prefix = `${data.year}-${String(idx + 1).padStart(2, "0")}`;
      const trips = data.closedTrips.filter(t =>
        t.closed_at.startsWith(prefix) && (branchId ? t.branch_id === branchId : true),
      );
      return {
        month: m,
        income: trips.reduce((s, t) => s + t.total_income, 0),
        expense: trips.reduce((s, t) => s + t.total_expense, 0),
        net: trips.reduce((s, t) => s + t.net_income, 0),
      };
    });
  }, [data, branchId, monthNum]);

  // Branch-wise breakdown
  const branchStats = useMemo(() => {
    if (!data) return [];
    return branches.map((b, i) => {
      const trips = data.closedTrips.filter(t => t.branch_id === b.id);
      const income = trips.reduce((s, t) => s + t.total_income, 0);
      const expense = trips.reduce((s, t) => s + t.total_expense, 0);
      const net = income - expense;
      return { id: b.id, name: b.branch_name, income, expense, net, count: trips.length, color: BRANCH_COLORS[i % BRANCH_COLORS.length] };
    }).filter(b => b.count > 0);
  }, [data, branches]);

  // Pie: branch-wise trip income distribution
  const pieData = useMemo(() => branchStats.filter(b => b.income > 0), [branchStats]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={year} onValueChange={v => { setYear(v); }}>
          <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => load(year, month)} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {data?.closedTrips.length ?? 0} closed trips · {branches.length} branch{branches.length !== 1 ? "es" : ""}
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

      {!stats || stats.count === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
          No closed trips found for this period.
        </p>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="surface-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Trips Closed</p>
              <p className="mt-1 text-2xl font-bold">{stats.count}</p>
            </div>
            <KpiCard label="Total Income" value={stats.totalIncome} />
            <KpiCard label="Total Expense" value={stats.totalExpense} />
            <KpiCard label="Net Income" value={stats.netIncome} positive />
          </div>

          {/* Monthly trend chart */}
          {monthlyData.length > 0 && (
            <div className="surface-card p-5">
              <h3 className="mb-4 text-sm font-semibold tracking-tight">Monthly Trip Trend — {year}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Trip Income" fill="#22c55e" radius={[2,2,0,0]} />
                  <Bar dataKey="expense" name="Trip Expense" fill="#ef4444" radius={[2,2,0,0]} />
                  <Bar dataKey="net" name="Net" fill="#f59e0b" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Branch-wise breakdown + pie */}
          {branchStats.length > 1 && branchTab === "all" && (
            <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
              {/* Table */}
              <div className="surface-card overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-sm font-semibold tracking-tight">Branch-wise Trip Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2">Branch</th>
                      <th className="px-4 py-2 text-right">Trips</th>
                      <th className="px-4 py-2 text-right">Income</th>
                      <th className="px-4 py-2 text-right">Expense</th>
                      <th className="px-4 py-2 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchStats.map(b => (
                      <tr key={b.id} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                            {b.name}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">{b.count}</td>
                        <td className="px-4 py-2.5 text-right">{inr(b.income)}</td>
                        <td className="px-4 py-2.5 text-right text-red-600 dark:text-red-400">{inr(b.expense)}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${b.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {inr(b.net)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Pie chart */}
              {pieData.length > 0 && (
                <div className="surface-card flex flex-col items-center justify-center p-5">
                  <h3 className="mb-3 text-sm font-semibold tracking-tight self-start">Income by Branch</h3>
                  <PieChart width={200} height={200}>
                    <Pie data={pieData} cx={95} cy={95} innerRadius={50} outerRadius={88} paddingAngle={2} dataKey="income">
                      {pieData.map((b, i) => <Cell key={b.id} fill={b.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                  <div className="mt-2 space-y-1 self-start">
                    {pieData.map(b => (
                      <div key={b.id} className="flex items-center gap-2 text-xs">
                        <span className="size-2.5 rounded-sm shrink-0" style={{ backgroundColor: b.color }} />
                        <span className="text-muted-foreground">{b.name}</span>
                        <span className="ml-auto font-medium">{inr(b.income)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

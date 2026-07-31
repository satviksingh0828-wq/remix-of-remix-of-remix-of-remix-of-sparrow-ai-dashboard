/**
 * TripSummaryPanel — Plain trips dashboard with comparison mode.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { ArrowLeftRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { serverFetchPnLYear, serverFetchPnLPeriod, type PnLRawData } from "@/lib/pnl";
import { inr } from "@/lib/trip-calc";
import { financialYearLabel, financialYearOptions } from "@/lib/financial-year";

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

function CompareCard({
  label, val1, val2, label1, label2,
}: {
  label: string; val1: number; val2: number; label1: string; label2: string;
}) {
  const diff = val2 - val1;
  const pct = val1 !== 0 ? ((diff / Math.abs(val1)) * 100).toFixed(1) : null;
  const improved = diff >= 0;
  return (
    <div className="surface-card p-4">
      <p className="text-xs text-muted-foreground mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-muted-foreground truncate">{label1}</p>
          <p className="text-sm font-bold">{inr(val1)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground truncate">{label2}</p>
          <p className="text-sm font-bold">{inr(val2)}</p>
        </div>
      </div>
      {pct !== null && (
        <p className={`mt-1.5 text-xs font-semibold ${improved ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {improved ? "▲" : "▼"} {Math.abs(Number(pct))}% ({inr(Math.abs(diff))})
        </p>
      )}
    </div>
  );
}

function PeriodSel({ label, year, month, onYear, onMonth, years }: {
  label: string; year: string; month: string;
  onYear: (v: string) => void; onMonth: (v: string) => void; years: number[];
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        <Select value={year} onValueChange={onYear}>
          <SelectTrigger className="h-9 w-24"><SelectValue /></SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={month} onValueChange={onMonth}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{MONTH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
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
  return {
    totalIncome:  trips.reduce((s, t) => s + t.total_income,  0),
    totalExpense: trips.reduce((s, t) => s + t.total_expense, 0),
    netIncome:    trips.reduce((s, t) => s + t.net_income,    0),
    count: trips.length,
  };
}

function plabel(year: string, month: string) {
  const m = Number(month);
  return m === 0 ? year : `${MONTH_OPTIONS[m]?.label} ${year}`;
}

export function TripSummaryPanel() {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - 3 + i), [currentYear]);
  const financialYears = useMemo(() => financialYearOptions(currentYear), [currentYear]);

  const [year,  setYear]  = useState(String(currentYear));
  const [month, setMonth] = useState("0");
  const [financialYear, setFinancialYear] = useState("none");
  const [data,  setData]  = useState<PnLRawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchTab, setBranchTab] = useState("all");

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [p2Year,  setP2Year]  = useState(String(currentYear));
  const [p2Month, setP2Month] = useState("0");
  const [p2FinancialYear, setP2FinancialYear] = useState("none");
  const [data2,   setData2]   = useState<PnLRawData | null>(null);
  const [loading2, setLoading2] = useState(false);

  async function loadPeriod(y: string, m: string, fy = "none"): Promise<PnLRawData> {
    const mn = Number(m);
    return fy !== "none"
      ? await serverFetchPnLPeriod({ data: { period: { financialYearStart: Number(fy) } } })
      : mn > 0
        ? await serverFetchPnLPeriod({ data: { period: { year: Number(y), month: mn } } })
        : await serverFetchPnLYear({ data: { year: Number(y) } });
  }

  async function load(y: string, m: string) {
    setLoading(true);
    try { setData(await loadPeriod(y, m, financialYear)); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not load trips"); }
    setLoading(false);
  }

  async function loadP2(y: string, m: string) {
    setLoading2(true);
    try { setData2(await loadPeriod(y, m, p2FinancialYear)); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not load comparison data"); }
    setLoading2(false);
  }

  useEffect(() => { load(year, month); }, [year, month, financialYear]);
  useEffect(() => {
    if (compareMode) loadP2(p2Year, p2Month);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareMode, p2Year, p2Month, p2FinancialYear]);

  const branches  = data?.branches ?? [];
  const branchId  = branchTab === "all" ? null : branchTab;
  const monthNum  = Number(month);
  const monthNum2 = Number(p2Month);

  const stats  = useMemo(() => data  ? computeTripStats(data,  branchId, monthNum)  : null, [data,  branchId, monthNum]);
  const stats2 = useMemo(() => data2 ? computeTripStats(data2, branchId, monthNum2) : null, [data2, branchId, monthNum2]);

  const monthlyData = useMemo(() => {
    if (!data || monthNum > 0) return [];
    return SHORT_MONTHS.map((m, idx) => {
      const prefix = `${data.year}-${String(idx + 1).padStart(2, "0")}`;
      const trips = data.closedTrips.filter(t =>
        t.closed_at.startsWith(prefix) && (branchId ? t.branch_id === branchId : true),
      );
      return {
        month: m,
        income:  trips.reduce((s, t) => s + t.total_income,  0),
        expense: trips.reduce((s, t) => s + t.total_expense, 0),
        net:     trips.reduce((s, t) => s + t.net_income,    0),
      };
    });
  }, [data, branchId, monthNum]);

  const monthlyData2 = useMemo(() => {
    if (!data2 || monthNum2 > 0 || !compareMode) return [];
    return SHORT_MONTHS.map((m, idx) => {
      const prefix = `${data2.year}-${String(idx + 1).padStart(2, "0")}`;
      const trips = data2.closedTrips.filter(t =>
        t.closed_at.startsWith(prefix) && (branchId ? t.branch_id === branchId : true),
      );
      return {
        month: m,
        income:  trips.reduce((s, t) => s + t.total_income,  0),
        net:     trips.reduce((s, t) => s + t.net_income,    0),
      };
    });
  }, [data2, branchId, monthNum2, compareMode]);

  const branchStats = useMemo(() => {
    if (!data) return [];
    return branches.map((b, i) => {
      const trips = data.closedTrips.filter(t => t.branch_id === b.id);
      const income  = trips.reduce((s, t) => s + t.total_income,  0);
      const expense = trips.reduce((s, t) => s + t.total_expense, 0);
      const net = income - expense;
      return { id: b.id, name: b.branch_name, income, expense, net, count: trips.length, color: BRANCH_COLORS[i % BRANCH_COLORS.length] };
    }).filter(b => b.count > 0);
  }, [data, branches]);

  const pieData = useMemo(() => branchStats.filter(b => b.income > 0), [branchStats]);

  const p1Label = financialYear !== "none" ? `FY ${financialYearLabel(Number(financialYear))}` : plabel(year, month);
  const p2Label = p2FinancialYear !== "none" ? `FY ${financialYearLabel(Number(p2FinancialYear))}` : plabel(p2Year, p2Month);

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
        {compareMode ? (
          <div className="flex flex-wrap gap-4 flex-1">
            <PeriodSel label="Period 1" year={year} month={month} onYear={setYear} onMonth={setMonth} years={years} />
            <Select value={financialYear} onValueChange={setFinancialYear}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Financial Year: None</SelectItem>{financialYears.map(fy => <SelectItem key={fy.value} value={fy.value}>FY {fy.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex items-end pb-1 text-muted-foreground text-sm">vs</div>
            <PeriodSel label="Period 2" year={p2Year} month={p2Month} onYear={setP2Year} onMonth={setP2Month} years={years} />
            <Select value={p2FinancialYear} onValueChange={setP2FinancialYear}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Financial Year: None</SelectItem>{financialYears.map(fy => <SelectItem key={fy.value} value={fy.value}>FY {fy.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <Select value={year} onValueChange={v => setYear(v)}>
              <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{MONTH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={financialYear} onValueChange={setFinancialYear}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">Financial Year: None</SelectItem>{financialYears.map(fy => <SelectItem key={fy.value} value={fy.value}>FY {fy.label}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => load(year, month)} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        )}
        <Button
          variant={compareMode ? "default" : "outline"}
          size="sm"
          className="ml-auto gap-1.5"
          onClick={() => {
            setCompareMode(v => !v);
            if (!compareMode && !data2) loadP2(p2Year, p2Month);
          }}
        >
          <ArrowLeftRight className="size-3.5" />
          {compareMode ? "Exit Compare" : "Compare"}
        </Button>
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

      {/* ── Compare mode output ── */}
      {compareMode && (
        <div className="space-y-4">
          {loading || loading2 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : !stats || !stats2 ? (
            <p className="rounded-xl bg-muted px-4 py-8 text-center text-sm text-muted-foreground">No data for one or both periods.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />Period 1: <strong>{p1Label}</strong></span>
                <span>vs</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-green-500" />Period 2: <strong>{p2Label}</strong></span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="surface-card p-4">
                  <p className="text-xs text-muted-foreground mb-2">Trips Closed</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><p className="text-[10px] text-muted-foreground">{p1Label}</p><p className="text-sm font-bold">{stats.count}</p></div>
                    <div><p className="text-[10px] text-muted-foreground">{p2Label}</p><p className="text-sm font-bold">{stats2.count}</p></div>
                  </div>
                </div>
                <CompareCard label="Total Income"  val1={stats.totalIncome}  val2={stats2.totalIncome}  label1={p1Label} label2={p2Label} />
                <CompareCard label="Total Expense" val1={stats.totalExpense} val2={stats2.totalExpense} label1={p1Label} label2={p2Label} />
                <CompareCard label="Net Income"    val1={stats.netIncome}    val2={stats2.netIncome}    label1={p1Label} label2={p2Label} />
              </div>
              {/* Comparison monthly chart */}
              {monthlyData.length > 0 && monthlyData2.length > 0 && (
                <div className="surface-card p-5">
                  <h3 className="mb-4 text-sm font-semibold tracking-tight">Monthly Income — {p1Label} vs {p2Label}</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={monthlyData.map((m, i) => ({ month: m.month, p1: m.income, p2: monthlyData2[i]?.income ?? 0 }))}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="p1" name={p1Label} fill="hsl(var(--primary))" radius={[2,2,0,0]} />
                      <Bar dataKey="p2" name={p2Label} fill="#22c55e" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Single-period output ── */}
      {!compareMode && (
        <>
          {!stats || stats.count === 0 ? (
            <p className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              No closed trips found for this period.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="surface-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">Trips Closed</p>
                  <p className="mt-1 text-2xl font-bold">{stats.count}</p>
                </div>
                <KpiCard label="Total Income"  value={stats.totalIncome} />
                <KpiCard label="Total Expense" value={stats.totalExpense} />
                <KpiCard label="Net Income"    value={stats.netIncome} positive />
              </div>

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
                      <Bar dataKey="income"  name="Income"  fill="#22c55e" radius={[2,2,0,0]} />
                      <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[2,2,0,0]} />
                      <Bar dataKey="net"     name="Net"     fill="#3b82f6" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {branchStats.length > 1 && (
                <div className="surface-card p-5">
                  <h3 className="mb-4 text-sm font-semibold tracking-tight">Branch Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wide">
                          <th className="px-3 py-2 text-left">Branch</th>
                          <th className="px-3 py-2 text-right">Trips</th>
                          <th className="px-3 py-2 text-right">Income</th>
                          <th className="px-3 py-2 text-right">Expense</th>
                          <th className="px-3 py-2 text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {branchStats.map(b => (
                          <tr key={b.id} className="border-b border-border/60">
                            <td className="px-3 py-2 font-medium flex items-center gap-2">
                              <span className="size-2.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: b.color }} />
                              {b.name}
                            </td>
                            <td className="px-3 py-2 text-right">{b.count}</td>
                            <td className="px-3 py-2 text-right">{inr(b.income)}</td>
                            <td className="px-3 py-2 text-right text-red-600 dark:text-red-400">{inr(b.expense)}</td>
                            <td className={`px-3 py-2 text-right font-semibold ${b.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>{inr(b.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {pieData.length > 1 && (
                <div className="surface-card p-5">
                  <h3 className="mb-4 text-sm font-semibold tracking-tight">Branch Income Distribution</h3>
                  <div className="flex flex-wrap items-center gap-6">
                    <PieChart width={200} height={200}>
                      <Pie data={pieData} cx={95} cy={95} innerRadius={50} outerRadius={88} paddingAngle={2} dataKey="income">
                        {pieData.map((d) => <Cell key={d.id} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                    <div className="space-y-1.5 flex-1">
                      {pieData.map(d => {
                        const total = pieData.reduce((s, p) => s + p.income, 0);
                        const pct   = total > 0 ? ((d.income / total) * 100).toFixed(1) : "0";
                        return (
                          <div key={d.id} className="flex items-center gap-2 text-sm">
                            <span className="size-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="flex-1 text-muted-foreground">{d.name}</span>
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                            <span className="font-medium shrink-0">{inr(d.income)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

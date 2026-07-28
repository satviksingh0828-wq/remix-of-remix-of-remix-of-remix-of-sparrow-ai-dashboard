/**
 * EntityPnLPanel — Dashboard panel for Vehicles / Drivers / Transporters.
 * All + individual sub-tabs, month filter, stats cards, charts, pie distribution.
 */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  serverFetchPnLYear, serverFetchPnLPeriod,
  computePnLForEntity, computeMonthlyPnLForEntity,
  type PnLRawData, type PnLStats, type EntityKind,
  type PnLVehicle, type PnLDriver, type PnLTransporter,
} from "@/lib/pnl";
import { inr } from "@/lib/trip-calc";

const MONTH_OPTIONS = [
  { value: "0",  label: "All Year" },
  { value: "1",  label: "January" },  { value: "2",  label: "February" },
  { value: "3",  label: "March" },    { value: "4",  label: "April" },
  { value: "5",  label: "May" },      { value: "6",  label: "June" },
  { value: "7",  label: "July" },     { value: "8",  label: "August" },
  { value: "9",  label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
];

const PIE_COLORS = ["#22c55e","#3b82f6","#8b5cf6","#f97316","#ef4444","#06b6d4","#f59e0b","#ec4899","#84cc16","#14b8a6"];

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  const isPos = value >= 0;
  return (
    <div className="surface-card p-3 sm:p-4">
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      <p className={`mt-1 text-base sm:text-xl font-bold tracking-tight break-all ${
        highlight ? (isPos ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : "text-foreground"
      }`}>
        {inr(value)}
      </p>
    </div>
  );
}

function fmt(v: number) {
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
}

type LeaderRow = { id: string; label: string; stats: PnLStats };

function Leaderboard({ rows, onSelect }: { rows: LeaderRow[]; onSelect: (id: string) => void }) {
  const sorted = [...rows].sort((a, b) => b.stats.netPnL - a.stats.netPnL);
  return (
    <div className="surface-card overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2 text-right">Trips</th>
            <th className="px-4 py-2 text-right">Income</th>
            <th className="px-4 py-2 text-right">Expense</th>
            <th className="px-4 py-2 text-right">Net P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20 cursor-pointer" onClick={() => onSelect(row.id)}>
              <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
              <td className="px-4 py-2 font-medium">{row.label}</td>
              <td className="px-4 py-2 text-right">{row.stats.tripCount}</td>
              <td className="px-4 py-2 text-right">{inr(row.stats.totalIncome)}</td>
              <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">{inr(row.stats.totalExpense)}</td>
              <td className={`px-4 py-2 text-right font-semibold ${row.stats.netPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {inr(row.stats.netPnL)}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No data for this period.</td></tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

type Props = { kind: EntityKind };

const LABELS: Record<EntityKind, { singular: string; plural: string; allLabel: string }> = {
  vehicle:     { singular: "Vehicle",     plural: "Vehicles",     allLabel: "All Vehicles" },
  driver:      { singular: "Driver",      plural: "Drivers",      allLabel: "All Drivers" },
  transporter: { singular: "Transporter", plural: "Transporters", allLabel: "All Transporters" },
};

export function EntityPnLPanel({ kind }: Props) {
  const meta = LABELS[kind];
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - 3 + i), [currentYear]);

  const [year, setYear]       = useState(String(currentYear));
  const [month, setMonth]     = useState("0");
  const [data, setData]       = useState<PnLRawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [search, setSearch]   = useState("");

  async function load(y: string, m: string) {
    setLoading(true);
    try {
      const mn = Number(m);
      const result = mn > 0
        ? await serverFetchPnLPeriod({ data: { period: { year: Number(y), month: mn } } })
        : await serverFetchPnLYear({ data: { year: Number(y) } });
      setData(result);
      setEntityId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load data");
    }
    setLoading(false);
  }

  useEffect(() => { load(year, month); }, [year, month]);

  const entities: Array<PnLVehicle | PnLDriver | PnLTransporter> = useMemo(() => {
    if (!data) return [];
    if (kind === "vehicle") return data.vehicles;
    if (kind === "driver") return data.drivers;
    return data.transporters;
  }, [data, kind]);

  const filteredEntities = useMemo(
    () => entities.filter(e => e.label.toLowerCase().includes(search.toLowerCase())),
    [entities, search],
  );

  const stats = useMemo<PnLStats | null>(
    () => (data ? computePnLForEntity(data, kind, entityId) : null),
    [data, kind, entityId],
  );

  const monthlyData = useMemo(
    () => (data && Number(month) === 0 ? computeMonthlyPnLForEntity(data, kind, entityId) : []),
    [data, kind, entityId, month],
  );

  const leaderboard = useMemo<LeaderRow[]>(() => {
    if (!data) return [];
    return entities
      .map(e => ({ id: e.id, label: e.label, stats: computePnLForEntity(data, kind, e.id) }))
      .filter(r => r.stats.tripCount > 0 || r.stats.totalIncome > 0);
  }, [data, kind, entities]);

  // Pie chart: distribution of trip income across entities (All view only)
  const pieData = useMemo(() => {
    if (!data || entityId !== null) return [];
    return leaderboard
      .filter(r => r.stats.tripIncome > 0)
      .sort((a, b) => b.stats.tripIncome - a.stats.tripIncome)
      .slice(0, 10)
      .map((r, i) => ({ id: r.id, name: r.label, value: r.stats.tripIncome, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [data, entityId, leaderboard]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const selectedLabel = entityId ? entities.find(e => e.id === entityId)?.label ?? "" : meta.allLabel;
  const periodLabel   = Number(month) > 0
    ? `${MONTH_OPTIONS[Number(month)]?.label} ${year}`
    : year;

  return (
    <div className="animate-fade-up space-y-5">
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
        <Button variant="outline" size="sm" onClick={() => load(year, month)} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">
          {entities.length} {meta.plural.toLowerCase()} · {data?.closedTrips.length ?? 0} trips in {periodLabel}
        </span>
      </div>

      {/* Two-column: sidebar + content */}
      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={`Search ${meta.plural.toLowerCase()}…`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button type="button" onClick={() => setEntityId(null)}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              entityId === null ? "bg-primary text-primary-foreground font-medium" : "bg-muted hover:bg-muted/80 text-foreground"
            }`}>
            {meta.allLabel}
          </button>
          <div className="max-h-[480px] space-y-1 overflow-y-auto pr-0.5">
            {filteredEntities.map(e => (
              <button key={e.id} type="button" onClick={() => setEntityId(e.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  entityId === e.id ? "bg-primary/10 text-foreground font-medium ring-1 ring-primary" : "bg-muted/50 hover:bg-muted text-foreground"
                }`}>
                <span className="line-clamp-1">{e.label}</span>
              </button>
            ))}
            {filteredEntities.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No results for "{search}"</p>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="min-w-0 space-y-5">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{selectedLabel}</span>
            {entityId && (
              <button type="button" onClick={() => setEntityId(null)} className="text-xs text-muted-foreground hover:text-foreground">
                ✕ Clear
              </button>
            )}
          </div>

          {!stats || (stats.tripCount === 0 && stats.totalIncome === 0 && stats.totalExpense === 0) ? (
            <div className="rounded-xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">
              No trips or income records for <strong>{selectedLabel}</strong> in {periodLabel}.
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <StatCard label="Net P&L" value={stats.netPnL} highlight />
                <StatCard label="Trip Gross Profit" value={stats.tripGrossProfit} />
                <StatCard label="Other Income" value={stats.otherIncome} />
                <StatCard label="Total Expense" value={stats.totalExpense} />
                <div className="surface-card p-4 text-center">
                  <p className="text-xs text-muted-foreground">Trips Closed</p>
                  <p className="mt-1 text-xl font-bold">{stats.tripCount}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="surface-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Trip Income</p>
                  <p className="mt-0.5 text-sm font-semibold">{inr(stats.tripIncome)}</p>
                </div>
                <div className="surface-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Trip Expense</p>
                  <p className="mt-0.5 text-sm font-semibold text-red-600 dark:text-red-400">{inr(stats.tripExpense)}</p>
                </div>
                <div className="surface-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Expenditures</p>
                  <p className="mt-0.5 text-sm font-semibold text-red-600 dark:text-red-400">{inr(stats.totalExpenditure)}</p>
                </div>
                <div className="surface-card p-3 text-center">
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className={`mt-0.5 text-sm font-semibold ${stats.totalIncome > 0 ? (stats.netPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : ""}`}>
                    {stats.totalIncome > 0 ? `${((stats.netPnL / stats.totalIncome) * 100).toFixed(1)}%` : "—"}
                  </p>
                </div>
              </div>

              {/* Monthly chart (all year only) */}
              {monthlyData.length > 0 && (
                <div className="surface-card p-5">
                  <h3 className="mb-4 text-sm font-semibold tracking-tight">Monthly Trend — {year}</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="tripIncome" name="Trip Income" fill="#22c55e" radius={[2,2,0,0]} />
                      <Bar dataKey="otherIncome" name="Other Income" fill="#3b82f6" radius={[2,2,0,0]} />
                      <Bar dataKey="expenditures" name="Expenses" fill="#ef4444" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Net P&L chart (all year only) */}
              {monthlyData.length > 0 && (
                <div className="surface-card p-5">
                  <h3 className="mb-4 text-sm font-semibold tracking-tight">Net P&amp;L by Month</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="netPnL" name="Net P&L" fill="#f59e0b" radius={[2,2,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          )}

          {/* Pie + Leaderboard — "All" view only */}
          {entityId === null && leaderboard.length > 0 && (
            <>
              {/* Pie distribution */}
              {pieData.length > 0 && (
                <div className="surface-card p-5">
                  <h3 className="mb-4 text-sm font-semibold tracking-tight">Trip Income Distribution — {meta.plural}</h3>
                  <div className="flex flex-wrap items-center gap-8">
                    <PieChart width={240} height={240}>
                      <Pie data={pieData} cx={115} cy={115} innerRadius={60} outerRadius={105} paddingAngle={2} dataKey="value">
                        {pieData.map((d, i) => <Cell key={d.id} fill={d.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {pieData.map(d => {
                        const total = pieData.reduce((s, p) => s + p.value, 0);
                        const pct   = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                        return (
                          <div key={d.id} className="flex items-center gap-2 text-sm">
                            <span className="size-3 rounded-sm shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="truncate text-muted-foreground flex-1">{d.name}</span>
                            <span className="text-xs text-muted-foreground">{pct}%</span>
                            <span className="font-medium shrink-0">{inr(d.value)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Leaderboard */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold tracking-tight">{meta.plural} Leaderboard — {periodLabel}</h3>
                <Leaderboard rows={leaderboard} onSelect={id => setEntityId(id)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

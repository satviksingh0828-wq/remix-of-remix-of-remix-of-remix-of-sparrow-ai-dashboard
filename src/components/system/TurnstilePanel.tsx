/**
 * Turnstile Panel – System page Tab 5
 * Cloudflare Turnstile CAPTCHA analytics:
 * tokens issued, solved, failed, solve rate, daily trend chart.
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Shield,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { serverGetTurnstileStats, type TurnstileStats } from "@/lib/system";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "amber" | "red" | "blue";
}) {
  const accentMap = {
    green: "text-emerald-500",
    amber: "text-amber-500",
    red:   "text-destructive",
    blue:  "text-primary",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`size-4 ${accent ? accentMap[accent] : ""}`} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Setup guide shown when env vars are missing ────────────────────────────────

function SetupGuide({ accountIdPresent, apiTokenPresent }: { accountIdPresent: boolean; apiTokenPresent: boolean }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Cloudflare credentials not configured</p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Add the two environment variables below to Vercel (or your local <code className="rounded bg-amber-100 dark:bg-amber-900/30 px-1 text-xs">.env</code>) to enable Turnstile analytics.
            </p>
          </div>
        </div>
      </div>

      {/* Env var checklist */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Required environment variables</h3>
        {[
          {
            key:     "CF_ACCOUNT_ID",
            done:    accountIdPresent,
            label:   "Cloudflare Account ID",
            where:   "Cloudflare Dashboard → right sidebar (any page)",
            example: "a1b2c3d4e5f6...",
          },
          {
            key:     "CF_API_TOKEN",
            done:    apiTokenPresent,
            label:   "Cloudflare API Token",
            where:   "dash.cloudflare.com/profile/api-tokens → Create Token → use template 'Read all resources' or custom with Account > Turnstile > Edit + Account Analytics > Read",
            example: "abc123...",
          },
        ].map(v => (
          <div key={v.key} className={`rounded-xl border p-4 ${v.done ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800" : "border-border bg-card"}`}>
            <div className="flex items-center gap-2 mb-1">
              {v.done
                ? <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                : <XCircle     className="size-4 text-muted-foreground shrink-0" />
              }
              <code className="text-sm font-mono font-semibold">{v.key}</code>
              {v.done && <Badge variant="secondary" className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30">Configured ✓</Badge>}
            </div>
            <p className="text-xs text-muted-foreground ml-6">{v.label}</p>
            <p className="text-xs text-muted-foreground ml-6 mt-0.5"><span className="font-medium">Where to find: </span>{v.where}</p>
            {!v.done && (
              <p className="text-xs text-muted-foreground ml-6 mt-0.5">
                <span className="font-medium">Example: </span>
                <code className="rounded bg-muted px-1">{v.example}</code>
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Step-by-step */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          How to obtain these values
        </h3>
        <ol className="space-y-3 text-sm text-muted-foreground list-none">
          {[
            <>Log in at <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-0.5 hover:underline">dash.cloudflare.com <ExternalLink className="size-3" /></a>.</>,
            <>Copy your <strong className="text-foreground">Account ID</strong> from the right sidebar — this is <code className="rounded bg-muted px-1 text-xs">CF_ACCOUNT_ID</code>.</>,
            <>Go to <strong className="text-foreground">My Profile → API Tokens → Create Token</strong>.</>,
            <>Choose the <strong className="text-foreground">"Read all resources"</strong> template, or create a custom token with:<br />
              <span className="ml-4 block mt-1">• <em>Account &gt; Turnstile &gt; Edit</em></span>
              <span className="ml-4 block">• <em>Account &gt; Account Analytics &gt; Read</em></span>
            </>,
            <>Copy the generated token — this is <code className="rounded bg-muted px-1 text-xs">CF_API_TOKEN</code>.</>,
            <>Add both to <strong className="text-foreground">Vercel → Project → Settings → Environment Variables</strong>, mark scope <em>Production + Preview + Development</em>.</>,
            <>Redeploy (or restart locally) and refresh this panel.</>,
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-none flex items-center justify-center size-5 rounded-full bg-muted text-[11px] font-semibold text-foreground mt-0.5">{i + 1}</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ── Custom tooltip for recharts ────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card shadow-md px-3 py-2 text-xs space-y-1">
      <p className="font-medium text-foreground mb-1.5">{label ? fmtDate(label) : ""}</p>
      {payload.map(p => (
        <p key={p.name} className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-semibold tabular-nums">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TurnstilePanel() {
  const { user } = useSession();
  const [stats,   setStats]   = useState<TurnstileStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [days,    setDays]    = useState(30);

  async function load() {
    if (!user?.sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await serverGetTurnstileStats({ data: { sessionToken: user.sessionToken, days } });
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.sessionToken, days]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hard fetch error (server function itself crashed)
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">Failed to load Turnstile stats</p>
        <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-3.5" />Retry</Button>
      </div>
    );
  }

  // Env vars not configured — show setup guide
  if (stats && !stats.configured) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Cloudflare Turnstile CAPTCHA analytics.</p>
        </div>
        <SetupGuide accountIdPresent={stats.account_id_present} apiTokenPresent={stats.api_token_present} />
      </div>
    );
  }

  // Cloudflare API returned an error (wrong token, no data, etc.)
  const apiError = stats?.error;

  const chartData = (stats?.days ?? []).map(d => ({
    date:   d.date,
    Issued: d.issued,
    Solved: d.solved,
    Failed: d.failed,
  }));

  const solveRate  = stats?.solve_rate ?? 0;
  const rateColour = solveRate >= 90 ? "text-emerald-500" : solveRate >= 70 ? "text-amber-500" : "text-destructive";

  return (
    <div className="space-y-8">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Cloudflare Turnstile analytics via the GraphQL Analytics API.
          </p>
          {stats?.sitekey && (
            <Badge variant="secondary" className="font-mono text-[10px]">{stats.sitekey}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={days.toString()} onValueChange={v => setDays(Number(v))}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-9">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* API-level error (env vars present but API call failed) */}
      {!loading && apiError && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Cloudflare API error</p>
            <p className="mt-0.5 text-xs opacity-80">{apiError}</p>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Shield}       label="Tokens Issued" value={(stats?.total_issued ?? 0).toLocaleString()} sub={`Last ${days} days`} accent="blue" />
            <StatCard icon={ShieldCheck}  label="Tokens Solved" value={(stats?.total_solved ?? 0).toLocaleString()} accent="green" />
            <StatCard icon={XCircle}      label="Tokens Failed" value={(stats?.total_failed ?? 0).toLocaleString()} accent={stats && stats.total_failed > 0 ? "red" : "green"} />
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className={`size-4 ${rateColour}`} />
                <span className="text-xs font-medium uppercase tracking-wide">Solve Rate</span>
              </div>
              <p className={`mt-2 text-2xl font-semibold tabular-nums ${rateColour}`}>{solveRate}%</p>
              <p className="mt-0.5 text-xs text-muted-foreground">solved / issued</p>
            </div>
          </>
        )}
      </div>

      {/* Daily trend chart */}
      <div>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Daily Trend</h3>
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-40 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
            No data for the selected period.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIssued" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gSolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickFormatter={fmtDate}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
                <Area type="monotone" dataKey="Issued" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gIssued)" dot={false} />
                <Area type="monotone" dataKey="Solved" stroke="#10b981"              strokeWidth={2} fill="url(#gSolved)" dot={false} />
                <Area type="monotone" dataKey="Failed" stroke="#ef4444"              strokeWidth={2} fill="url(#gFailed)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Daily breakdown table — last 10 days */}
      {!loading && chartData.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Days</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Issued</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Solved</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Failed</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Solve Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...chartData].reverse().slice(0, 10).map(row => {
                  const rate = row.Issued > 0 ? Math.round((row.Solved / row.Issued) * 100) : 0;
                  const rateCol = rate >= 90 ? "text-emerald-600" : rate >= 70 ? "text-amber-600" : "text-destructive";
                  return (
                    <tr key={row.date} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{fmtDate(row.date)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">{row.Issued.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">{row.Solved.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-destructive">{row.Failed.toLocaleString()}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums font-semibold ${rateCol}`}>{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

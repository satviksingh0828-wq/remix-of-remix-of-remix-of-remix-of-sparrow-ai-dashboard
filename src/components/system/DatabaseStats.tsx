/**
 * Tab 2 – Database Stats
 * PostgreSQL system-view stats + Supabase Storage bucket list.
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Table2,
  Zap,
} from "lucide-react";
import { serverGetDbStats, type DbStats } from "@/lib/system";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ── Helpers ────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function DatabaseStats() {
  const { user } = useSession();
  const [stats,   setStats]   = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    if (!user?.sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await serverGetDbStats({ data: { sessionToken: user.sessionToken } });
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">Failed to load database stats</p>
        <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  const conn = stats?.connections?.[0];
  const cache = stats?.cache_hit?.[0];

  return (
    <div className="space-y-8">
      {/* Top row refresh */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Live stats from PostgreSQL system views.</p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))
        ) : (
          <>
            <StatCard icon={Database}  label="Database Size"    value={stats?.db_size ?? "—"} />
            <StatCard icon={Table2}    label="Tables (public)"  value={stats?.table_count ?? "—"} />
            <StatCard icon={Server}    label="Connections"      value={conn?.total ?? "—"} sub={`${conn?.active ?? 0} active · ${conn?.idle ?? 0} idle`} />
            <StatCard
              icon={Zap}
              label="Cache Hit"
              value={cache?.heap_hit_ratio != null ? `${cache.heap_hit_ratio}%` : "—"}
              sub={`Index: ${cache?.index_hit_ratio != null ? `${cache.index_hit_ratio}%` : "—"}`}
            />
          </>
        )}
      </div>

      {/* Largest Tables */}
      <div>
        <SectionTitle>Largest Tables</SectionTitle>
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Table</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Row Estimate</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Table Size</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Index Size</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(stats?.largest_tables ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No tables found.</td>
                    </tr>
                  ) : (
                    stats?.largest_tables.map((t, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{t.table_name}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{t.row_estimate.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{t.table_size}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{t.index_size}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{t.total_size}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Running Queries */}
      <div>
        <SectionTitle>Running Queries</SectionTitle>
        {loading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">PID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">State</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duration</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Wait</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Query</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(stats?.running_queries ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No active queries right now.</td>
                    </tr>
                  ) : (
                    stats?.running_queries.map((q, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{q.pid}</td>
                        <td className="px-4 py-3">
                          <Badge variant={q.state === "active" ? "default" : "secondary"} className="text-[10px]">
                            {q.state}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-xs">{q.duration_seconds}s</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{q.wait_event ?? "—"}</td>
                        <td className="px-4 py-3 font-mono text-[11px] max-w-xs truncate" title={q.query_snippet}>
                          {q.query_snippet}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Storage Buckets */}
      <div>
        <SectionTitle>Storage Buckets</SectionTitle>
        {stats?.storage_error && (
          <p className="mb-3 text-xs text-amber-600">
            <AlertTriangle className="mr-1 inline size-3" />
            Storage error: {stats.storage_error}
          </p>
        )}
        {loading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bucket</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visibility</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(stats?.storage_buckets ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      {loading ? "Loading…" : "No storage buckets found."}
                    </td>
                  </tr>
                ) : (
                  stats?.storage_buckets.map(b => (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <HardDrive className="size-3.5 text-muted-foreground" />
                          {b.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={b.public ? "default" : "secondary"} className="text-[10px]">
                          {b.public ? "Public" : "Private"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

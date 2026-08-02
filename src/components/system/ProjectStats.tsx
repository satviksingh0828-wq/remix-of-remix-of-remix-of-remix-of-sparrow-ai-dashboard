/**
 * Tab 3 – Project Stats
 * Displays Supabase project info from the Management API.
 * Requires SUPABASE_MANAGEMENT_TOKEN in Vercel env vars.
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Info,
  KeyRound,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { serverGetProjectStats, type ProjectStats } from "@/lib/system";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ── Helpers ────────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  link?: string;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-44">{label}</span>
      <span className={`text-sm text-right break-all ${mono ? "font-mono text-xs" : "font-medium"}`}>
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {value}
            <ExternalLink className="size-3" />
          </a>
        ) : value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok = ["ACTIVE_HEALTHY", "active", "healthy"].includes(status?.toLowerCase() ?? "");
  return (
    <Badge variant={ok ? "default" : "destructive"} className="gap-1 text-[11px]">
      {ok
        ? <CheckCircle2 className="size-3" />
        : <XCircle      className="size-3" />
      }
      {status}
    </Badge>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ProjectStats() {
  const { user } = useSession();
  const [stats,   setStats]   = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    if (!user?.sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await serverGetProjectStats({ data: { sessionToken: user.sessionToken } });
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const md = stats?.management_data as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Project details from Supabase environment and Management API.
        </p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Hard error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" onClick={load} className="ml-auto">Retry</Button>
        </div>
      )}

      {/* Management token missing banner */}
      {!loading && stats && !stats.has_management_token && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 px-5 py-4">
          <div className="flex items-start gap-3">
            <KeyRound className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Management API token not configured
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                Extended project stats (region, Postgres version, backup status, PITR, etc.) require
                a Supabase Personal Access Token. Add it to your Vercel project as:
              </p>
              <code className="mt-1 inline-block rounded bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-mono text-amber-900 dark:text-amber-200">
                SUPABASE_MANAGEMENT_TOKEN
              </code>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                Get your token at{" "}
                <a
                  href="https://supabase.com/dashboard/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  supabase.com/dashboard/account/tokens
                  <ExternalLink className="inline ml-0.5 size-3" />
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Soft management error (token exists but API failed) */}
      {!loading && stats?.has_management_token && stats.management_error && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Info className="size-4 shrink-0" />
          Management API: {stats.management_error}
        </div>
      )}

      {/* Basic info from env — always available */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Environment-derived */}
          <section>
            <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <Globe className="size-4 text-muted-foreground" />
              Connection Info
            </h3>
            <div className="rounded-xl border border-border bg-card px-5 divide-y divide-border">
              <InfoRow label="API URL"       value={stats.supabase_url}  mono link={stats.supabase_url} />
              <InfoRow label="Project Ref"   value={stats.project_ref}   mono />
            </div>
          </section>

          {/* Management API data */}
          {md && (
            <>
              <section>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <Server className="size-4 text-muted-foreground" />
                  Project Details
                </h3>
                <div className="rounded-xl border border-border bg-card px-5 divide-y divide-border">
                  <InfoRow label="Name"           value={md.name as string} />
                  <InfoRow label="Organization"   value={(md.organization_id ?? md.organization) as string} />
                  <InfoRow label="Region"         value={md.region as string} />
                  <InfoRow label="Postgres"       value={md.db_version as string} mono />
                  <InfoRow label="Database Host"  value={md.db_host as string} mono />
                  <div className="flex items-start justify-between gap-4 py-3">
                    <span className="text-sm text-muted-foreground w-44 shrink-0">Status</span>
                    <span>
                      {md.status
                        ? <StatusBadge status={md.status as string} />
                        : <span className="text-sm text-muted-foreground">—</span>
                      }
                    </span>
                  </div>
                </div>
              </section>

              {/* SSL / Backup / PITR */}
              {(md.ssl_enforced != null || md.backup_enabled != null || md.pitr_enabled != null) && (
                <section>
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="size-4 text-muted-foreground" />
                    Security &amp; Reliability
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "SSL Enforced",     val: md.ssl_enforced    },
                      { label: "Backups Enabled",  val: md.backup_enabled  },
                      { label: "PITR Enabled",     val: md.pitr_enabled    },
                    ].map(({ label, val }) => val != null && (
                      <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                        {val
                          ? <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                          : <XCircle      className="size-5 text-muted-foreground shrink-0" />
                        }
                        <div>
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{val ? "Enabled" : "Disabled"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Raw extra fields (anything not shown above) */}
              {(() => {
                const shown = new Set(["name","organization_id","organization","region","db_version","db_host","status","ssl_enforced","backup_enabled","pitr_enabled","id","ref","inserted_at","updated_at"]);
                const extras = Object.entries(md).filter(([k]) => !shown.has(k));
                if (extras.length === 0) return null;
                return (
                  <section>
                    <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Additional Fields</h3>
                    <div className="rounded-xl border border-border bg-card px-5 divide-y divide-border">
                      {extras.map(([k, v]) => (
                        <InfoRow key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v ?? "—")} mono />
                      ))}
                    </div>
                  </section>
                );
              })()}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

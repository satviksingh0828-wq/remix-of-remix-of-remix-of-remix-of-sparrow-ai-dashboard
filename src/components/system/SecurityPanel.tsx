/**
 * Security Panel – System page Tab 3
 * Shows passkey device registrations, user account health,
 * active sessions, failed login attempts, and recent security events.
 */

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Fingerprint,
  KeyRound,
  LogIn,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { serverGetSecurityStats, type SecurityStats } from "@/lib/system";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTs(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
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
  value: string | number | null;
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
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value ?? "—"}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

function actionBadgeClass(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("fail") || a.includes("invalid") || a.includes("blocked"))
    return "bg-destructive/10 text-destructive border-destructive/20";
  if (a.includes("sign in") || a.includes("login") || a.includes("logged in"))
    return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300";
  if (a.includes("sign out") || a.includes("logout"))
    return "bg-slate-100 text-slate-600 border-slate-200";
  if (a.includes("paused") || a.includes("blocked"))
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (a.includes("device") || a.includes("passkey"))
    return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300";
  return "bg-muted text-muted-foreground border-border";
}

// ── Component ──────────────────────────────────────────────────────────────────

export function SecurityPanel() {
  const { user } = useSession();
  const [stats,   setStats]   = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function load() {
    if (!user?.sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await serverGetSecurityStats({ data: { sessionToken: user.sessionToken } });
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.sessionToken]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">Failed to load security stats</p>
        <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-3.5" />Retry
        </Button>
      </div>
    );
  }

  const u = stats?.users;
  const d = stats?.devices;
  const s = stats?.sessions;

  return (
    <div className="space-y-8">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Live security metrics from app_users, device_registrations, and app_logs.</p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={Users}      label="Total Users"       value={u?.total ?? "—"}           sub={`${u?.active ?? 0} active · ${u?.inactive ?? 0} inactive`} accent="blue" />
            <StatCard icon={Fingerprint} label="Devices"          value={d?.total ?? "—"}           sub={`${d?.pending ?? 0} pending approval`} accent={d && d.pending > 0 ? "amber" : "green"} />
            <StatCard icon={LogIn}      label="Active Sessions"   value={s?.active_sessions ?? "—"} accent="green" />
            <StatCard icon={ShieldAlert} label="Failed Attempts"  value={u?.with_failed_attempts ?? "—"} sub="accounts with ≥1 failed login" accent={u && u.with_failed_attempts > 0 ? "red" : "green"} />
          </>
        )}
      </div>

      {/* User account breakdown */}
      <div>
        <SectionTitle><Users className="size-3.5" />User Accounts</SectionTitle>
        {loading ? <Skeleton className="h-24 rounded-xl" /> : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Active",   value: u?.active   ?? 0, colour: "text-emerald-600" },
              { label: "Inactive", value: u?.inactive ?? 0, colour: "text-muted-foreground" },
              { label: "Paused",   value: u?.paused   ?? 0, colour: "text-amber-600" },
              { label: "Admins",   value: u?.admins   ?? 0, colour: "text-primary" },
              { label: "Basic",    value: u?.basic    ?? 0, colour: "text-foreground" },
              { label: "Viewers",  value: u?.viewers  ?? 0, colour: "text-foreground" },
            ].map(item => (
              <div key={item.label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                <p className={`text-2xl font-semibold tabular-nums ${item.colour}`}>{item.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Device / passkey registrations */}
      <div>
        <SectionTitle><Fingerprint className="size-3.5" />Passkey / Device Registrations</SectionTitle>
        {loading ? <Skeleton className="h-24 rounded-xl" /> : (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Pending Approval", value: d?.pending  ?? 0, icon: Clock,         colour: "text-amber-500",    bg: "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800" },
              { label: "Approved",         value: d?.approved ?? 0, icon: CheckCircle2,  colour: "text-emerald-500",  bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800" },
              { label: "Rejected",         value: d?.rejected ?? 0, icon: XCircle,       colour: "text-destructive",  bg: "bg-destructive/5 border-destructive/20" },
            ].map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`rounded-xl border px-5 py-4 ${item.bg}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`size-5 ${item.colour}`} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <p className={`mt-2 text-3xl font-bold tabular-nums ${item.colour}`}>{item.value}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Accounts with failed login attempts */}
      {!loading && (stats?.failed_users?.length ?? 0) > 0 && (
        <div>
          <SectionTitle><ShieldAlert className="size-3.5" />Accounts with Failed Login Attempts</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">Failed Attempts</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats?.failed_users.map(fu => (
                  <tr key={fu.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{fu.full_name || fu.username}</p>
                      {fu.full_name && <p className="text-xs text-muted-foreground">@{fu.username}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-[10px] capitalize">{fu.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        fu.failed_login_attempts >= 3
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      }`}>
                        {fu.failed_login_attempts}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {fu.is_paused ? (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                          <XCircle className="size-3.5" />Paused
                        </span>
                      ) : fu.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <ShieldAlert className="size-3.5" />At risk
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                          <XCircle className="size-3.5" />Inactive
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No failed attempts — green state */}
      {!loading && (stats?.failed_users?.length ?? 0) === 0 && stats && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800 px-5 py-4">
          <ShieldCheck className="size-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">No failed login attempts</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">All accounts have a clean login history.</p>
          </div>
        </div>
      )}

      {/* Recent security events */}
      <div>
        <SectionTitle><Shield className="size-3.5" />Recent Security Events</SectionTitle>
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Time</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">User</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Event</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(stats?.recent_events ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                        No security events logged yet.
                      </td>
                    </tr>
                  ) : (
                    stats?.recent_events.map(ev => (
                      <tr key={ev.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                          {fmtTs(ev.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-1.5">
                            <KeyRound className="size-3 text-muted-foreground shrink-0" />
                            {ev.username}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${actionBadgeClass(ev.action)}`}>
                            {ev.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                          {Object.entries(ev.details ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
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
    </div>
  );
}

/**
 * Tab 1 – Error Panel
 * Detects and bulk-fixes timestamp inconsistencies in closed_trips.
 * All filtering, counting, and updating runs server-side via Supabase RPCs.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  serverGetClosedTripErrors,
  serverFixTripTimestamps,
  type ClosedTripError,
} from "@/lib/system";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Constants ──────────────────────────────────────────────────────────────────

const MONTHS = [
  { value: 1,  label: "January"   },
  { value: 2,  label: "February"  },
  { value: 3,  label: "March"     },
  { value: 4,  label: "April"     },
  { value: 5,  label: "May"       },
  { value: 6,  label: "June"      },
  { value: 7,  label: "July"      },
  { value: 8,  label: "August"    },
  { value: 9,  label: "September" },
  { value: 10, label: "October"   },
  { value: 11, label: "November"  },
  { value: 12, label: "December"  },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR - i);

const PAGE_SIZE = 50;

type DateSource = "closed_at" | "start_date";
type ErrorTypeFilter = "all" | "start_mismatch";

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(val: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtTs(val: string | null): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function ErrorBadge({ type }: { type: string }) {
  const colours: Record<string, string> = {
    "Start mismatch": "bg-amber-100 text-amber-700 border-amber-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${colours[type] ?? "bg-muted text-muted-foreground border-border"}`}>
      <AlertTriangle className="size-3" />
      {type}
    </span>
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ErrorPanel() {
  const { user } = useSession();

  // Filters
  const [search,     setSearch]     = useState("");
  const [month,      setMonth]      = useState<number | undefined>();
  const [year,       setYear]       = useState<number | undefined>();
  const [dateSource, setDateSource] = useState<DateSource>("closed_at");
  const [page,       setPage]       = useState(0);

  // Data
  const [rows,    setRows]    = useState<ClosedTripError[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const total = rows[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Fix dialog
  const [fixDialog, setFixDialog] = useState<"start" | "end" | null>(null);
  const [fixing,    setFixing]    = useState(false);

  const load = useCallback(async () => {
    if (!user?.sessionToken) return;
    setLoading(true);
    setError(null);
    setSelected(new Set());
    try {
      const data = await serverGetClosedTripErrors({
        data: {
          sessionToken: user.sessionToken,
          search:       search || undefined,
          month,
          year,
          dateSource,
          limit:        PAGE_SIZE,
          offset:       page * PAGE_SIZE,
        },
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [user?.id, search, month, year, dateSource, page]);

  // Reload whenever filters change (reset to page 0)
  useEffect(() => {
    setPage(0);
  }, [search, month, year, dateSource]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleFix(useStartDate: boolean) {
    if (!user?.sessionToken || selected.size === 0) return;
    setFixing(true);
    try {
      const count = await serverFixTripTimestamps({
        data: {
          sessionToken: user.sessionToken,
          tripIds:      Array.from(selected),
          useStartDate,
        },
      });
      toast.success(`Fixed ${count} trip${count !== 1 ? "s" : ""} successfully.`);
      setFixDialog(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setFixing(false);
    }
  }

  function toggleRow(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map(r => r.id)));
    }
  }

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && selected.size < rows.length;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search trip code or branch…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-64"
        />

        <Select
          value={month?.toString() ?? "all"}
          onValueChange={v => setMonth(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {MONTHS.map(m => (
              <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={year?.toString() ?? "all"}
          onValueChange={v => setYear(v === "all" ? undefined : Number(v))}
        >
          <SelectTrigger className="h-9 w-28">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {YEARS.map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateSource} onValueChange={v => setDateSource(v as DateSource)}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="closed_at">Filter by closed_at</SelectItem>
            <SelectItem value="start_date">Filter by Start Date</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="h-9">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Bulk actions — visible only when rows are selected */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <CheckSquare className="size-4 text-primary shrink-0" />
          <span className="text-sm font-medium">{selected.size} trip{selected.size !== 1 ? "s" : ""} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFixDialog("start")}
              disabled={fixing}
            >
              <Wrench className="size-3.5" />
              Fix using Start Date
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFixDialog("end")}
              disabled={fixing}
            >
              <Wrench className="size-3.5" />
              Fix using End Date
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              disabled={fixing}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" onClick={load} className="ml-auto shrink-0">Retry</Button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    ref={el => { if (el) (el as HTMLButtonElement).indeterminate = someSelected; }}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Trip Code</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Branch</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Start Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">End Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">closed_at</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">created_at</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">updated_at</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    {error ? "Failed to load data." : "No timestamp errors found — all trips look clean."}
                  </td>
                </tr>
              ) : (
                rows.map(row => (
                  <tr
                    key={row.id}
                    className={`transition-colors hover:bg-muted/30 ${selected.has(row.id) ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(row.id)}
                        onCheckedChange={() => toggleRow(row.id)}
                        aria-label={`Select ${row.trip_code}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium">{row.trip_code ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.branch_name ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums">{fmt(row.start_date)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmt(row.end_date)}</td>
                    <td className="px-4 py-3 tabular-nums">{fmtTs(row.closed_at)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtTs(row.created_at)}</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{fmtTs(row.updated_at)}</td>
                    <td className="px-4 py-3"><ErrorBadge type={row.error_type} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()} error trips
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="px-2 text-xs">Page {page + 1} / {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={fixDialog !== null} onOpenChange={open => { if (!open) setFixDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fix {selected.size} trip{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set <code className="rounded bg-muted px-1 py-0.5 text-xs">closed_at</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">created_at</code>, and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">updated_at</code> to the trip's{" "}
              <strong>{fixDialog === "start" ? "Start Date" : "End Date"}</strong> for all {selected.size} selected trip{selected.size !== 1 ? "s" : ""}.
              This operation runs directly in Supabase and cannot be undone automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={fixing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleFix(fixDialog === "start")}
              disabled={fixing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {fixing ? "Fixing…" : `Fix using ${fixDialog === "start" ? "Start" : "End"} Date`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, RefreshCw, Save, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/session";
import {
  serverFixMissingEndDates,
  serverGetCorrectionTrips,
  serverUpdateCorrectionManifest,
  type CorrectionTrip,
} from "@/lib/system";
import { inr } from "@/lib/trip-calc";

type Purpose = "missing_end_date" | "freight";

function dateLabel(value: string | null) {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date
        .toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
        .replace(/ /g, "-");
}

export function CorrectionPanel() {
  const { user } = useSession();
  const [purpose, setPurpose] = useState<Purpose>("missing_end_date");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<CorrectionTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [daysAfterStart, setDaysAfterStart] = useState<"1" | "2">("1");

  const load = useCallback(async () => {
    if (!user?.sessionToken) return;
    setLoading(true);
    try {
      setRows(
        await serverGetCorrectionTrips({
          data: { sessionToken: user.sessionToken, purpose, search },
        }),
      );
      setSelected(new Set());
      setExpanded(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load corrections");
    } finally {
      setLoading(false);
    }
  }, [purpose, search, user?.sessionToken]);

  useEffect(() => {
    load();
  }, [load]);

  async function fixEndDates() {
    if (!user?.sessionToken || selected.size === 0) return;
    try {
      const count = await serverFixMissingEndDates({
        data: {
          sessionToken: user.sessionToken,
          tripIds: [...selected],
          daysAfterStart: Number(daysAfterStart) as 1 | 2,
        },
      });
      toast.success(`Corrected ${count} trip end date${count === 1 ? "" : "s"}.`);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not correct end dates");
    }
  }

  async function saveManifest(tripId: string, manifestIndex: number) {
    if (!user?.sessionToken) return;
    const freight = Number(
      (document.getElementById(`freight-${tripId}-${manifestIndex}`) as HTMLInputElement)?.value ??
        0,
    );
    const loadingCharge = Number(
      (document.getElementById(`loading-${tripId}-${manifestIndex}`) as HTMLInputElement)?.value ??
        0,
    );
    try {
      await serverUpdateCorrectionManifest({
        data: {
          sessionToken: user.sessionToken,
          tripId,
          manifestIndex,
          freight,
          loading: loadingCharge,
        },
      });
      toast.success("Manifest charges and trip totals were corrected.");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update manifest charges");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <Select value={purpose} onValueChange={(value) => setPurpose(value as Purpose)}>
          <SelectTrigger className="h-9 w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="missing_end_date">Fix missing End Date</SelectItem>
            <SelectItem value="freight">Fix Freight / Loading</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="h-9 w-64"
          placeholder="Search trip or branch…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="outline" size="sm" className="h-9" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
        {purpose === "missing_end_date" && selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={daysAfterStart}
              onValueChange={(value) => setDaysAfterStart(value as "1" | "2")}
            >
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Start Date + 1 day</SelectItem>
                <SelectItem value="2">Start Date + 2 days</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-9" onClick={fixEndDates}>
              <Wrench className="size-4" /> Correct {selected.size}
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          No records need this correction.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="w-12 px-4 py-3" />
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Trip Type</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                {purpose === "freight" && (
                  <th className="px-4 py-3 text-right">Affected Manifests</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const open = expanded === row.id;
                return (
                  <>
                    <tr key={row.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {purpose === "missing_end_date" ? (
                          <Checkbox
                            checked={selected.has(row.id)}
                            onCheckedChange={() =>
                              setSelected((current) => {
                                const next = new Set(current);
                                if (next.has(row.id)) next.delete(row.id);
                                else next.add(row.id);
                                return next;
                              })
                            }
                          />
                        ) : (
                          <button type="button" onClick={() => setExpanded(open ? null : row.id)}>
                            {open ? (
                              <ChevronDown className="size-4" />
                            ) : (
                              <ChevronRight className="size-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">{row.trip_code}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.branch_name || "—"}</td>
                      <td className="px-4 py-3 capitalize">{row.ownership}</td>
                      <td className="px-4 py-3">{dateLabel(row.start_date)}</td>
                      <td className="px-4 py-3">{dateLabel(row.end_date)}</td>
                      {purpose === "freight" && (
                        <td className="px-4 py-3 text-right">{row.manifests.length}</td>
                      )}
                    </tr>
                    {purpose === "freight" && open && (
                      <tr key={`${row.id}-detail`}>
                        <td colSpan={7} className="bg-muted/10 p-5">
                          <div className="mb-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-border bg-card p-3">
                              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                Other Income
                              </p>
                              {row.other_income.length ? (
                                row.other_income.map((item, index) => (
                                  <div key={index} className="flex justify-between text-xs">
                                    <span>{item.type}</span>
                                    <span>{inr(item.amount)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                            <div className="rounded-lg border border-border bg-card p-3">
                              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                                Trip Expenses
                              </p>
                              {row.expenses.length ? (
                                row.expenses.map((item, index) => (
                                  <div key={index} className="flex justify-between text-xs">
                                    <span>{item.type}</span>
                                    <span>{inr(item.amount)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {row.manifests.map((manifest) => (
                              <div
                                key={manifest.index}
                                className="grid items-end gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_140px_140px_auto]"
                              >
                                <div>
                                  <p className="font-medium">
                                    {manifest.manifest_number || `Manifest ${manifest.index + 1}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {dateLabel(manifest.manifest_date)} ·{" "}
                                    {manifest.from_location || "—"} → {manifest.to_location || "—"}{" "}
                                    · Fixed {inr(manifest.fixed)}
                                  </p>
                                </div>
                                <label className="text-xs text-muted-foreground">
                                  Freight
                                  <Input
                                    id={`freight-${row.id}-${manifest.index}`}
                                    type="number"
                                    min="0"
                                    defaultValue={manifest.freight}
                                    className="mt-1 h-9"
                                  />
                                </label>
                                <label className="text-xs text-muted-foreground">
                                  Loading Charge
                                  <Input
                                    id={`loading-${row.id}-${manifest.index}`}
                                    type="number"
                                    min="0"
                                    defaultValue={manifest.loading}
                                    className="mt-1 h-9"
                                  />
                                </label>
                                <Button
                                  size="sm"
                                  onClick={() => saveManifest(row.id, manifest.index)}
                                >
                                  <Save className="size-4" /> Save
                                </Button>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

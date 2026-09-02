import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { ChevronDown, ChevronRight, Download, RefreshCw, Save, Upload, Wrench } from "lucide-react";
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
  serverLoadCorrectionManifestCharges,
  serverUpdateCorrectionManifest,
  serverUpdateCorrectionManifestDates,
  type CorrectionTrip,
} from "@/lib/system";
import { inr } from "@/lib/trip-calc";

type Purpose = "missing_end_date" | "freight" | "missing_manifest_date";

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
  const [loadingManifest, setLoadingManifest] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

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

  async function loadManifestCharges(
    tripId: string,
    manifestIndex: number,
    manifestNumber: string,
  ) {
    if (!user?.sessionToken) return;
    const key = `${tripId}-${manifestIndex}`;
    setLoadingManifest(key);
    try {
      const charges = await serverLoadCorrectionManifestCharges({
        data: { sessionToken: user.sessionToken, tripId, manifestIndex, manifestNumber },
      });
      const freightInput = document.getElementById(
        `freight-${tripId}-${manifestIndex}`,
      ) as HTMLInputElement | null;
      const loadingInput = document.getElementById(
        `loading-${tripId}-${manifestIndex}`,
      ) as HTMLInputElement | null;
      if (freightInput) freightInput.value = String(charges.freight);
      if (loadingInput) loadingInput.value = String(charges.loading);
      toast.success("Loaded matching source/contract charges. Click Save to apply them.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load manifest charges");
    } finally {
      setLoadingManifest(null);
    }
  }

  async function saveManifestDate(tripId: string, manifestIndex: number, manifestNumber: string) {
    if (!user?.sessionToken) return;
    const manifestDate = (
      document.getElementById(`manifest-date-${tripId}-${manifestIndex}`) as HTMLInputElement
    )?.value;
    if (!manifestDate) {
      toast.error("Enter a manifest date before saving.");
      return;
    }
    try {
      await serverUpdateCorrectionManifestDates({
        data: {
          sessionToken: user.sessionToken,
          corrections: [{ tripId, manifestIndex, manifestNumber, manifestDate }],
        },
      });
      toast.success("Manifest date was saved in the closed trip.");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the manifest date");
    }
  }

  function downloadManifestDateTemplate() {
    const records = rows.flatMap((trip) =>
      trip.manifests
        .filter((manifest) => !manifest.manifest_date)
        .map((manifest) => ({
          "Trip Code": trip.trip_code,
          "Manifest Number": manifest.manifest_number,
          "Manifest Date (YYYY-MM-DD)": "",
        })),
    );
    const sheet = XLSX.utils.json_to_sheet(records);
    sheet["!cols"] = [{ wch: 22 }, { wch: 24 }, { wch: 30 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Missing Manifest Dates");
    XLSX.writeFile(workbook, "missing-manifest-date-template.xlsx");
  }

  async function importManifestDates(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user?.sessionToken) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) throw new Error("The workbook does not contain a worksheet.");
      const imported = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: "",
        raw: false,
        dateNF: "yyyy-mm-dd",
      });
      const normalize = (value: unknown) => String(value ?? "").trim();
      const missing = rows.flatMap((trip) =>
        trip.manifests
          .filter((manifest) => !manifest.manifest_date)
          .map((manifest) => ({ trip, manifest })),
      );
      const corrections = imported.flatMap((record, rowIndex) => {
        const tripCode = normalize(record["Trip Code"] ?? record.trip_code);
        const manifestNumber = normalize(record["Manifest Number"] ?? record.manifest_number);
        const manifestDate = normalize(
          record["Manifest Date (YYYY-MM-DD)"] ?? record["Manifest Date"] ?? record.manifest_date,
        ).slice(0, 10);
        if (!manifestNumber && !manifestDate) return [];
        if (!manifestNumber || !/^\d{4}-\d{2}-\d{2}$/.test(manifestDate)) {
          throw new Error(`Row ${rowIndex + 2}: enter a manifest number and date as YYYY-MM-DD.`);
        }
        const matches = missing.filter(
          ({ trip, manifest }) =>
            manifest.manifest_number === manifestNumber &&
            (!tripCode || trip.trip_code === tripCode),
        );
        if (matches.length !== 1) {
          throw new Error(
            `Row ${rowIndex + 2}: ${matches.length ? "manifest number is duplicated; include Trip Code" : "manifest was not found among the missing dates"}.`,
          );
        }
        const [{ trip, manifest }] = matches;
        return [
          {
            tripId: trip.id,
            manifestIndex: manifest.index,
            manifestNumber: manifest.manifest_number,
            manifestDate,
          },
        ];
      });
      if (!corrections.length) throw new Error("No manifest dates were found in the worksheet.");
      const count = await serverUpdateCorrectionManifestDates({
        data: { sessionToken: user.sessionToken, corrections },
      });
      toast.success(`Imported ${count} manifest date${count === 1 ? "" : "s"}.`);
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import manifest dates");
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
            <SelectItem value="missing_manifest_date">Fix missing Manifest Date</SelectItem>
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
        {purpose === "missing_manifest_date" && (
          <div className="ml-auto flex items-center gap-2">
            <input
              ref={importInput}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={importManifestDates}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={downloadManifestDateTemplate}
            >
              <Download className="size-4" /> Download template
            </Button>
            <Button size="sm" className="h-9" onClick={() => importInput.current?.click()}>
              <Upload className="size-4" /> Import Excel
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
                {purpose !== "missing_end_date" && (
                  <th className="px-4 py-3 text-right">Affected Manifests</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const open = expanded === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr className="hover:bg-muted/30">
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
                      {purpose !== "missing_end_date" && (
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
                                className="grid items-end gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_140px_140px_auto_auto]"
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
                                  variant="outline"
                                  size="sm"
                                  disabled={loadingManifest === `${row.id}-${manifest.index}`}
                                  onClick={() =>
                                    loadManifestCharges(
                                      row.id,
                                      manifest.index,
                                      manifest.manifest_number,
                                    )
                                  }
                                >
                                  <RefreshCw
                                    className={`size-4 ${
                                      loadingManifest === `${row.id}-${manifest.index}`
                                        ? "animate-spin"
                                        : ""
                                    }`}
                                  />{" "}
                                  Load
                                </Button>
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
                    {purpose === "missing_manifest_date" && open && (
                      <tr>
                        <td colSpan={7} className="bg-muted/10 p-5">
                          <div className="space-y-2">
                            {row.manifests
                              .filter((manifest) => !manifest.manifest_date)
                              .map((manifest) => (
                                <div
                                  key={manifest.index}
                                  className="grid items-end gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-[1fr_200px_auto]"
                                >
                                  <div>
                                    <p className="font-medium">
                                      {manifest.manifest_number || `Manifest ${manifest.index + 1}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {manifest.from_location || "—"} →{" "}
                                      {manifest.to_location || "—"}
                                    </p>
                                  </div>
                                  <label className="text-xs text-muted-foreground">
                                    Manifest Date
                                    <Input
                                      id={`manifest-date-${row.id}-${manifest.index}`}
                                      type="date"
                                      className="mt-1 h-9"
                                    />
                                  </label>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      saveManifestDate(
                                        row.id,
                                        manifest.index,
                                        manifest.manifest_number,
                                      )
                                    }
                                  >
                                    <Save className="size-4" /> Save date
                                  </Button>
                                </div>
                              ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * ClosedTripDetail
 *
 * Inline (non-popup) read-only view of an archived trip snapshot.
 * Renders in place of the trips list — same pattern as TripForm for live trips.
 * All data comes from the frozen `snapshot` column; later master changes never
 * alter what is shown here.
 */

import { useEffect, useState } from "react";
import { Archive, ArrowLeft, Download, FileSpreadsheet, Loader2, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { inr, num } from "@/lib/trip-calc";
import { downloadCsv, toCsv } from "@/lib/csv";
import { reopenTrip } from "@/lib/reopen-trip";
import { useSession } from "@/lib/session";
import { fetchCompany, printTripNote } from "@/lib/trip-note-pdf";

// ── Snapshot shape (mirrors what closeTrip() writes) ──────────────────────────

type ManifestLine = {
  manifest: Record<string, unknown>;
  freight: number;
  loading: number;
  fixed: number;
  total: number;
};

type Totals = {
  manifest_income: number;
  other_income: number;
  total_income: number;
  total_expense: number;
  net_income: number;
};

type Snapshot = {
  trip: Record<string, unknown>;
  manifests: Record<string, unknown>[];
  manifest_lines: ManifestLine[];
  other_income: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  contract: Record<string, unknown> | null;
  contract_entries: unknown[];
  vehicle: Record<string, unknown> | null;
  driver: Record<string, unknown> | null;
  transporter: Record<string, unknown> | null;
  branch: Record<string, unknown> | null;
  totals: Totals;
  closed_at: string;
};

type FullClosedTrip = {
  id: string;
  trip_code: string;
  branch_name: string | null;
  start_date: string | null;
  end_date: string | null;
  net_income: number;
  closed_at: string;
  snapshot: Snapshot;
};

// ── Tabs ─────────────────────────────────────────────────────────────────────

const TABS_ALL = [
  { id: "manifest", label: "Manifest" },
  { id: "income", label: "Other Income" },
  { id: "expense", label: "Expenses" },
  { id: "vehicle", label: "Vehicle" },
  { id: "driver", label: "Driver" },
  { id: "transporter", label: "Transporter" },
  { id: "contract", label: "Contract" },
  { id: "summary", label: "Summary" },
] as const;

const TABS_BASIC = [
  { id: "manifest", label: "Manifest" },
  { id: "income", label: "Other Income" },
  { id: "expense", label: "Expenses" },
  { id: "vehicle", label: "Vehicle" },
  { id: "driver", label: "Driver" },
  { id: "transporter", label: "Transporter" },
  { id: "contract", label: "Contract" },
] as const;

type TabId = (typeof TABS_ALL)[number]["id"];

// ── Main component ────────────────────────────────────────────────────────────

export function ClosedTripDetail({
  closedId,
  onBack,
  onReopened,
}: {
  closedId: string;
  onBack: () => void;
  onReopened: () => void;
}) {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const TABS = isAdmin ? TABS_ALL : TABS_BASIC;

  const [record, setRecord] = useState<FullClosedTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("manifest");
  const [reopening, setReopening] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("closed_trips")
        .select("id,trip_code,branch_name,start_date,end_date,net_income,closed_at,snapshot")
        .eq("id", closedId)
        .single();
      if (error || !data) {
        toast.error("Could not load closed trip");
        onBack();
        return;
      }
      setRecord(data as unknown as FullClosedTrip);
      setLoading(false);
    })();
  }, [closedId]);

  async function handleReopen() {
    if (
      !window.confirm(
        "Reopen this trip? It moves back to live trips and current contract rates apply. You can close it again later.",
      )
    )
      return;
    setReopening(true);
    try {
      await reopenTrip(closedId);
      toast.success("Trip reopened with current rates");
      onReopened();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reopen trip");
    } finally {
      setReopening(false);
    }
  }

  async function handleTripNote() {
    if (!record) return;
    setGeneratingPdf(true);
    try {
      const company = await fetchCompany();
      if (!company) {
        toast.error("Company details not configured — add them in Settings first.");
        return;
      }
      const snap = record.snapshot;
      const manifests = snap.manifests as Record<string, unknown>[];
      const firstM = manifests[0] ?? {};
      const lastM = manifests[manifests.length - 1] ?? {};
      printTripNote({
        company,
        trip: {
          trip_code: record.trip_code,
          start_date: record.start_date,
          end_date: record.end_date,
          start_time: snap.trip.start_time as string | null,
          ownership: snap.trip.ownership as string | null,
          from_location: (firstM.from_pin_code as string) ?? null,
          to_location: (lastM.to_pin_code as string) ?? null,
        },
        vehicle: snap.vehicle,
        driver: snap.driver,
        transporter: snap.transporter,
        manifests: manifests.map((m) => ({
          manifest_number: String(m.manifest_number ?? ""),
          quantity: m.quantity as string | null,
          weight_kg: m.weight_kg as string | null,
          from_pin_code: m.from_pin_code as string | null,
          to_pin_code: m.to_pin_code as string | null,
        })),
      });
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );

  if (!record) return null;

  const snap = record.snapshot;
  const trip = snap.trip;

  return (
    <div className="animate-fade-up space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to trips
        </Button>
        <div className="flex items-center gap-2">
          <Archive className="size-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight">{record.trip_code}</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            Closed
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={generatingPdf}
          onClick={handleTripNote}
          title="Generate Trip Note PDF"
        >
          {generatingPdf ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
          Trip Note
        </Button>
        {isAdmin ? (
          <Button
            variant="outline"
            size="sm"
            disabled={reopening}
            onClick={handleReopen}
          >
            {reopening ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RotateCcw className="size-4" />
            )}
            Reopen trip
          </Button>
        ) : null}
      </div>

      {/* Trip header info */}
      <div className="surface-card p-6">
        <h3 className="mb-4 text-sm font-semibold tracking-tight">Trip details</h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <InfoRow label="Trip ID" value={String(trip.trip_code ?? "—")} />
          <InfoRow
            label="Ownership"
            value={trip.ownership === "own" ? "Own vehicle" : "Third party"}
          />
          <InfoRow label="Branch" value={String(snap.branch?.branch_name ?? record.branch_name ?? "—")} />
          <InfoRow label="Start date" value={String(trip.start_date ?? "—")} />
          <InfoRow label="Start time" value={String(trip.start_time ?? "—")} />
          <InfoRow label="End date" value={String(trip.end_date ?? "—")} />
          <InfoRow label="End time" value={String(trip.end_time ?? "—")} />
          <InfoRow
            label="Distance"
            value={
              trip.odometer_start && trip.odometer_end
                ? `${(num(trip.odometer_end) - num(trip.odometer_start)).toLocaleString("en-IN")} km`
                : "—"
            }
          />
          <InfoRow
            label="Closed at"
            value={new Date(record.closed_at).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
        </dl>
      </div>

      {/* Tabs */}
      <div className="surface-card overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                tab === t.id
                  ? "bg-primary-soft font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "manifest" && (
            <ManifestView
              lines={snap.manifest_lines}
              manifests={snap.manifests}
              isAdmin={isAdmin}
              totals={snap.totals}
              tripCode={record.trip_code}
              startDate={record.start_date}
            />
          )}
          {tab === "income" && (
            <LineView
              title="Other income"
              rows={snap.other_income}
              nameKey="income_name"
              total={snap.totals.other_income}
            />
          )}
          {tab === "expense" && (
            <LineView
              title="Expenses"
              rows={snap.expenses}
              nameKey="expense_name"
              total={snap.totals.total_expense}
            />
          )}
          {tab === "vehicle" && (
            <MasterView record={snap.vehicle} label="vehicle" fields={VEHICLE_FIELDS} />
          )}
          {tab === "driver" && (
            <MasterView record={snap.driver} label="driver" fields={DRIVER_FIELDS} />
          )}
          {tab === "transporter" && (
            <MasterView record={snap.transporter} label="transporter" fields={TRANSPORTER_FIELDS} />
          )}
          {tab === "contract" && <ContractView contract={snap.contract} />}
          {tab === "summary" && <SummaryView totals={snap.totals} manifests={snap.manifests} />}
        </div>
      </div>
    </div>
  );
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function ManifestView({
  lines,
  manifests,
  isAdmin,
  totals,
  tripCode,
  startDate,
}: {
  lines: ManifestLine[];
  manifests: Record<string, unknown>[];
  isAdmin: boolean;
  totals: Totals;
  tripCode: string;
  startDate: string | null;
}) {
  // Build a quick id→manifest map so we can pull pin codes
  const byId = new Map(manifests.map((m) => [m.id as string, m]));

  const grandTotal = lines.reduce((s, l) => s + l.total, 0);

  // ── Weighted income / expense helpers ────────────────────────────────────
  const totalWeight = lines.reduce((s, l) => {
    const m = (l.manifest ?? byId.get((l.manifest as Record<string, unknown>)?.id as string) ?? {}) as Record<string, unknown>;
    return s + num(m.weight_kg);
  }, 0);

  function weightedIncome(manifestWeight: number): number {
    if (totalWeight === 0) return 0;
    return (totals.other_income / totalWeight) * manifestWeight;
  }

  function weightedExpense(manifestWeight: number): number {
    if (totalWeight === 0) return 0;
    return (totals.total_expense / totalWeight) * manifestWeight;
  }

  // ── Manifest CSV export (same columns as open trip) ──────────────────────
  function exportManifestCsv() {
    const columns = ["manifest_number", "from_pin_code", "to_pin_code", "weight_kg", "quantity"];
    const rows = lines.map((l) => {
      const m = (l.manifest ?? byId.get((l.manifest as Record<string, unknown>)?.id as string) ?? {}) as Record<string, unknown>;
      return {
        manifest_number: String(m.manifest_number ?? ""),
        from_pin_code: String(m.from_pin_code ?? ""),
        to_pin_code: String(m.to_pin_code ?? ""),
        weight_kg: String(m.weight_kg ?? ""),
        quantity: String(m.quantity ?? ""),
      };
    });
    const csv = toCsv(rows, columns);
    downloadCsv(`manifests-${tripCode}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  // ── Trip details export ───────────────────────────────────────────────────
  function exportTripDetails() {
    const basicCols = [
      "trip_id", "start_date", "manifest_number",
      "weight_kg", "qty",
      "weighted_income", "weighted_expense",
    ];
    const adminCols = [
      ...basicCols,
      "freight", "loading", "gross", "net",
    ];
    const columns = isAdmin ? adminCols : basicCols;

    const rows = lines.map((l) => {
      const m = (l.manifest ?? byId.get((l.manifest as Record<string, unknown>)?.id as string) ?? {}) as Record<string, unknown>;
      const wt = num(m.weight_kg);
      const wi = weightedIncome(wt);
      const we = weightedExpense(wt);
      const gross = l.freight + l.loading + l.fixed;
      const net = gross + wi - we;
      const base: Record<string, string> = {
        trip_id: tripCode,
        start_date: startDate ?? "",
        manifest_number: String(m.manifest_number ?? ""),
        weight_kg: String(m.weight_kg ?? ""),
        qty: String(m.quantity ?? ""),
        weighted_income: wi.toFixed(2),
        weighted_expense: we.toFixed(2),
      };
      if (isAdmin) {
        base.freight = l.freight.toFixed(2);
        base.loading = l.loading.toFixed(2);
        base.gross = gross.toFixed(2);
        base.net = net.toFixed(2);
      }
      return base;
    });

    const csv = toCsv(rows, columns);
    downloadCsv(`trip-details-${tripCode}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  if (lines.length === 0)
    return (
      <p className="text-sm text-muted-foreground">No manifests were recorded for this trip.</p>
    );

  return (
    <div className="space-y-4">
      {/* Export buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportManifestCsv}
          disabled={lines.length === 0}
        >
          <Download className="size-4" />
          Export manifests
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={exportTripDetails}
          disabled={lines.length === 0}
        >
          <FileSpreadsheet className="size-4" />
          Export trip details
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: isAdmin ? 1100 : 800 }}>
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3">Manifest</th>
              <th className="py-2 pr-3">From</th>
              <th className="py-2 pr-3">To</th>
              <th className="py-2 pr-3 text-right">Weight</th>
              <th className="py-2 pr-3 text-right">Qty</th>
              <th className="py-2 pr-3 text-right">Wtd. Income</th>
              <th className="py-2 pr-3 text-right">Wtd. Expense</th>
              {isAdmin ? (
                <>
                  <th className="py-2 pr-3 text-right">Freight</th>
                  <th className="py-2 pr-3 text-right">Loading</th>
                  <th className="py-2 pr-3 text-right">Gross</th>
                  <th className="py-2 pr-3 text-right">Net</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const m = (l.manifest ?? byId.get((l.manifest as Record<string, unknown>)?.id as string) ?? {}) as Record<string, unknown>;
              const wt = num(m.weight_kg);
              const wi = weightedIncome(wt);
              const we = weightedExpense(wt);
              const gross = l.total; // freight + loading + fixed
              const net = gross + wi - we;
              return (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-2 pr-3 font-medium">
                    {String(m.manifest_number ?? "—")}
                  </td>
                  <td className="py-2 pr-3">{String(m.from_pin_code || "—")}</td>
                  <td className="py-2 pr-3">{String(m.to_pin_code || "—")}</td>
                  <td className="py-2 pr-3 text-right">{String(m.weight_kg ?? "—")}</td>
                  <td className="py-2 pr-3 text-right">{String(m.quantity ?? "—")}</td>
                  <td className="py-2 pr-3 text-right">{inr(wi)}</td>
                  <td className="py-2 pr-3 text-right">{inr(we)}</td>
                  {isAdmin ? (
                    <>
                      <td className="py-2 pr-3 text-right">{inr(l.freight)}</td>
                      <td className="py-2 pr-3 text-right">{inr(l.loading)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{inr(gross)}</td>
                      <td className="py-2 pr-3 text-right font-semibold">{inr(net)}</td>
                    </>
                  ) : null}
                </tr>
              );
            })}
            <tr>
              <td colSpan={5} className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Totals
              </td>
              <td className="py-3 pr-3 text-right font-semibold">{inr(totals.other_income)}</td>
              <td className="py-3 pr-3 text-right font-semibold">{inr(totals.total_expense)}</td>
              {isAdmin ? (
                <>
                  <td />
                  <td />
                  <td className="py-3 pr-3 text-right font-semibold">{inr(grandTotal)}</td>
                  <td className="py-3 pr-3 text-right font-semibold">{inr(grandTotal + totals.other_income - totals.total_expense)}</td>
                </>
              ) : null}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LineView({
  title,
  rows,
  nameKey,
  total,
}: {
  title: string;
  rows: Record<string, unknown>[];
  nameKey: string;
  total: number;
}) {
  const filled = rows.filter((r) => String(r[nameKey] ?? "").trim() !== "");
  if (filled.length === 0)
    return <p className="text-sm text-muted-foreground">No {title.toLowerCase()} recorded.</p>;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4 text-right">Amount</th>
              <th className="py-2">Note</th>
            </tr>
          </thead>
          <tbody>
            {filled.map((r, i) => (
              <tr key={i} className="border-b border-border/60">
                <td className="py-2 pr-4">{String(r[nameKey] ?? "")}</td>
                <td className="py-2 pr-4 text-right font-medium">{inr(num(r.amount))}</td>
                <td className="py-2 text-muted-foreground">{String(r.note ?? "")}</td>
              </tr>
            ))}
            <tr>
              <td className="py-3 font-semibold">Total</td>
              <td className="py-3 text-right font-semibold">{inr(total)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const VEHICLE_FIELDS: [string, string][] = [
  ["registration_number", "Registration"],
  ["manufacturer", "Manufacturer"],
  ["model", "Model"],
  ["ownership_type", "Ownership type"],
  ["payload_capacity_kg", "Payload (kg)"],
  ["engine_number", "Engine number"],
  ["chassis_number", "Chassis number"],
];

const DRIVER_FIELDS: [string, string][] = [
  ["full_name", "Full name"],
  ["mobile_number", "Mobile"],
  ["license_number", "Licence number"],
  ["license_expiry", "Licence expiry"],
  ["address", "Address"],
];

const TRANSPORTER_FIELDS: [string, string][] = [
  ["transporter_name", "Name"],
  ["city", "City"],
  ["mobile_number", "Mobile"],
  ["gstin", "GSTIN"],
  ["pan_number", "PAN"],
];

function MasterView({
  record,
  label,
  fields,
}: {
  record: Record<string, unknown> | null;
  label: string;
  fields: [string, string][];
}) {
  if (!record)
    return (
      <p className="text-sm text-muted-foreground">No {label} was linked to this trip.</p>
    );

  const filled = fields.filter(([key]) => String(record[key] ?? "").trim() !== "");
  if (filled.length === 0)
    return <p className="text-sm text-muted-foreground">No {label} details recorded.</p>;

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {filled.map(([key, lbl]) => (
        <div key={key} className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">{lbl}</dt>
          <dd className="text-right font-medium">{String(record[key])}</dd>
        </div>
      ))}
    </dl>
  );
}

function ContractView({ contract }: { contract: Record<string, unknown> | null }) {
  if (!contract)
    return <p className="text-sm text-muted-foreground">No contract was linked to this trip.</p>;

  const rows = (
    [
      ["Contract name", String(contract.contract_name ?? "")],
      ["Company", String(contract.company_name ?? "")],
      ["GSTIN", String(contract.gstin ?? "")],
      ["Freight basis", String(contract.freight_basis ?? "")],
      ["Loading basis", String(contract.loading_basis ?? "")],
    ] as [string, string][]
  ).filter(([, v]) => v.trim() !== "");

  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">No contract details recorded.</p>;

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-sm">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SummaryView({
  totals,
  manifests,
}: {
  totals: Totals;
  manifests: Record<string, unknown>[];
}) {
  const income = totals.total_income;
  const net = totals.net_income;

  const cards = [
    { label: "Manifests", value: String(manifests.length) },
    { label: "Manifest income", value: inr(totals.manifest_income) },
    { label: "Other income", value: inr(totals.other_income) },
    { label: "Total income", value: inr(income), strong: true },
    { label: "Total expense", value: inr(totals.total_expense) },
    { label: "Net income", value: inr(net), strong: true },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl bg-muted/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {c.label}
          </p>
          <p className={`mt-1 ${c.strong ? "text-lg font-semibold" : "text-base font-medium"}`}>
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

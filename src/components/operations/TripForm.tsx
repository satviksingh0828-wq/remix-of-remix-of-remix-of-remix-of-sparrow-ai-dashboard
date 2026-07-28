import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Lock, Plus, Printer, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityPicker, type PickerOption } from "@/components/EntityPicker";
import { LocationPinPair } from "@/components/LocationPinPair";
import { LocationPicker } from "@/components/LocationPicker";
import { CsvIO } from "@/components/CsvIO";
import { TransporterQuickCreate } from "./TransporterQuickCreate";
import {
  DRIVER_CONFIG,
  TRANSPORTER_CONFIG,
  VEHICLE_CONFIG,
} from "@/components/masters/configs";
import { useLocations } from "@/lib/use-locations";
import { useBranches } from "@/lib/use-branches";
import { useSession } from "@/lib/session";
import { closeTrip } from "@/lib/close-trip";
import { logAction } from "@/lib/log-actions";
import {
  findEntry,
  inr,
  manifestCharges,
  newTripCode,
  num,
  type ContractLite,
  type EntryLite,
} from "@/lib/trip-calc";
import { fetchCompany, fetchLocationMap, printTripNote } from "@/lib/trip-note-pdf";

export type TripRow = {
  id?: string;
  trip_code: string;
  ownership: string;
  branch_id: string | null;
  vehicle_id: string | null;
  driver_id: string | null;
  transporter_id: string | null;
  contract_id: string | null;
  start_location_id: string | null;
  end_location_id: string | null;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  odometer_start: string;
  odometer_end: string;
  third_party_vehicle_number: string;
  created_at?: string;
  reopened_at?: string | null;
};

export type ManifestRow = {
  id?: string;
  trip_id: string;
  manifest_number: string;
  from_location_id: string | null;
  from_pin_code: string;
  to_location_id: string | null;
  to_pin_code: string;
  weight_kg: string;
  quantity: string;
};

type LineRow = { id?: string; name: string; amount: string; note: string };

const DEFAULT_EXPENSES = [
  "Fuel Expense",
  "Toll Charges",
  "Driver Bata",
  "Morning Exp.",
  "Night Exp.",
  "Sunday",
  "Parking Charges",
  "Dala Charges",
  "Unloading",
];

export function emptyTrip(): TripRow {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    trip_code: newTripCode(),
    ownership: "own",
    branch_id: null,
    vehicle_id: null,
    driver_id: null,
    transporter_id: null,
    contract_id: null,
    start_location_id: null,
    end_location_id: null,
    start_date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    start_time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    end_date: "",
    end_time: "",
    odometer_start: "",
    odometer_end: "",
    third_party_vehicle_number: "",
  };
}

// Tabs visible to all users
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

// Tabs visible to basic users only
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

type AnyRow = Record<string, unknown> & { id: string };

export function TripForm({
  initial,
  onBack,
  onSaved,
}: {
  initial: TripRow;
  onBack: () => void;
  onSaved: () => void;
}) {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const isBasic = user?.role === "basic";
  const allowedBranchIds = isBasic ? (user?.branchIds ?? []) : null;

  const TABS = isBasic ? TABS_BASIC : TABS_ALL;

  const [trip, setTrip] = useState<TripRow>(initial);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [tab, setTab] = useState<TabId>("manifest");

  const [vehicles, setVehicles] = useState<AnyRow[]>([]);
  const [drivers, setDrivers] = useState<AnyRow[]>([]);
  const [transporters, setTransporters] = useState<AnyRow[]>([]);
  const [contracts, setContracts] = useState<AnyRow[]>([]);
  const [entries, setEntries] = useState<EntryLite[]>([]);
  const [showTransporterForm, setShowTransporterForm] = useState(false);

  const [manifests, setManifests] = useState<ManifestRow[]>([]);
  const [incomes, setIncomes] = useState<LineRow[]>([]);
  const [expenses, setExpenses] = useState<LineRow[]>(
    DEFAULT_EXPENSES.map((name) => ({ name, amount: "", note: "" })),
  );

  const { locations } = useLocations();
  const allBranches = useBranches();
  const patch = (p: Partial<TripRow>) => setTrip((t) => ({ ...t, ...p }));

  async function loadMasters() {
    const [v, d, t, c] = await Promise.all([
      supabase.from("vehicles").select("*").order("registration_number"),
      supabase.from("drivers").select("*").order("full_name"),
      supabase.from("transporters").select("*").order("transporter_name"),
      supabase.from("contracts").select("*").order("contract_name"),
    ]);
    setVehicles((v.data as AnyRow[]) ?? []);
    setDrivers((d.data as AnyRow[]) ?? []);
    setTransporters((t.data as AnyRow[]) ?? []);
    setContracts((c.data as AnyRow[]) ?? []);
  }
  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    (async () => {
      if (!trip.contract_id) return setEntries([]);
      const { data } = await supabase
        .from("contract_entries")
        .select("*")
        .eq("contract_id", trip.contract_id);
      setEntries((data as unknown as EntryLite[]) ?? []);
    })();
  }, [trip.contract_id]);

  async function loadChildren(tripId: string) {
    const [m, i, e] = await Promise.all([
      supabase.from("trip_manifests").select("*").eq("trip_id", tripId).order("created_at"),
      supabase
        .from("trip_other_income")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at"),
      supabase.from("trip_expenses").select("*").eq("trip_id", tripId).order("sort_order"),
    ]);
    setManifests((m.data as unknown as ManifestRow[]) ?? []);
    setIncomes(
      ((i.data as unknown as { id: string; income_name: string; amount: string; note: string }[]) ??
        []).map((r) => ({ id: r.id, name: r.income_name, amount: r.amount ?? "", note: r.note ?? "" })),
    );
    const exp =
      ((e.data as unknown as { id: string; expense_name: string; amount: string; note: string }[]) ??
        []).map((r) => ({ id: r.id, name: r.expense_name, amount: r.amount ?? "", note: r.note ?? "" }));
    setExpenses(
      exp.length > 0 ? exp : DEFAULT_EXPENSES.map((name) => ({ name, amount: "", note: "" })),
    );
  }
  useEffect(() => {
    if (initial.id) loadChildren(initial.id);
  }, [initial.id]);

  const contract = contracts.find((c) => c.id === trip.contract_id) as
    | (AnyRow & ContractLite)
    | undefined;
  const vehicle = vehicles.find((v) => v.id === trip.vehicle_id);
  const driver = drivers.find((d) => d.id === trip.driver_id);
  const transporter = transporters.find((t) => t.id === trip.transporter_id);

  const isOwn = trip.ownership === "own";
  const isRented = trip.ownership === "third_party";

  const distance =
    isOwn && trip.odometer_start && trip.odometer_end
      ? num(trip.odometer_end) - num(trip.odometer_start)
      : null;

  const lines = manifests.map((m) => ({
    m,
    ...manifestCharges(contract, findEntry(entries, m), m),
  }));
  const manifestTotal = lines.reduce(
    (s, l) => s + l.freight + l.loading + l.fixed,
    0,
  );
  const otherIncomeTotal = incomes.reduce((s, r) => s + num(r.amount), 0);
  const expenseTotal = expenses.reduce((s, r) => s + num(r.amount), 0);
  const totalWeight = manifests.reduce((s, m) => s + num(m.weight_kg), 0);
  const payload = vehicle ? num(vehicle.payload_capacity_kg) : 0;
  const deadWeight =
    isOwn && payload > 0 ? payload - totalWeight : null;

  async function saveTrip(e?: React.FormEvent) {
    e?.preventDefault();

    // ── Validation ──────────────────────────────────────────────────────────
    if (!trip.start_date) {
      toast.error("Start date is required");
      return;
    }
    if (!trip.start_time) {
      toast.error("Start time is required");
      return;
    }
    if (!trip.branch_id) {
      toast.error("Branch is required");
      return;
    }
    if (isOwn) {
      if (!trip.vehicle_id) {
        toast.error("Vehicle is required for own-vehicle trips");
        return;
      }
      if (!trip.driver_id) {
        toast.error("Driver is required for own-vehicle trips");
        return;
      }
      if (!trip.odometer_start) {
        toast.error("Odometer start is required for own-vehicle trips");
        return;
      }
    }
    if (isRented && !trip.transporter_id) {
      toast.error("Transporter is required for rented trips — please select one before saving");
      return;
    }

    setSaving(true);
    const { id, created_at, reopened_at, ...rest } = trip;
    void created_at;
    void reopened_at;
    const res = id
      ? await supabase.from("trips").update(rest as never).eq("id", id).select("id").single()
      : await supabase.from("trips").insert(rest as never).select("id").single();
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    const newId = (res.data as { id: string }).id;
    if (!id) setTrip((t) => ({ ...t, id: newId }));
    const isNew = !id;
    logAction(isNew ? "created" : "updated", "trip", {
      entityId: newId,
      entityLabel: trip.trip_code,
      details: { ownership: trip.ownership, branch_id: trip.branch_id ?? "" },
    });
    toast.success(id ? "Trip updated" : "Trip created");
    onSaved();
    return newId;
  }

  async function requireTripId(): Promise<string | null> {
    if (trip.id) return trip.id;
    const id = await saveTrip();
    return typeof id === "string" ? id : null;
  }

  async function saveLines(
    table: "trip_other_income" | "trip_expenses",
    rows: LineRow[],
    nameCol: "income_name" | "expense_name",
  ) {
    const tripId = await requireTripId();
    if (!tripId) return;
    await supabase.from(table).delete().eq("trip_id", tripId);
    const payloadRows = rows
      .filter((r) => r.name.trim() !== "")
      .map((r, idx) => ({
        trip_id: tripId,
        [nameCol]: r.name,
        amount: r.amount,
        note: r.note,
        ...(table === "trip_expenses" ? { sort_order: idx } : {}),
      }));
    if (payloadRows.length > 0) {
      const { error } = await supabase.from(table).insert(payloadRows as never);
      if (error) return toast.error(error.message);
    }
    logAction("updated", "trip", { entityId: tripId, entityLabel: trip.trip_code, details: { section: table } });
    toast.success("Saved");
    loadChildren(tripId);
  }

  async function handleClose() {
    if (!trip.id) return toast.error("Save the trip before closing it");

    // ── Close validation ─────────────────────────────────────────────────────
    if (!trip.end_date) {
      toast.error("End date is required to close the trip");
      return;
    }
    if (!trip.end_time) {
      toast.error("End time is required to close the trip");
      return;
    }
    if (isOwn && !trip.odometer_end) {
      toast.error("Odometer end reading is required to close an own-vehicle trip");
      return;
    }

    // Save any unsaved changes first (e.g. end_date/end_time just entered)
    await saveTrip();

    if (
      !window.confirm(
        "Close this trip? A full snapshot is archived and the live trip is removed. This cannot be undone.",
      )
    )
      return;
    setClosing(true);
    try {
      await closeTrip(trip.id);
      logAction("closed", "trip", { entityId: trip.id, entityLabel: trip.trip_code });
      toast.success("Trip closed and archived");
      onSaved();
      onBack();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not close trip");
    } finally {
      setClosing(false);
    }
  }

  const vehicleOpts: PickerOption[] = vehicles.map((v) => ({
    id: v.id,
    label: String(v.registration_number ?? ""),
    sub: [v.manufacturer, v.model].filter(Boolean).join(" ") || undefined,
  }));
  const driverOpts: PickerOption[] = drivers.map((d) => ({
    id: d.id,
    label: String(d.full_name ?? ""),
    sub: String(d.mobile_number ?? "") || undefined,
  }));
  const transporterOpts: PickerOption[] = transporters.map((t) => ({
    id: t.id,
    label: String(t.transporter_name ?? ""),
    sub: String(t.city ?? "") || undefined,
  }));
  const contractOpts: PickerOption[] = contracts.map((c) => ({
    id: c.id,
    label: String(c.contract_name ?? ""),
    sub: String(c.company_name ?? "") || undefined,
  }));

  // Branch options: basic users only see their allowed branches
  const branchOpts: PickerOption[] = (
    allowedBranchIds !== null
      ? allBranches.filter((b) => allowedBranchIds.includes(b.id))
      : allBranches
  ).map((b) => ({
    id: b.id,
    label: b.branch_name,
    sub: b.branch_type ?? undefined,
  }));

  const monthlyContractCharges = 0;

  async function handleTripNote() {
    setGeneratingPdf(true);
    try {
      const company = await fetchCompany();
      if (!company) {
        toast.error("Company details not configured — add them in Settings first.");
        return;
      }
      const locMap = await fetchLocationMap();
      const fromLoc = locations.find((l) => l.id === trip.start_location_id);
      const toLoc = locations.find((l) => l.id === trip.end_location_id);
      printTripNote({
        company,
        trip: {
          trip_code: trip.trip_code,
          start_date: trip.start_date,
          end_date: trip.end_date,
          start_time: trip.start_time,
          ownership: trip.ownership,
          from_location: (fromLoc as Record<string, unknown>)?.location_name as string | null ?? null,
          to_location: (toLoc as Record<string, unknown>)?.location_name as string | null ?? null,
        },
        vehicle: vehicle
          ? {
              registration_number: vehicle.registration_number,
              internal_code: vehicle.internal_code,
              nickname: vehicle.nickname,
              manufacturer: vehicle.manufacturer,
              model: vehicle.model,
              year_of_manufacture: vehicle.year_of_manufacture,
              fuel_type: vehicle.fuel_type,
              payload_capacity_kg: vehicle.payload_capacity_kg,
              purchase_date: vehicle.purchase_date,
              purchase_cost: vehicle.purchase_cost,
            }
          : null,
        driver: driver
          ? {
              driver_code: driver.driver_code,
              full_name: driver.full_name,
              guardian_name: driver.guardian_name,
              date_of_birth: driver.date_of_birth,
              gender: driver.gender,
              blood_group: driver.blood_group,
              mobile_number: driver.mobile_number,
              alternate_mobile: driver.alternate_mobile,
              licence_number: driver.licence_number,
              licence_type: driver.licence_type,
              licence_authority: driver.licence_authority,
              licence_issue_date: driver.licence_issue_date,
              licence_expiry_date: driver.licence_expiry_date,
            }
          : null,
        transporter: transporter
          ? {
              transporter_name: transporter.transporter_name,
              city: transporter.city,
              pan_number: transporter.pan_number,
              gst_number: transporter.gst_number,
            }
          : null,
        third_party_vehicle_number: trip.third_party_vehicle_number || null,
        manifests: manifests.map((m) => ({
          manifest_number: m.manifest_number,
          quantity: m.quantity,
          weight_kg: m.weight_kg,
          from_location_name: locMap.get(m.from_location_id ?? "") || m.from_pin_code || null,
          to_location_name: locMap.get(m.to_location_id ?? "") || m.to_pin_code || null,
        })),
      });
    } finally {
      setGeneratingPdf(false);
    }
  }

  // Ensure selected tab exists in TABS (e.g. basic user was on "summary")
  const activeTab = (TABS as readonly { id: string; label: string }[]).find((t) => t.id === tab)
    ? tab
    : "manifest";

  return (
    <div className="animate-fade-up space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Back to trips
        </Button>
        <h2 className="text-lg font-semibold tracking-tight">{trip.trip_code}</h2>
        {trip.reopened_at ? (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            Reopened
          </span>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={handleTripNote}
          disabled={generatingPdf}
          title="Generate Trip Note PDF"
        >
          {generatingPdf ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
          Trip Note
        </Button>
        <Button onClick={() => saveTrip()} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {trip.id ? "Update trip" : "Save trip"}
        </Button>
        <Button
          variant="outline"
          onClick={handleClose}
          disabled={closing || !trip.id}
          title="Archive a snapshot of this trip and remove it from live records"
        >
          {closing ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
          Close trip
        </Button>
      </div>

      <form onSubmit={saveTrip} className="surface-card space-y-5 p-6">
        <h3 className="text-sm font-semibold tracking-tight">Trip details</h3>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Trip ID</Label>
            <Input className="h-10" value={trip.trip_code} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">
              Contract Ownership <span className="text-destructive">*</span>
            </Label>
            <Select
              value={trip.ownership}
              onValueChange={(v) =>
                patch({
                  ownership: v,
                  ...(v === "own"
                    ? { transporter_id: null }
                    : { vehicle_id: null, driver_id: null, odometer_start: "", odometer_end: "" }),
                })
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="own">Own vehicle</SelectItem>
                <SelectItem value="third_party">Rented (Third party)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Own vehicle: vehicle + driver + odometer required */}
          {isOwn ? (
            <>
              <EntityPicker
                label="Vehicle (required)"
                value={trip.vehicle_id}
                options={vehicleOpts}
                onChange={(id) => patch({ vehicle_id: id })}
              />
              <EntityPicker
                label="Driver (required)"
                value={trip.driver_id}
                options={driverOpts}
                onChange={(id) => patch({ driver_id: id })}
              />
            </>
          ) : null}

          {/* Rented: transporter required; no vehicle/driver/odometer */}
          {isRented ? (
            <>
              <EntityPicker
                label="Transporter (required for rented)"
                value={trip.transporter_id}
                options={transporterOpts}
                onChange={(id) => patch({ transporter_id: id })}
                onAdd={() => setShowTransporterForm(true)}
                addLabel="Add new transporter"
              />
              <Field
                label="Vehicle Number (3rd party)"
                value={trip.third_party_vehicle_number}
                onChange={(v) => patch({ third_party_vehicle_number: v })}
              />
            </>
          ) : null}

          <EntityPicker
            label="Contract"
            value={trip.contract_id}
            options={contractOpts}
            onChange={(id) => patch({ contract_id: id })}
          />
          <EntityPicker
            label="Branch (required)"
            value={trip.branch_id}
            options={branchOpts}
            onChange={(id) => patch({ branch_id: id })}
          />

          <LocationPicker
            label="Starting Location"
            value={trip.start_location_id}
            onChange={(id) => patch({ start_location_id: id })}
          />
          <LocationPicker
            label="Ending Location"
            value={trip.end_location_id}
            onChange={(id) => patch({ end_location_id: id })}
          />

          {/* Start date & time — required */}
          <Field
            label="Start Date (required)"
            type="date"
            value={trip.start_date}
            onChange={(v) => patch({ start_date: v })}
          />
          <Field
            label="Start Time (required)"
            type="time"
            value={trip.start_time}
            onChange={(v) => patch({ start_time: v })}
          />

          {/* End date & time — required to close */}
          <Field
            label="End Date (required to close)"
            type="date"
            value={trip.end_date}
            onChange={(v) => patch({ end_date: v })}
          />
          <Field
            label="End Time (required to close)"
            type="time"
            value={trip.end_time}
            onChange={(v) => patch({ end_time: v })}
          />

          {/* Odometer — only shown & required for own vehicle */}
          {isOwn ? (
            <>
              <Field
                label="Odometer Start (required)"
                type="number"
                value={trip.odometer_start}
                onChange={(v) => patch({ odometer_start: v })}
              />
              <Field
                label="Odometer End (required to close)"
                type="number"
                value={trip.odometer_end}
                onChange={(v) => patch({ odometer_end: v })}
              />
              <div className="rounded-xl bg-muted px-4 py-3 text-sm sm:col-span-2">
                Distance travelled:{" "}
                <span className="font-semibold">
                  {distance === null ? "—" : `${distance.toLocaleString("en-IN")} km`}
                </span>
              </div>
            </>
          ) : null}
        </div>
      </form>

      <div className="surface-card overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {(TABS as readonly { id: string; label: string }[]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as TabId)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                activeTab === t.id
                  ? "bg-primary-soft font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === "manifest" ? (
            <ManifestTab
              tripId={trip.id ?? null}
              requireTripId={requireTripId}
              manifests={manifests}
              lines={lines}
              total={manifestTotal}
              locations={locations}
              startLocationId={trip.start_location_id ?? null}
              reload={(id) => loadChildren(id)}
              isAdmin={isAdmin}
              otherIncomeTotal={otherIncomeTotal}
              expenseTotal={expenseTotal}
              totalWeight={totalWeight}
            />
          ) : null}
          {activeTab === "income" ? (
            <LineTab
              title="Other income"
              nameLabel="Income name"
              rows={incomes}
              setRows={setIncomes}
              total={otherIncomeTotal}
              onSave={() => saveLines("trip_other_income", incomes, "income_name")}
            />
          ) : null}
          {activeTab === "expense" ? (
            <LineTab
              title="Expenses"
              nameLabel="Expense name"
              rows={expenses}
              setRows={setExpenses}
              total={expenseTotal}
              onSave={() => saveLines("trip_expenses", expenses, "expense_name")}
            />
          ) : null}
          {activeTab === "vehicle" ? (
            <Details record={vehicle} sections={VEHICLE_CONFIG.sections} empty="No vehicle selected." />
          ) : null}
          {activeTab === "driver" ? (
            <Details record={driver} sections={DRIVER_CONFIG.sections} empty="No driver selected." />
          ) : null}
          {activeTab === "transporter" ? (
            <Details
              record={transporter}
              sections={TRANSPORTER_CONFIG.sections}
              empty="No transporter selected."
            />
          ) : null}
          {activeTab === "contract" ? (
            <ContractDetails
              contract={contract}
              entryCount={entries.length}
              monthlyCharges={monthlyContractCharges}
            />
          ) : null}
          {activeTab === "summary" && isAdmin ? (
            <Summary
              manifestTotal={manifestTotal}
              otherIncomeTotal={otherIncomeTotal}
              expenseTotal={expenseTotal}
              totalWeight={totalWeight}
              payload={payload}
              deadWeight={deadWeight}
              manifestCount={manifests.length}
              distance={distance}
            />
          ) : null}
        </div>
      </div>

      <TransporterQuickCreate
        open={showTransporterForm}
        onOpenChange={setShowTransporterForm}
        onCreated={async (id) => {
          await loadMasters();
          patch({ transporter_id: id });
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Input
        className="h-10"
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ---------------- Manifest tab ---------------- */

type Line = {
  m: ManifestRow;
  freight: number;
  loading: number;
  fixed: number;
  matched: boolean;
};

function emptyManifest(tripId: string): ManifestRow {
  return {
    trip_id: tripId,
    manifest_number: "",
    from_location_id: null,
    from_pin_code: "",
    to_location_id: null,
    to_pin_code: "",
    weight_kg: "",
    quantity: "",
  };
}

function ManifestTab({
  tripId,
  requireTripId,
  manifests,
  lines,
  total,
  locations,
  startLocationId,
  reload,
  isAdmin,
  otherIncomeTotal,
  expenseTotal,
  totalWeight,
}: {
  tripId: string | null;
  requireTripId: () => Promise<string | null>;
  manifests: ManifestRow[];
  lines: Line[];
  total: number;
  locations: { id: string; location_name: string; pin_code: string | null }[];
  /** Trip's start location — pre-filled as "From" on new manifests */
  startLocationId: string | null;
  reload: (tripId: string) => void;
  isAdmin: boolean;
  otherIncomeTotal: number;
  expenseTotal: number;
  totalWeight: number;
}) {
  const [editing, setEditing] = useState<ManifestRow | null>(null);
  const [saving, setSaving] = useState(false);

  const csvColumns = [
    "manifest_number",
    "from_location",
    "from_pin_code",
    "to_location",
    "to_pin_code",
    "weight_kg",
    "quantity",
  ];
  const nameById = useMemo(
    () => new Map(locations.map((l) => [l.id, l.location_name])),
    [locations],
  );
  const idByName = useMemo(
    () => new Map(locations.map((l) => [l.location_name.toLowerCase(), l.id])),
    [locations],
  );
  const idByPin = useMemo(
    () =>
      new Map(
        locations
          .filter((l) => (l.pin_code ?? "").trim() !== "")
          .map((l) => [(l.pin_code ?? "").trim(), l.id]),
      ),
    [locations],
  );

  const csvRows = manifests.map((m) => ({
    manifest_number: m.manifest_number,
    from_location: nameById.get(m.from_location_id ?? "") ?? "",
    from_pin_code: m.from_pin_code,
    to_location: nameById.get(m.to_location_id ?? "") ?? "",
    to_pin_code: m.to_pin_code,
    weight_kg: m.weight_kg,
    quantity: m.quantity,
  }));

  async function openNew() {
    const id = await requireTripId();
    if (!id) return;
    // Pre-fill "From" with the trip's start location so the user doesn't have
    // to re-enter it for every manifest on the same trip.
    const startLoc = startLocationId
      ? locations.find((l) => l.id === startLocationId)
      : null;
    setEditing({
      ...emptyManifest(id),
      from_location_id: startLocationId ?? null,
      from_pin_code: startLoc?.pin_code ?? "",
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { id, ...rest } = editing;
    const res = id
      ? await supabase.from("trip_manifests").update(rest as never).eq("id", id)
      : await supabase.from("trip_manifests").insert(rest as never);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(id ? "Manifest updated" : "Manifest added");
    setEditing(null);
    reload(rest.trip_id);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("trip_manifests").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (tripId) reload(tripId);
  }

  async function onImport(rows: Record<string, string>[]) {
    const id = await requireTripId();
    if (!id) return { inserted: 0, failed: rows.length };
    const payload = rows.map((r) => ({
      trip_id: id,
      manifest_number: r.manifest_number ?? "",
      from_location_id:
        idByName.get((r.from_location ?? "").toLowerCase()) ??
        idByPin.get((r.from_pin_code ?? "").trim()) ??
        null,
      from_pin_code: r.from_pin_code ?? "",
      to_location_id:
        idByName.get((r.to_location ?? "").toLowerCase()) ??
        idByPin.get((r.to_pin_code ?? "").trim()) ??
        null,
      to_pin_code: r.to_pin_code ?? "",
      weight_kg: r.weight_kg ?? "",
      quantity: r.quantity ?? "",
    }));
    const { error } = await supabase.from("trip_manifests").insert(payload as never);
    if (error) {
      toast.error(error.message);
      return { inserted: 0, failed: rows.length };
    }
    reload(id);
    return { inserted: payload.length, failed: 0 };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={openNew}>
          <Plus className="size-4" />
          Create manifest
        </Button>
        <div className="ml-auto">
          <CsvIO
            entityLabel="Manifests"
            filename="manifests"
            columns={csvColumns}
            rows={csvRows}
            onImport={onImport}
          />
        </div>
      </div>

      {manifests.length === 0 ? (
        <p className="rounded-xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
          No manifests yet. Freight, loading and fixed charges are calculated from the
          selected contract once you add manifest lines.
        </p>
      ) : (
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
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const wt = num(l.m.weight_kg);
                const wi = totalWeight === 0 ? 0 : (otherIncomeTotal / totalWeight) * wt;
                const we = totalWeight === 0 ? 0 : (expenseTotal / totalWeight) * wt;
                const gross = l.freight + l.loading + l.fixed;
                const net = gross + wi - we;
                return (
                  <tr key={l.m.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{l.m.manifest_number || "—"}</td>
                    <td className="py-2 pr-3">
                      {nameById.get(l.m.from_location_id ?? "") ?? (l.m.from_pin_code || "—")}
                    </td>
                    <td className="py-2 pr-3">
                      {nameById.get(l.m.to_location_id ?? "") ?? (l.m.to_pin_code || "—")}
                    </td>
                    <td className="py-2 pr-3 text-right">{l.m.weight_kg || "—"}</td>
                    <td className="py-2 pr-3 text-right">{l.m.quantity || "—"}</td>
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
                    <td className="py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(l.m)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => l.m.id && remove(l.m.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={5} className="py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Totals
                </td>
                <td className="py-3 pr-3 text-right font-semibold">{inr(otherIncomeTotal)}</td>
                <td className="py-3 pr-3 text-right font-semibold">{inr(expenseTotal)}</td>
                {isAdmin ? (
                  <>
                    <td />
                    <td />
                    <td className="py-3 pr-3 text-right font-semibold">{inr(total)}</td>
                    <td className="py-3 pr-3 text-right font-semibold">{inr(total + otherIncomeTotal - expenseTotal)}</td>
                  </>
                ) : null}
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit manifest" : "New manifest"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <form onSubmit={save} className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground">
                  Manifest Number
                </Label>
                <Input
                  className="h-10"
                  value={editing.manifest_number}
                  onChange={(e) =>
                    setEditing({ ...editing, manifest_number: e.target.value })
                  }
                />
              </div>
              <LocationPinPair
                label="From"
                locationId={editing.from_location_id}
                pinCode={editing.from_pin_code}
                onChange={(n) =>
                  setEditing({
                    ...editing,
                    from_location_id: n.location_id,
                    from_pin_code: n.pin_code,
                  })
                }
              />
              <LocationPinPair
                label="To"
                locationId={editing.to_location_id}
                pinCode={editing.to_pin_code}
                onChange={(n) =>
                  setEditing({
                    ...editing,
                    to_location_id: n.location_id,
                    to_pin_code: n.pin_code,
                  })
                }
              />
              <Field
                label="Weight (kg)"
                type="number"
                value={editing.weight_kg}
                onChange={(v) => setEditing({ ...editing, weight_kg: v })}
              />
              <Field
                label="Quantity (units)"
                type="number"
                value={editing.quantity}
                onChange={(v) => setEditing({ ...editing, quantity: v })}
              />
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Save manifest
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Income / expense tab ---------------- */

function LineTab({
  title,
  nameLabel,
  rows,
  setRows,
  total,
  onSave,
}: {
  title: string;
  nameLabel: string;
  rows: LineRow[];
  setRows: (r: LineRow[]) => void;
  total: number;
  onSave: () => void;
}) {
  const update = (i: number, p: Partial<LineRow>) =>
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => setRows([...rows, { name: "", amount: "", note: "" }])}
        >
          <Plus className="size-4" />
          Add field
        </Button>
        <Button type="button" size="sm" onClick={onSave}>
          <Save className="size-4" />
          Save
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div
            key={i}
            className="grid grid-cols-1 items-end gap-3 rounded-xl bg-muted/50 p-3 sm:grid-cols-[1.2fr_0.8fr_1.4fr_auto]"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{nameLabel}</Label>
              <Input
                className="h-10"
                value={r.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Amount (₹)</Label>
              <Input
                className="h-10"
                type="number"
                value={r.amount}
                onChange={(e) => update(i, { amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Note</Label>
              <Input
                className="h-10"
                value={r.note}
                onChange={(e) => update(i, { note: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end border-t border-border pt-3 text-sm font-semibold">
        Total: {inr(total)}
      </div>
    </div>
  );
}

/* ---------------- Detail tabs ---------------- */

function Details({
  record,
  sections,
  empty,
}: {
  record: Record<string, unknown> | undefined;
  sections: { title: string; fields: { key: string; label: string }[] }[];
  empty: string;
}) {
  if (!record)
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="space-y-5">
      {sections.map((s) => {
        const filled = s.fields.filter((f) => String(record[f.key] ?? "").trim() !== "");
        if (filled.length === 0) return null;
        return (
          <section key={s.title}>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {s.title}
            </h4>
            <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {filled.map((f) => (
                <div key={f.key} className="flex justify-between gap-4 text-sm">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right font-medium">{String(record[f.key])}</dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}

function ContractDetails({
  contract,
  entryCount,
  monthlyCharges,
}: {
  contract: (Record<string, unknown> & ContractLite) | undefined;
  entryCount: number;
  monthlyCharges: number;
}) {
  if (!contract) return <p className="text-sm text-muted-foreground">No contract selected.</p>;
  const monthly = num(contract.fixed_monthly_charge as unknown);
  const yearly = num(contract.fixed_yearly_charge as unknown);
  const monthlyEquivalent = monthly + yearly / 12;

  const rows: [string, string][] = [
    ["Contract name", contract.contract_name],
    ["Company", String(contract.company_name ?? "")],
    ["GSTIN", String(contract.gstin ?? "")],
    ["Freight basis", contract.freight_basis],
    ["Loading basis", contract.loading_basis],
    ["Rate entries (routes)", String(entryCount)],
    ...(monthlyEquivalent > 0
      ? ([["Monthly fixed cost", inr(monthlyEquivalent)]] as [string, string][])
      : []),
  ];
  void monthlyCharges;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {rows
        .filter(([, v]) => v.trim() !== "")
        .map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
    </dl>
  );
}

function Summary({
  manifestTotal,
  otherIncomeTotal,
  expenseTotal,
  totalWeight,
  payload,
  deadWeight,
  manifestCount,
  distance,
}: {
  manifestTotal: number;
  otherIncomeTotal: number;
  expenseTotal: number;
  totalWeight: number;
  payload: number;
  deadWeight: number | null;
  manifestCount: number;
  distance: number | null;
}) {
  const income = manifestTotal + otherIncomeTotal;
  const net = income - expenseTotal;
  const cards: { label: string; value: string; strong?: boolean }[] = [
    { label: "Manifests", value: String(manifestCount) },
    { label: "Manifest income", value: inr(manifestTotal) },
    { label: "Other income", value: inr(otherIncomeTotal) },
    { label: "Total income", value: inr(income), strong: true },
    { label: "Total expense", value: inr(expenseTotal) },
    { label: "Net income", value: inr(net), strong: true },
    { label: "Total weight", value: `${totalWeight.toLocaleString("en-IN")} kg` },
    { label: "Vehicle payload", value: payload > 0 ? `${payload.toLocaleString("en-IN")} kg` : "—" },
    {
      label: "Dead weight",
      value: deadWeight === null ? "—" : `${deadWeight.toLocaleString("en-IN")} kg`,
    },
    {
      label: "Distance",
      value: distance === null ? "—" : `${distance.toLocaleString("en-IN")} km`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl bg-muted/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {c.label}
          </p>
          <p
            className={`mt-1 ${c.strong ? "text-lg font-semibold" : "text-base font-medium"}`}
          >
            {c.value}
          </p>
        </div>
      ))}
    </div>
  );
}

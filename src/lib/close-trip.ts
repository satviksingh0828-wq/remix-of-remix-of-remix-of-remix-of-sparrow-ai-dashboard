import { supabase } from "@/integrations/supabase/client";
import {
  findEntry,
  manifestCharges,
  num,
  type ContractLite,
  type EntryLite,
} from "./trip-calc";
// monthlyContractEffect removed with monthly/yearly change fields

/**
 * Closes a trip: takes a full snapshot of every record the trip used
 * (trip, manifests, other income, expenses, contract + rate entries,
 * vehicle, driver, transporter, branch), writes it to `closed_trips`,
 * then deletes the live rows so later master changes never alter history.
 */
export async function closeTrip(tripId: string) {
  const { data: trip, error: tripErr } = await supabase
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .single();
  if (tripErr || !trip) throw new Error(tripErr?.message ?? "Trip not found");

  const t = trip as Record<string, unknown>;

  const [manifestsRes, incomeRes, expenseRes] = await Promise.all([
    supabase.from("trip_manifests").select("*").eq("trip_id", tripId).order("created_at"),
    supabase.from("trip_other_income").select("*").eq("trip_id", tripId).order("created_at"),
    supabase.from("trip_expenses").select("*").eq("trip_id", tripId).order("sort_order"),
  ]);
  const manifests = (manifestsRes.data as unknown as Record<string, unknown>[]) ?? [];
  const otherIncome = (incomeRes.data as unknown as Record<string, unknown>[]) ?? [];
  const expenses = (expenseRes.data as unknown as Record<string, unknown>[]) ?? [];

  const one = async (table: "vehicles" | "drivers" | "transporters" | "branches" | "contracts", id: unknown) => {
    if (!id) return null;
    const { data } = await supabase.from(table).select("*").eq("id", id as string).single();
    return (data as Record<string, unknown>) ?? null;
  };

  const [vehicle, driver, transporter, branch] = await Promise.all([
    one("vehicles", t.vehicle_id),
    one("drivers", t.driver_id),
    one("transporters", t.transporter_id),
    one("branches", t.branch_id),
  ]);

  // Collect unique source_ids from manifests (per-manifest source model)
  const sourceIds = Array.from(
    new Set(
      manifests
        .map((m) => (m as Record<string, unknown>).source_id as string | null)
        .filter(Boolean),
    ),
  ) as string[];

  // Load all referenced sources (contracts) and their entries in parallel
  const [sourcesData, entriesData] = await Promise.all([
    sourceIds.length > 0
      ? supabase.from("contracts").select("*").in("id", sourceIds)
      : Promise.resolve({ data: [] }),
    sourceIds.length > 0
      ? supabase.from("contract_entries").select("*").in("contract_id", sourceIds)
      : Promise.resolve({ data: [] }),
  ]);
  const sourcesMap = new Map<string, ContractLite>(
    ((sourcesData.data ?? []) as unknown as ContractLite[]).map((s) => [s.id, s]),
  );
  const allEntries = (entriesData.data ?? []) as unknown as EntryLite[];

  const manifestLines = manifests.map((m) => {
    const mSourceId = (m as Record<string, unknown>).source_id as string | null;
    const mContract = mSourceId ? sourcesMap.get(mSourceId) : undefined;
    const mEntries = mSourceId ? allEntries.filter((e) => e.contract_id === mSourceId) : [];
    const charges = manifestCharges(
      mContract,
      findEntry(mEntries, m as never),
      m as never,
    );
    return { manifest: m, ...charges, total: charges.freight + charges.loading + charges.fixed };
  });

  const manifestTotal = manifestLines.reduce((s, l) => s + l.total, 0);
  const otherIncomeTotal = otherIncome.reduce((s, r) => s + num(r.amount), 0);
  const expenseTotal = expenses.reduce((s, r) => s + num(r.amount), 0);
  const monthlyContractCharges = 0;
  const totalIncome = manifestTotal + otherIncomeTotal;

  const insert = await supabase.from("closed_trips").insert({
    trip_code: String(t.trip_code ?? ""),
    branch_id: (t.branch_id as string) ?? null,
    branch_name: String(branch?.branch_name ?? ""),
    vehicle_id: (t.vehicle_id as string) ?? null,
    driver_id: (t.driver_id as string) ?? null,
    transporter_id: (t.transporter_id as string) ?? null,
    start_date: String(t.start_date ?? ""),
    end_date: String(t.end_date ?? ""),
    total_income: totalIncome,
    total_expense: expenseTotal,
    net_income: totalIncome - expenseTotal,
    snapshot: {
      trip: t,
      manifests,
      manifest_lines: manifestLines,
      other_income: otherIncome,
      expenses,
      sources: Object.fromEntries(sourcesMap),
      source_entries: allEntries,
      vehicle,
      driver,
      transporter,
      branch,
      totals: {
        manifest_income: manifestTotal,
        other_income: otherIncomeTotal,
        total_income: totalIncome,
        total_expense: expenseTotal,
        net_income: totalIncome - expenseTotal,
        monthly_contract_charges: monthlyContractCharges,
      },
      closed_at: new Date().toISOString(),
    },
  } as never);
  if (insert.error) throw new Error(insert.error.message);

  const tripCode  = String(t.trip_code ?? "");
  const tripDate  = String(t.end_date || new Date().toISOString().split("T")[0]);

  // All known standard expense names — anything else goes to "other"
  // Hire Charges and Approval Charge are transporter-specific and handled separately
  // (Approval Charge is now stored in other income for rented trips, not expenses)
  const ALL_KNOWN_EXPENSES = [
    "Fuel Expense", "Toll Charges", "Driver Bata",
    "Morning Exp.", "Night Exp.", "Sunday",
    "Parking Charges", "Dala Charges", "Unloading",
    "Hire Charges", "Approval Charge",
  ];

  const expSum = (name: string) =>
    expenses.filter((e: any) => e.expense_name === name).reduce((s, e) => s + num(e.amount), 0);
  const incomeSum = (name: string) =>
    otherIncome.filter((i: any) => i.income_name === name).reduce((s, i) => s + num(i.amount), 0);

  // ── Fastag deduction ────────────────────────────────────────────────────────
  if (t.vehicle_id) {
    const totalToll = expSum("Toll Charges");
    if (totalToll > 0) {
      await supabase.from("fastag_transactions" as any).insert({
        vehicle_id: t.vehicle_id,
        transaction_type: "deduction",
        amount: totalToll,
        transaction_date: tripDate,
        note: `Toll Charges (Trip ${tripCode})`,
        trip_code: tripCode,
      });
    }
  }

  // ── Vehicle expense log (fuel, parking, odometer) ───────────────────────────
  if (t.vehicle_id) {
    const fuel    = expSum("Fuel Expense");
    const parking = expSum("Parking Charges");
    const odoStart = t.odometer_start != null && t.odometer_start !== "" ? num(t.odometer_start as string) : null;
    const odoEnd   = t.odometer_end   != null && t.odometer_end   !== "" ? num(t.odometer_end   as string) : null;
    if (fuel > 0 || parking > 0 || odoStart != null || odoEnd != null) {
      const { error: vErr } = await supabase.from("vehicle_trip_logs" as any).insert({
        trip_code: tripCode,
        vehicle_id: t.vehicle_id,
        trip_date: tripDate,
        fuel_expense: fuel,
        parking_charges: parking,
        odometer_start: odoStart,
        odometer_end: odoEnd,
      });
      if (vErr) throw new Error("Vehicle log: " + vErr.message);
    }
  }

  // ── Driver expense log (bata, morning, night) ────────────────────────────────
  if (t.driver_id) {
    const bata    = expSum("Driver Bata");
    const morning = expSum("Morning Exp.");
    const night   = expSum("Night Exp.");
    if (bata > 0 || morning > 0 || night > 0) {
      const { error: dErr } = await supabase.from("driver_expense_logs" as any).insert({
        trip_code: tripCode,
        driver_id: t.driver_id,
        trip_date: tripDate,
        driver_bata: bata,
        morning_exp: morning,
        night_exp: night,
      });
      if (dErr) throw new Error("Driver log: " + dErr.message);
    }
  }

  // ── Transporter expense log (hire charges, approval charge) ───────────────────
  // Hire Charges come from expenses; Approval Charge comes from other income (rented trips).
  if (t.transporter_id) {
    const hireCharges = expSum("Hire Charges");
    const approvalCharge = incomeSum("Approval Charge");
    if (hireCharges > 0 || approvalCharge > 0) {
      const { error: teErr } = await supabase.from("transporter_expense_logs" as any).insert({
        trip_code: tripCode,
        transporter_id: t.transporter_id,
        trip_date: tripDate,
        hire_charges: hireCharges,
        approval_charge: approvalCharge,
      });
      if (teErr) throw new Error("Transporter log: " + teErr.message);
    }
  }

  // ── Other expense log (dala, unloading, sunday + any non-standard names) ────
  const dala      = expSum("Dala Charges");
  const unloading = expSum("Unloading");
  const sunday    = expSum("Sunday");
  const otherExps = expenses.filter((e: any) => !ALL_KNOWN_EXPENSES.includes(e.expense_name));
  const otherAmt  = otherExps.reduce((s, e) => s + num(e.amount), 0);
  if (dala > 0 || unloading > 0 || sunday > 0 || otherAmt > 0) {
    const { error: oErr } = await supabase.from("other_expense_logs" as any).insert({
      trip_code: tripCode,
      trip_date: tripDate,
      dala_charges: dala,
      unloading: unloading,
      sunday_exp: sunday,
      other_amount: otherAmt,
      other_details: otherExps.map((e: any) => ({ name: e.expense_name, amount: num(e.amount) })),
    });
    if (oErr) throw new Error("Other log: " + oErr.message);
  }

  await Promise.all([
    supabase.from("trip_manifests").delete().eq("trip_id", tripId),
    supabase.from("trip_other_income").delete().eq("trip_id", tripId),
    supabase.from("trip_expenses").delete().eq("trip_id", tripId),
  ]);
  const del = await supabase.from("trips").delete().eq("id", tripId);
  if (del.error) throw new Error(del.error.message);
}
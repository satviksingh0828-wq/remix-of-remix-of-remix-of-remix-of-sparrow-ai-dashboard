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

  const [vehicle, driver, transporter, branch, contract] = await Promise.all([
    one("vehicles", t.vehicle_id),
    one("drivers", t.driver_id),
    one("transporters", t.transporter_id),
    one("branches", t.branch_id),
    one("contracts", t.contract_id),
  ]);

  let entries: EntryLite[] = [];
  if (t.contract_id) {
    const { data } = await supabase
      .from("contract_entries")
      .select("*")
      .eq("contract_id", t.contract_id as string);
    entries = (data as unknown as EntryLite[]) ?? [];
  }

  const contractLite = contract as unknown as ContractLite | null;
  const manifestLines = manifests.map((m) => {
    const charges = manifestCharges(
      contractLite ?? undefined,
      findEntry(entries, m as never),
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
      contract,
      contract_entries: entries,
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

  await Promise.all([
    supabase.from("trip_manifests").delete().eq("trip_id", tripId),
    supabase.from("trip_other_income").delete().eq("trip_id", tripId),
    supabase.from("trip_expenses").delete().eq("trip_id", tripId),
  ]);
  const del = await supabase.from("trips").delete().eq("id", tripId);
  if (del.error) throw new Error(del.error.message);
}
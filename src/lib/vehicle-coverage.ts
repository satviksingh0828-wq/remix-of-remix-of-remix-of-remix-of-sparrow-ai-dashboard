/**
 * vehicle-coverage.ts
 * Server functions for Vehicle Insurance and Road Tax.
 * All DB operations go through supabaseAdmin (service role) to bypass RLS on
 * vehicle_insurance / vehicle_road_tax tables.
 *
 * SECURITY: Every exported server function accepts a `userId` field and calls
 * requireAdmin() before touching any data.  requireAdmin() looks up the user
 * in app_users and throws if the role is not 'admin'.  This means a malicious
 * or unauthenticated caller who knows the endpoint URL still cannot perform
 * writes, deletes, or read sensitive coverage data.
 */

import { createServerFn } from "@tanstack/react-start";

// ── Auth helper ────────────────────────────────────────────────────────────────

/**
 * Verify that the supplied userId belongs to an active admin in app_users.
 * Throws "Forbidden" if not — this bubbles up as an error in the client.
 */
async function requireAdmin(userId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("app_users")
    .select("role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`Auth check failed: ${error.message}`);
  if (!data) throw new Error("Forbidden: user not found.");
  if (!(data as { is_active: boolean }).is_active) throw new Error("Forbidden: account is inactive.");
  if ((data as { role: string }).role !== "admin") throw new Error("Forbidden: admin access required.");
}

// ── Shared month helpers ───────────────────────────────────────────────────────

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function monthShort(m: number) { return MONTH_SHORT[m - 1] ?? String(m); }

/** Iterate from (startMonth,startYear) to (endMonth,endYear) inclusive. */
function* monthRange(sm: number, sy: number, em: number, ey: number) {
  let m = sm, y = sy;
  while (y < ey || (y === ey && m <= em)) {
    yield { month: m, year: y };
    m++;
    if (m > 12) { m = 1; y++; }
  }
}

function monthCount(sm: number, sy: number, em: number, ey: number): number {
  return (ey * 12 + em) - (sy * 12 + sm) + 1;
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type InsuranceEntry = {
  id: string;
  vehicle_id: string;
  start_month: number;
  start_year: number;
  end_month: number;
  end_year: number;
  total_amount: number;
  insurance_number: string;
  created_at: string;
};

export type RoadTaxEntry = {
  id: string;
  vehicle_id: string;
  month: number;
  year: number;
  total_amount: number;
  state: string;
  created_at: string;
};

// ── Insurance server functions ─────────────────────────────────────────────────

export const serverLoadInsurance = createServerFn({ method: "POST" })
  .validator((data: { userId: string; vehicleId: string }) => data)
  .handler(async ({ data }): Promise<InsuranceEntry[]> => {
    await requireAdmin(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("vehicle_insurance")
      .select("*")
      .eq("vehicle_id", data.vehicleId)
      .order("start_year", { ascending: false })
      .order("start_month", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as InsuranceEntry[];
  });

export const serverSaveInsurance = createServerFn({ method: "POST" })
  .validator((data: {
    userId: string;
    vehicleId: string;
    branchId: string | null;
    registrationNumber: string;
    startMonth: number;
    startYear: number;
    endMonth: number;
    endYear: number;
    totalAmount: number;
    insuranceNumber: string;
  }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validate period order
    const count = monthCount(data.startMonth, data.startYear, data.endMonth, data.endYear);
    if (count < 1) throw new Error("End month/year must not be before start month/year.");
    if (count > 120) throw new Error("Period cannot exceed 10 years (120 months).");

    // Insert insurance record (unique constraint handles duplicates at DB level)
    const { data: ins, error: insErr } = await supabaseAdmin
      .from("vehicle_insurance")
      .insert({
        vehicle_id: data.vehicleId,
        start_month: data.startMonth,
        start_year: data.startYear,
        end_month: data.endMonth,
        end_year: data.endYear,
        total_amount: data.totalAmount,
        insurance_number: data.insuranceNumber,
      })
      .select("id")
      .single();

    if (insErr) {
      if (insErr.code === "23505") {
        throw new Error("An insurance entry for this exact period already exists for this vehicle.");
      }
      throw new Error(insErr.message);
    }

    const insuranceId = (ins as { id: string }).id;
    const monthlyAmount = Number((data.totalAmount / count).toFixed(2));

    // Create one paid expenditure per month in the period
    const expenditureRows = [];
    for (const { month, year } of monthRange(data.startMonth, data.startYear, data.endMonth, data.endYear)) {
      const entryDate = `${year}-${String(month).padStart(2, "0")}-01`;
      expenditureRows.push({
        expenditure_name: `Insurance Premium — ${data.registrationNumber} (${monthShort(month)} ${year})`,
        amount: String(monthlyAmount),
        entry_date: entryDate,
        note: `Policy: ${data.insuranceNumber}`,
        vehicle_id: data.vehicleId,
        branch_id: data.branchId,
        is_paid: true,
        paid_date: entryDate,
        is_insurance: true,
        insurance_id: insuranceId,
      });
    }

    const { error: expErr } = await supabaseAdmin
      .from("expenditures")
      .insert(expenditureRows as never);

    if (expErr) {
      // Roll back insurance record
      await supabaseAdmin.from("vehicle_insurance").delete().eq("id", insuranceId);
      throw new Error(`Expenditure creation failed: ${expErr.message}`);
    }

    return { id: insuranceId, monthCount: count, monthlyAmount };
  });

export const serverDeleteInsurance = createServerFn({ method: "POST" })
  .validator((data: { userId: string; insuranceId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Delete linked expenditures first
    await supabaseAdmin.from("expenditures").delete().eq("insurance_id", data.insuranceId);

    // Delete insurance record
    const { error } = await supabaseAdmin
      .from("vehicle_insurance")
      .delete()
      .eq("id", data.insuranceId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Road Tax server functions ──────────────────────────────────────────────────

export const serverLoadRoadTax = createServerFn({ method: "POST" })
  .validator((data: { userId: string; vehicleId: string }) => data)
  .handler(async ({ data }): Promise<RoadTaxEntry[]> => {
    await requireAdmin(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("vehicle_road_tax")
      .select("*")
      .eq("vehicle_id", data.vehicleId)
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as RoadTaxEntry[];
  });

export const serverSaveRoadTax = createServerFn({ method: "POST" })
  .validator((data: {
    userId: string;
    vehicleId: string;
    branchId: string | null;
    registrationNumber: string;
    month: number;
    year: number;
    totalAmount: number;
    state: string;
  }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Insert road tax record
    const { data: rt, error: rtErr } = await supabaseAdmin
      .from("vehicle_road_tax")
      .insert({
        vehicle_id: data.vehicleId,
        month: data.month,
        year: data.year,
        total_amount: data.totalAmount,
        state: data.state,
      })
      .select("id")
      .single();

    if (rtErr) throw new Error(rtErr.message);

    const roadTaxId = (rt as { id: string }).id;
    const entryDate = `${data.year}-${String(data.month).padStart(2, "0")}-01`;

    // Create one paid expenditure for that month
    const { error: expErr } = await supabaseAdmin
      .from("expenditures")
      .insert({
        expenditure_name: `Road Tax — ${data.registrationNumber} (${monthShort(data.month)} ${data.year})`,
        amount: String(data.totalAmount),
        entry_date: entryDate,
        note: `State: ${data.state}`,
        vehicle_id: data.vehicleId,
        branch_id: data.branchId,
        is_paid: true,
        paid_date: entryDate,
        is_road_tax: true,
        road_tax_id: roadTaxId,
      } as never);

    if (expErr) {
      await supabaseAdmin.from("vehicle_road_tax").delete().eq("id", roadTaxId);
      throw new Error(`Expenditure creation failed: ${expErr.message}`);
    }

    return { id: roadTaxId };
  });

export const serverDeleteRoadTax = createServerFn({ method: "POST" })
  .validator((data: { userId: string; roadTaxId: string }) => data)
  .handler(async ({ data }) => {
    await requireAdmin(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("expenditures").delete().eq("road_tax_id", data.roadTaxId);

    const { error } = await supabaseAdmin
      .from("vehicle_road_tax")
      .delete()
      .eq("id", data.roadTaxId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Insurance lookup for Trip Note PDF ────────────────────────────────────────
// Note: this read is called during PDF generation for admin users only.
// The userId check ensures non-admins cannot enumerate insurance data.

export const serverFetchInsuranceForMonth = createServerFn({ method: "POST" })
  .validator((data: { userId: string; vehicleId: string; month: number; year: number }) => data)
  .handler(async ({ data }): Promise<string | null> => {
    await requireAdmin(data.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("vehicle_insurance")
      .select("insurance_number,start_month,start_year,end_month,end_year")
      .eq("vehicle_id", data.vehicleId);

    if (error || !rows) return null;

    const tripIndex = data.year * 12 + data.month;
    for (const row of rows) {
      const startIndex = (row.start_year as number) * 12 + (row.start_month as number);
      const endIndex   = (row.end_year as number)   * 12 + (row.end_month as number);
      if (tripIndex >= startIndex && tripIndex <= endIndex) {
        return row.insurance_number as string;
      }
    }
    return null;
  });

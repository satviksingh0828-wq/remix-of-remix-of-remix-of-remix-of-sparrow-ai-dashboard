import { createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import { financialYearRange } from "@/lib/financial-year";

export type ReportFilters = { branchId: string; financialYear: string };
export const ReportFiltersContext = createContext<ReportFilters>({
  branchId: "all",
  financialYear: "none",
});
export const useReportFilters = () => useContext(ReportFiltersContext);

export function reportDateRange(
  financialYear: string,
  fallback: () => { start: string; end: string },
) {
  return financialYear === "none" ? fallback() : financialYearRange(Number(financialYear));
}

export async function tripCodesForBranch(branchId: string) {
  if (branchId === "all") return null;
  const rows = await fetchAll<{ trip_code: string }>(() =>
    supabase.from("closed_trips").select("trip_code").eq("branch_id", branchId),
  );
  return new Set(rows.map((row) => row.trip_code));
}

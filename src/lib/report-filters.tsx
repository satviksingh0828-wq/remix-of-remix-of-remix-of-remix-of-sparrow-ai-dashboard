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

export async function tripCodesForBranch(branchId: string, range?: { start: string; end: string }) {
  if (branchId === "all" && !range) return null;
  const rows = await fetchAll<{ trip_code: string }>(() =>
    (() => {
      let query = supabase.from("closed_trips").select("trip_code");
      if (branchId !== "all") query = query.eq("branch_id", branchId);
      if (range) query = query.gte("closed_at", range.start).lt("closed_at", range.end);
      return query;
    })(),
  );
  return new Set(rows.map((row) => row.trip_code));
}

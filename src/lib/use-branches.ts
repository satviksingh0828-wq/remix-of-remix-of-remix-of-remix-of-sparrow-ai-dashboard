import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BranchOption = { id: string; branch_name: string; branch_type: string | null };

export function useBranches() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("branches")
        .select("id,branch_name,branch_type")
        .order("branch_name", { ascending: true });
      setBranches((data as BranchOption[]) ?? []);
    })();
  }, []);
  return branches;
}

export function branchName(branches: BranchOption[], id: string | null | undefined) {
  if (!id) return "";
  return branches.find((b) => b.id === id)?.branch_name ?? "";
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DeptOption = { id: string; name: string; code: string | null };

export function useDepartments() {
  const [depts, setDepts] = useState<DeptOption[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("departments")
        .select("id,name,code")
        .order("name", { ascending: true });
      setDepts((data as DeptOption[]) ?? []);
    })();
  }, []);
  return depts;
}

export function deptName(depts: DeptOption[], id: string | null | undefined) {
  if (!id) return "";
  return depts.find((d) => d.id === id)?.name ?? "";
}

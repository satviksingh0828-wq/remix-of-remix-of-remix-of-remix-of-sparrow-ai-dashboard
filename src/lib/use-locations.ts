import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/fetch-all";
import type { LocationOption } from "@/components/LocationPicker";

export function useLocations() {
  const [locations, setLocations] = useState<LocationOption[]>([]);

  const reload = useCallback(async () => {
    const rows = await fetchAll<LocationOption>(() =>
      supabase
        .from("locations")
        .select("id,location_name,location_type,city,state,pin_code")
        .order("location_name", { ascending: true }),
    );
    setLocations(rows);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { locations, reload };
}

export function locationById(list: LocationOption[], id: string | null | undefined) {
  if (!id) return undefined;
  return list.find((l) => l.id === id);
}

export function locationByPin(list: LocationOption[], pin: string) {
  const p = (pin || "").trim();
  if (!p) return undefined;
  return list.find((l) => (l.pin_code ?? "").trim() === p);
}

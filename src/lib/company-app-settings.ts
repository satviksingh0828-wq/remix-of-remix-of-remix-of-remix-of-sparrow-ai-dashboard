import { supabase } from "@/integrations/supabase/client";
import { formatCompanyAddress, type CompanyAddressSource } from "@/lib/company-address";

export type CompanyAppSettingsSource = CompanyAddressSource & {
  company_name?: string | null;
};

/** Keeps the HR app settings identity in sync with the canonical company record. */
export async function syncCompanyToAppSettings(company: CompanyAppSettingsSource): Promise<void> {
  const values = {
    company_name: company.company_name?.trim() ?? "",
    company_address: formatCompanyAddress(company),
  };
  const { data: current, error: readError } = await supabase
    .from("app_settings")
    .select("id,company_name,company_address")
    .limit(1)
    .maybeSingle();

  if (readError) throw readError;
  if (
    current?.company_name === values.company_name &&
    current?.company_address === values.company_address
  ) {
    return;
  }

  const { error } = current?.id
    ? await supabase.from("app_settings").update(values).eq("id", current.id)
    : await supabase.from("app_settings").insert(values);
  if (error) throw error;
}

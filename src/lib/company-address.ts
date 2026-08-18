export type CompanyAddressSource = {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

/** Builds the single address displayed in app headers and generated documents. */
export function formatCompanyAddress(company: CompanyAddressSource): string {
  return [
    company.address_line1,
    company.address_line2,
    company.city,
    company.state,
    company.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(", ");
}

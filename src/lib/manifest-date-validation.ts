export type ManifestDateValue = {
  manifest_number?: string | null;
  manifest_date?: string | null;
};

function utcDay(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000;
}

/** Returns manifests with a missing date or a date over two days before trip start. */
export function invalidManifestDates(
  tripStartDate: string | null | undefined,
  manifests: ManifestDateValue[],
): ManifestDateValue[] {
  const tripDay = utcDay(tripStartDate ?? "");
  if (tripDay == null) return [];
  return manifests.filter((manifest) => {
    const manifestDay = utcDay(manifest.manifest_date ?? "");
    return manifestDay == null || tripDay - manifestDay > 2;
  });
}

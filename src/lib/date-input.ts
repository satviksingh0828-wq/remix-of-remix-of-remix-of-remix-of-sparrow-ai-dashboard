/** Convert common spreadsheet/user date values to PostgreSQL's YYYY-MM-DD format. */
export function normalizeImportedDate(raw: unknown): string {
  if (raw == null) return "";
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);

  const value = String(raw).trim();
  if (!value) return "";

  // Excel's 1900 date system (including its historic leap-year offset).
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial > 0 && serial < 2_958_466) {
      const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
      return date.toISOString().slice(0, 10);
    }
  }

  const iso = value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // For ambiguous numeric dates, use the Indian/European day-first convention.
  const dayFirst = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (dayFirst) {
    let year = Number(dayFirst[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    return validDate(year, Number(dayFirst[2]), Number(dayFirst[1]));
  }

  // Handles month names and standard Excel renderings such as 8 Aug 2026.
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return validDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  throw new Error(`Unsupported date "${value}"`);
}

function validDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Invalid date ${day}/${month}/${year}`);
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

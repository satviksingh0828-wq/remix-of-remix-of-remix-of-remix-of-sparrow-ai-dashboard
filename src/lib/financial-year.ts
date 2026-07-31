export type FinancialYearOption = { value: string; label: string };

export function financialYearRange(startYear: number) {
  return {
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-04-01`,
  };
}

export function financialYearLabel(startYear: number) {
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function financialYearOptions(currentYear = new Date().getFullYear(), past = 4, future = 1): FinancialYearOption[] {
  return Array.from({ length: past + future + 1 }, (_, i) => {
    const startYear = currentYear - past + i;
    return { value: String(startYear), label: financialYearLabel(startYear) };
  });
}

export function dateInFinancialYear(date: string, financialYearStart: string) {
  if (financialYearStart === "none") return true;
  const y = Number(financialYearStart);
  return date >= `${y}-04-01` && date < `${y + 1}-04-01`;
}

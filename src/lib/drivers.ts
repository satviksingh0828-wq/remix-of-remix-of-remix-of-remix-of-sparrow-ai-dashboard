/** A driver remains active through their ending date. */
export function isDriverActive(
  driver: { ending_date?: unknown },
  today: unknown = new Date(),
): boolean {
  const endingDate = typeof driver.ending_date === "string" ? driver.ending_date : "";
  if (!endingDate) return true;

  const date = today instanceof Date ? today : new Date();
  const localToday = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
  return endingDate >= localToday;
}


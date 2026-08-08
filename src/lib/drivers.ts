/** A driver remains active through their ending date. */
export function isDriverActive(
  driver: { ending_date?: unknown },
  today = new Date(),
): boolean {
  const endingDate = typeof driver.ending_date === "string" ? driver.ending_date : "";
  if (!endingDate) return true;

  const localToday = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
  return endingDate >= localToday;
}


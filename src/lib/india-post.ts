/**
 * india-post.ts
 * Thin wrapper around the free Indian Postal Pincode API.
 * https://api.postalpincode.in/pincode/{PIN}
 *
 * No auth required. Returns district, state, country and the list of
 * post-office names for a given 6-digit Indian PIN code.
 */

export type PinLookupResult = {
  pincode: string;
  district: string;
  state: string;
  country: string;
  /** All post-office names under this PIN — first one is a good location name suggestion. */
  postOffices: string[];
};

/**
 * Look up a 6-digit Indian PIN code.
 * Returns null if the PIN is invalid, unknown, or the API fails.
 */
export async function lookupIndiaPin(pin: string): Promise<PinLookupResult | null> {
  if (!/^\d{6}$/.test(pin.trim())) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin.trim()}`);
    if (!res.ok) return null;
    const json = await res.json();
    if (!Array.isArray(json) || json[0]?.Status !== "Success") return null;
    const offices: Array<{ Name: string; District: string; State: string; Country: string }> =
      json[0].PostOffice ?? [];
    if (!offices.length) return null;
    const first = offices[0];
    return {
      pincode: pin.trim(),
      district: first.District ?? "",
      state: first.State ?? "",
      country: first.Country ?? "",
      postOffices: offices.map((o) => o.Name),
    };
  } catch {
    return null;
  }
}

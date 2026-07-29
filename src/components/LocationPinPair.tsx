import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/LocationPicker";
import { locationByPin, locationById, useLocations } from "@/lib/use-locations";
import { ensureLocationForPin } from "@/lib/ensure-location";

/**
 * Location + PIN code pair with two-way auto-fill.
 * - Picking a location fills its PIN.
 * - Typing a known PIN fills the location.
 * - Typing an unknown 6-digit PIN calls Indian Post API and silently
 *   saves the location — no prompt needed.
 */
export function LocationPinPair({
  label,
  locationId,
  pinCode,
  onChange,
}: {
  label: string;
  locationId: string | null | undefined;
  pinCode: string;
  onChange: (next: { location_id: string | null; pin_code: string }) => void;
}) {
  const { locations, reload } = useLocations();
  const [pinLooking, setPinLooking] = useState(false);

  function handleLocation(id: string | null, picked?: { pin_code: string | null }) {
    const loc = picked ?? locationById(locations, id);
    onChange({ location_id: id, pin_code: loc?.pin_code ?? (id ? pinCode : "") });
  }

  async function handlePin(pin: string) {
    // Always update the raw pin value immediately
    onChange({ location_id: locationId ?? null, pin_code: pin });

    // Check local list first — no API call needed
    const match = locationByPin(locations, pin);
    if (match) {
      onChange({ location_id: match.id, pin_code: pin });
      return;
    }

    // Unknown 6-digit PIN — auto-fetch from Indian Post and silently save
    if (/^\d{6}$/.test(pin)) {
      setPinLooking(true);
      const id = await ensureLocationForPin(pin);
      setPinLooking(false);
      if (id) {
        await reload();
        onChange({ location_id: id, pin_code: pin });
      }
    }
  }

  return (
    <>
      <LocationPicker
        label={`${label} Location`}
        value={locationId}
        onChange={(id, loc) => handleLocation(id, loc)}
      />
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{label} PIN Code</Label>
        <div className="relative">
          <Input
            className="h-10"
            value={pinCode}
            placeholder="PIN auto-fills the location"
            onChange={(e) => handlePin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          {pinLooking && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

      </div>
    </>
  );
}

import { LocationPicker } from "@/components/LocationPicker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { locationByPin, locationById, useLocations } from "@/lib/use-locations";

/**
 * Location + PIN code pair with two-way auto-fill:
 * picking a location fills its PIN, typing a known PIN fills the location.
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
  const { locations } = useLocations();

  function handleLocation(id: string | null) {
    const loc = locationById(locations, id);
    onChange({ location_id: id, pin_code: loc?.pin_code ?? (id ? pinCode : "") });
  }

  function handlePin(pin: string) {
    const match = locationByPin(locations, pin);
    if (match) onChange({ location_id: match.id, pin_code: pin });
    else onChange({ location_id: locationId ?? null, pin_code: pin });
  }

  return (
    <>
      <LocationPicker
        label={`${label} Location`}
        value={locationId}
        onChange={(id) => handleLocation(id)}
        onPinCode={(pin) => onChange({ location_id: locationId ?? null, pin_code: pin })}
      />
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">{label} PIN Code</Label>
        <Input
          className="h-10"
          value={pinCode}
          placeholder="PIN auto-fills the location"
          onChange={(e) => handlePin(e.target.value)}
        />
      </div>
    </>
  );
}

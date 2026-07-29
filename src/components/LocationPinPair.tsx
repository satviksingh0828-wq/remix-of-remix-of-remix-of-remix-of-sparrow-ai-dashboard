import { useState } from "react";
import { Check, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationPicker } from "@/components/LocationPicker";
import { locationByPin, locationById, useLocations } from "@/lib/use-locations";
import { lookupIndiaPin, type PinLookupResult } from "@/lib/india-post";

/**
 * Location + PIN code pair with two-way auto-fill.
 * - Picking a location fills its PIN.
 * - Typing a known PIN fills the location.
 * - Typing an unknown 6-digit PIN calls Indian Post API and offers
 *   a one-click "save as new location" card.
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

  // Indian Post suggestion state
  const [pinLooking, setPinLooking] = useState(false);
  const [suggestion, setSuggestion] = useState<PinLookupResult | null>(null);
  const [suggestedName, setSuggestedName] = useState("");
  const [savingLoc, setSavingLoc] = useState(false);

  function handleLocation(id: string | null, picked?: { pin_code: string | null }) {
    const loc = picked ?? locationById(locations, id);
    setSuggestion(null);
    onChange({ location_id: id, pin_code: loc?.pin_code ?? (id ? pinCode : "") });
  }

  async function handlePin(pin: string) {
    // Always update the raw pin value immediately
    onChange({ location_id: locationId ?? null, pin_code: pin });
    setSuggestion(null);

    // Check local DB first
    const match = locationByPin(locations, pin);
    if (match) {
      onChange({ location_id: match.id, pin_code: pin });
      return;
    }

    // Unknown PIN — if 6 digits, call Indian Post API
    if (/^\d{6}$/.test(pin)) {
      setPinLooking(true);
      const result = await lookupIndiaPin(pin);
      setPinLooking(false);
      if (result) {
        setSuggestion(result);
        setSuggestedName(result.district);
      }
    }
  }

  async function saveAsLocation() {
    if (!suggestion || !suggestedName.trim()) return;
    setSavingLoc(true);
    const { data, error } = await supabase
      .from("locations")
      .insert({
        location_name: suggestedName.trim(),
        location_type: "Domestic",
        city: suggestion.district,
        district: suggestion.district,
        state: suggestion.state,
        country: suggestion.country,
        pin_code: suggestion.pincode,
      })
      .select("id,location_name,location_type,city,state,pin_code")
      .single();
    setSavingLoc(false);
    if (error || !data) return toast.error(error?.message ?? "Failed to save location");
    toast.success(`Location "${suggestedName.trim()}" created`);
    await reload();
    onChange({ location_id: (data as { id: string }).id, pin_code: suggestion.pincode });
    setSuggestion(null);
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

        {/* Inline suggestion card */}
        {suggestion && !pinLooking && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span>{suggestion.district}, {suggestion.state}</span>
              </div>
              <button
                type="button"
                onClick={() => setSuggestion(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              PIN {suggestion.pincode} not in your location list. Save it as a new location?
            </p>
            <div className="flex gap-2">
              <Input
                className="h-8 text-xs"
                value={suggestedName}
                onChange={(e) => setSuggestedName(e.target.value)}
                placeholder="Location name"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 shrink-0"
                disabled={savingLoc || !suggestedName.trim()}
                onClick={saveAsLocation}
              >
                {savingLoc
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Check className="size-3.5" />
                }
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

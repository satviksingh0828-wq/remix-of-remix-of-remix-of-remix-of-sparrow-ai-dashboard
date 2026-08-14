import type { Json } from "@/integrations/supabase/types";

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function sessionToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

type DriverTripRpc = {
  trip?: {
    id?: string;
    trip_code?: string;
    start_date?: string | null;
    start_time?: string | null;
    source?: { name?: string | null; city?: string | null; state?: string | null } | null;
    destination?: { name?: string | null; city?: string | null; state?: string | null } | null;
    vehicle?: { registration_number?: string | null; manufacturer?: string | null; model?: string | null; nickname?: string | null } | null;
    driver?: { name?: string | null; mobile_number?: string | null; code?: string | null } | null;
    manifests?: Array<{ manifest_number?: string | null; weight_kg?: string | number | null; quantity?: string | number | null }>;
  };
};

function placeName(place?: { name?: string | null; city?: string | null; state?: string | null } | null) {
  return [place?.name, place?.city, place?.state].filter(Boolean).join(", ") || null;
}

export function publicTripDetails(raw: Json) {
  const payload = raw as unknown as DriverTripRpc;
  const trip = payload.trip;
  if (!trip?.id || !trip.trip_code) throw new Error("Trip details are incomplete.");
  const manifests = trip.manifests ?? [];
  const firstManifest = manifests[0];
  const totalWeight = manifests.reduce((sum, manifest) => sum + (Number(manifest.weight_kg) || 0), 0);
  const totalQuantity = manifests.reduce((sum, manifest) => sum + (Number(manifest.quantity) || 0), 0);

  return {
    id: trip.id,
    tripCode: trip.trip_code,
    status: "open",
    manifestNumber: firstManifest?.manifest_number ?? null,
    manifestCount: manifests.length,
    source: placeName(trip.source),
    destination: placeName(trip.destination),
    weight: totalWeight || firstManifest?.weight_kg || null,
    quantity: totalQuantity || firstManifest?.quantity || null,
    vehicle: {
      number: trip.vehicle?.registration_number ?? null,
      type: [trip.vehicle?.manufacturer, trip.vehicle?.model].filter(Boolean).join(" ") || trip.vehicle?.nickname || null,
      model: trip.vehicle?.model ?? null,
    },
    driver: {
      name: trip.driver?.name ?? null,
      phone: trip.driver?.mobile_number ?? null,
      licenseNumber: trip.driver?.code ?? null,
    },
    manifests,
  };
}

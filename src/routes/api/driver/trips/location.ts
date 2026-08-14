import { createFileRoute } from "@tanstack/react-router";

import { jsonError, sessionToken } from "@/lib/driver-api";

type LocationInput = { latitude?: unknown; longitude?: unknown; accuracy?: unknown };

export const Route = createFileRoute("/api/driver/trips/location")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = sessionToken(request);
        if (!token) return jsonError("An active trip session is required.", 401);
        try {
          const body = await request.json() as { locations?: LocationInput[] };
          const locations = Array.isArray(body.locations) ? body.locations.slice(0, 100) : [];
          if (!locations.length) return jsonError("At least one location point is required.");
          const valid = locations.map((location) => ({
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            accuracy: location.accuracy == null ? null : Number(location.accuracy),
          })).filter((location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && location.latitude >= -90 && location.latitude <= 90 && location.longitude >= -180 && location.longitude <= 180);
          if (!valid.length) return jsonError("No valid location points were supplied.");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          for (const location of valid) {
            const { error } = await supabaseAdmin.rpc("record_driver_location", {
              p_session_token: token,
              p_latitude: location.latitude,
              p_longitude: location.longitude,
              p_accuracy_m: Number.isFinite(location.accuracy) ? location.accuracy : null,
            });
            if (error) throw error;
          }
          return Response.json({ accepted: valid.length });
        } catch (error) {
          return jsonError(error instanceof Error ? error.message : "Location update failed.", 400);
        }
      },
    },
  },
});

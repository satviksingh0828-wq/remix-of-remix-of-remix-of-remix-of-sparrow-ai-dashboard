import { createFileRoute } from "@tanstack/react-router";

import { jsonError, sessionToken } from "@/lib/driver-api";

type LocationInput = { checkpoint_id?: unknown; latitude?: unknown; longitude?: unknown; accuracy?: unknown; recorded_at?: unknown };

export const Route = createFileRoute("/api/driver/trips/location")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = sessionToken(request);
        if (!token) return jsonError("An active trip session is required.", 401);
        try {
          const body = await request.json() as { locations?: LocationInput[] };
          const locations = Array.isArray(body.locations) ? body.locations.slice(0, 250) : [];
          if (!locations.length) return jsonError("At least one location point is required.");
          const valid = locations.map((location) => ({
            checkpointId: typeof location.checkpoint_id === "string" ? location.checkpoint_id.trim() || null : null,
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            accuracy: location.accuracy == null ? null : Number(location.accuracy),
            recordedAt: typeof location.recorded_at === "string" && !Number.isNaN(new Date(location.recorded_at).getTime()) ? location.recorded_at : null,
          })).filter((location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && location.latitude >= -90 && location.latitude <= 90 && location.longitude >= -180 && location.longitude <= 180);
          if (!valid.length) return jsonError("No valid location points were supplied.");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Supabase generated types intentionally lag manual SQL migrations.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const db = supabaseAdmin as any;
          const { data, error } = await db.rpc("record_driver_locations", {
            p_session_token: token,
            p_locations: valid.map((location) => ({
              checkpoint_id: location.checkpointId,
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: Number.isFinite(location.accuracy) ? location.accuracy : null,
              recorded_at: location.recordedAt,
            })),
          });
          if (error) throw error;
          return Response.json({ accepted: Math.max(0, Number(data?.accepted) || 0) });
        } catch (error) {
          return jsonError(error instanceof Error ? error.message : "Location update failed.", 400);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

import { jsonError, publicTripDetails, sessionToken } from "@/lib/driver-api";

export const Route = createFileRoute("/api/driver/trips/current")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = sessionToken(request);
        if (!token) return jsonError("An active trip session is required.", 401);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("get_driver_trip", { p_session_token: token });
          if (error) throw error;
          return Response.json({ trip: publicTripDetails(data) });
        } catch (error) {
          return jsonError(error instanceof Error ? error.message : "Trip details could not be loaded.", 401);
        }
      },
    },
  },
});

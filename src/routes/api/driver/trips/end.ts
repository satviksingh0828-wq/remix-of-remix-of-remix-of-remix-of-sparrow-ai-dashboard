import { createFileRoute } from "@tanstack/react-router";

import { jsonError, sessionToken } from "@/lib/driver-api";

export const Route = createFileRoute("/api/driver/trips/end")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = sessionToken(request);
        if (!token) return jsonError("An active trip session is required.", 401);
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.rpc("end_driver_trip", { p_session_token: token });
          if (error) throw error;
          return Response.json(data);
        } catch (error) {
          return jsonError(error instanceof Error ? error.message : "Trip could not be ended.", 400);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

import { jsonError, sessionToken } from "@/lib/driver-api";

export const Route = createFileRoute("/api/driver/trips/end")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = sessionToken(request);
        if (!token) return jsonError("An active trip session is required.", 401);
        try {
          const body = (await request.json().catch(() => ({}))) as {
            endDate?: unknown;
            endTime?: unknown;
            odometerEnd?: unknown;
          };
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Supabase generated types intentionally lag manual SQL migrations.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabaseAdmin as any).rpc("end_driver_trip", {
            p_session_token: token,
            p_end_date: typeof body.endDate === "string" ? body.endDate : null,
            p_end_time: typeof body.endTime === "string" ? body.endTime : null,
            p_odometer_end: typeof body.odometerEnd === "string" ? body.odometerEnd : null,
          });
          if (error) throw error;
          return Response.json(data);
        } catch (error) {
          return jsonError(
            error instanceof Error ? error.message : "Trip could not be ended.",
            400,
          );
        }
      },
    },
  },
});

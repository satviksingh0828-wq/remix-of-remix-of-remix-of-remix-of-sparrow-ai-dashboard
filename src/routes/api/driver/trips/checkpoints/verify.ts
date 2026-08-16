import { createFileRoute } from "@tanstack/react-router";

import { jsonError, sessionToken } from "@/lib/driver-api";

export const Route = createFileRoute("/api/driver/trips/checkpoints/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = sessionToken(request);
        if (!token) return jsonError("An active trip session is required.", 401);
        try {
          const body = await request.json() as { checkpoint_ids?: unknown };
          const checkpointIds = Array.isArray(body.checkpoint_ids)
            ? body.checkpoint_ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0).slice(0, 50_000)
            : [];
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // Supabase generated types intentionally lag manual SQL migrations.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data, error } = await (supabaseAdmin as any).rpc("verify_driver_trip_checkpoints", {
            p_session_token: token,
            p_checkpoint_ids: checkpointIds,
          });
          if (error) throw error;
          return Response.json(data);
        } catch (error) {
          return jsonError(error instanceof Error ? error.message : "Checkpoint verification could not be completed.", 400);
        }
      },
    },
  },
});

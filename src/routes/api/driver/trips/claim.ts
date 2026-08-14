import { createFileRoute } from "@tanstack/react-router";

import { jsonError, publicTripDetails } from "@/lib/driver-api";

export const Route = createFileRoute("/api/driver/trips/claim")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json() as { token?: unknown; trip_code?: unknown; device_id?: unknown };
          const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
          const suppliedToken = typeof body.token === "string" ? body.token.trim() : "";
          const tripCode = typeof body.trip_code === "string" ? body.trip_code.trim() : "";
          if (!deviceId || (!suppliedToken && !tripCode)) return jsonError("A Trip QR Code or trip code and device ID are required.");

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          let token = suppliedToken;

          if (!token) {
            const { data: trip, error: tripError } = await supabaseAdmin
              .from("trips")
              .select("id, trip_code, ownership, end_date")
              .eq("trip_code", tripCode)
              .eq("ownership", "own")
              .maybeSingle();
            if (tripError) throw tripError;
            if (!trip || (trip.end_date ?? "").trim()) return jsonError("No open own-vehicle trip was found for this trip code.", 404);

            const { data: qr, error: qrError } = await supabaseAdmin.rpc("issue_driver_trip_qr", { p_trip_id: trip.id });
            if (qrError) throw qrError;
            token = (qr as { token?: string } | null)?.token ?? "";
            if (!token) throw new Error("Trip QR Code could not be created.");
          }

          const { data: claim, error: claimError } = await supabaseAdmin.rpc("claim_driver_trip", {
            p_qr_token: token,
            p_device_id: deviceId,
          });
          if (claimError) throw claimError;
          const claimPayload = claim as { status?: string; session_token?: string; link_id?: string } | null;
          if (claimPayload?.status === "already_linked") return jsonError("This trip is already connected to another device.", 409);
          if (!claimPayload?.session_token || !claimPayload.link_id) throw new Error("Trip linking did not return an active device session.");

          const { data: details, error: detailsError } = await supabaseAdmin.rpc("get_driver_trip", { p_session_token: claimPayload.session_token });
          if (detailsError) throw detailsError;
          return Response.json({ session_token: claimPayload.session_token, link_id: claimPayload.link_id, trip: publicTripDetails(details) });
        } catch (error) {
          console.error("[driver-api] claim failed", error);
          return jsonError(error instanceof Error ? error.message : "Trip linking failed.", 500);
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";

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
          // Driver tables and RPCs are installed by a separately applied migration;
          // keep this server-only boundary compatible until generated database types
          // are refreshed in the web project.
          const driverAdmin = supabaseAdmin as any;
          let token = suppliedToken;

          if (!token) {
            const { data: trip, error: tripError } = await supabaseAdmin
              .from("trips")
              .select("id, trip_code, ownership")
              .eq("trip_code", tripCode)
              .eq("ownership", "own")
              .maybeSingle();
            if (tripError) throw tripError;
            if (!trip) return jsonError("No own-vehicle trip was found for this trip code.", 404);

            const { data: qr, error: qrError } = await driverAdmin.rpc("issue_driver_trip_qr", { p_trip_id: trip.id });
            if (qrError) throw qrError;
            token = (qr as { token?: string } | null)?.token ?? "";
            if (!token) throw new Error("Trip QR Code could not be created.");
          }

          const { data: claim, error: claimError } = await driverAdmin.rpc("claim_driver_trip", {
            p_qr_token: token,
            p_device_id: deviceId,
          });
          if (claimError) throw claimError;
          const claimPayload = claim as { status?: string; session_token?: string; link_id?: string } | null;
          if (claimPayload?.status === "already_linked") return jsonError("This trip is already connected to another device.", 409);
          if (!claimPayload?.session_token) throw new Error("Trip linking did not return an active device session. Apply the Driver App database migration and try again.");
          let linkId = claimPayload.link_id ?? null;
          if (!linkId) {
            const tokenHash = createHash("sha256").update(claimPayload.session_token).digest("hex");
            const { data: activeLink, error: activeLinkError } = await driverAdmin
              .from("driver_trip_links")
              .select("id")
              .eq("session_token_hash", tokenHash)
              .is("ended_at", null)
              .maybeSingle();
            if (activeLinkError) throw activeLinkError;
            linkId = activeLink?.id ?? null;
          }
          if (!linkId) throw new Error("Trip linking did not return an active device session. Apply the Driver App database migration and try again.");

          const { data: details, error: detailsError } = await driverAdmin.rpc("get_driver_trip", { p_session_token: claimPayload.session_token });
          if (detailsError) throw detailsError;
          return Response.json({ session_token: claimPayload.session_token, link_id: linkId, trip: publicTripDetails(details) });
        } catch (error) {
          console.error("[driver-api] claim failed", error);
          return jsonError(error instanceof Error ? error.message : "Trip linking failed.", 500);
        }
      },
    },
  },
});

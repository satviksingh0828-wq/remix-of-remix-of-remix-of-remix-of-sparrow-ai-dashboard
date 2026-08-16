import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { verifyAppToken } from "@/lib/user-auth";

export type TripCheckpointStatus = {
  linked: boolean;
  active: boolean;
  verified: boolean;
  expectedCount: number;
  recordedCount: number;
  verifiedAt: string | null;
  endedAt: string | null;
};

async function requireTripCheckpointAccess(sessionToken: string, tripId: string) {
  const session = await verifyAppToken(sessionToken);
  if (!session) throw new Error("Your session has expired. Please sign in again.");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;
  const { data: user, error: userError } = await db
    .from("app_users")
    .select("role,is_active")
    .eq("id", session.uid)
    .maybeSingle();
  if (userError || !user?.is_active || user.role !== session.role) {
    throw new Error("Forbidden: active user access is required.");
  }

  const { data: trip, error: tripError } = await db
    .from("trips")
    .select("id,branch_id,ownership")
    .eq("id", tripId)
    .maybeSingle();
  if (tripError || !trip) throw new Error("Trip not found or no longer open.");

  if (user.role === "basic") {
    const { data: accessRows, error: accessError } = await db
      .from("user_branch_access")
      .select("branch_id")
      .eq("user_id", session.uid);
    if (accessError || !accessRows?.some((row: { branch_id: string }) => row.branch_id === trip.branch_id)) {
      throw new Error("Forbidden: your account does not have access to this trip.");
    }
  }
  return { db, ownership: String(trip.ownership ?? "") };
}

function normalizeStatus(raw: Record<string, unknown> | null | undefined): TripCheckpointStatus {
  return {
    linked: Boolean(raw?.linked),
    active: Boolean(raw?.active),
    verified: Boolean(raw?.verified),
    expectedCount: Math.max(0, Number(raw?.expected_count) || 0),
    recordedCount: Math.max(0, Number(raw?.recorded_count) || 0),
    verifiedAt: typeof raw?.verified_at === "string" ? raw.verified_at : null,
    endedAt: typeof raw?.ended_at === "string" ? raw.ended_at : null,
  };
}

export const serverGetTripCheckpointStatus = createServerFn({ method: "POST" })
  .validator(z.object({ sessionToken: z.string().min(1), tripId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TripCheckpointStatus> => {
    const { db, ownership } = await requireTripCheckpointAccess(data.sessionToken, data.tripId);
    if (ownership !== "own") {
      return { linked: false, active: false, verified: true, expectedCount: 0, recordedCount: 0, verifiedAt: null, endedAt: null };
    }
    const { data: status, error } = await db.rpc("get_trip_driver_checkpoint_status", { p_trip_id: data.tripId });
    if (error) throw new Error(`Could not verify driver checkpoints: ${error.message}`);
    return normalizeStatus(status as Record<string, unknown> | null);
  });

export const serverRequireTripCheckpointVerification = createServerFn({ method: "POST" })
  .validator(z.object({ sessionToken: z.string().min(1), tripId: z.string().uuid() }))
  .handler(async ({ data }): Promise<TripCheckpointStatus> => {
    const { db, ownership } = await requireTripCheckpointAccess(data.sessionToken, data.tripId);
    if (ownership !== "own") {
      return { linked: false, active: false, verified: true, expectedCount: 0, recordedCount: 0, verifiedAt: null, endedAt: null };
    }
    const { data: status, error } = await db.rpc("get_trip_driver_checkpoint_status", { p_trip_id: data.tripId });
    if (error) throw new Error(`Could not verify driver checkpoints: ${error.message}`);
    const normalized = normalizeStatus(status as Record<string, unknown> | null);
    if (normalized.active) {
      throw new Error("Driver tracking is still active. Ask the driver to use Verify and End Trip in the Driver App before closing this trip.");
    }
    if (normalized.linked && !normalized.verified) {
      throw new Error("Driver checkpoints are not fully verified yet. The trip stays open until Sparrow confirms every saved checkpoint.");
    }
    return normalized;
  });

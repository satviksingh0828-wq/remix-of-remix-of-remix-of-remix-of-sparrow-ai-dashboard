import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { verifyAppToken } from "./user-auth";

export const serverReopenTrip = createServerFn({ method: "POST" })
  .validator(z.object({ sessionToken: z.string().min(1), closedId: z.string().uuid() }))
  .handler(async ({ data }): Promise<string> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const session = await verifyAppToken(data.sessionToken);
    if (!session) throw new Error("Your session has expired. Please sign in again.");

    const { data: user, error: userError } = await db
      .from("app_users")
      .select("id,role,is_active")
      .eq("id", session.uid)
      .maybeSingle();
    if (userError || !user?.is_active || user.role !== session.role) {
      throw new Error("Forbidden: active user access is required.");
    }
    if (user.role !== "admin" && user.role !== "semi_admin") {
      throw new Error("Only administrators can reopen trips.");
    }

    const { data: newId, error } = await db.rpc("reopen_trip_atomic", {
      p_closed_id: data.closedId,
    });
    if (error || !newId) throw new Error(error?.message ?? "Could not reopen trip atomically");
    return String(newId);
  });

/** @deprecated Use serverReopenTrip; retained only to make accidental client-side use fail clearly. */
export async function reopenTrip(_closedId: string): Promise<never> {
  throw new Error("Trip reopen must be performed through the authenticated server action");
}

import { createHmac } from "crypto";

import { verifyAppToken } from "@/lib/user-auth";

export type MobileApiUser = {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "basic" | "viewer";
  branchIds: string[];
};

const MOBILE_CLIENT_HEADER = "garuda-android";

export function mobileJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function mobileError(message: string, status = 400) {
  return mobileJson({ error: message }, status);
}

export function isMobileClient(request: Request) {
  return request.headers.get("x-garuda-mobile-client") === MOBILE_CLIENT_HEADER;
}

export function mobileSessionToken(request: Request) {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
}

export function issueMobileSessionToken(userId: string, role: string) {
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  const payload = `${userId}:${role}:${expires}`;
  const signature = createHmac("sha256", process.env.SESSION_SECRET ?? "dev-fallback-secret")
    .update(payload)
    .digest("hex");
  return `${payload}:${signature}`;
}

export async function requireMobileUser(request: Request): Promise<MobileApiUser | Response> {
  if (!isMobileClient(request))
    return mobileError("This endpoint is available only to the Garuda Android app.", 403);
  const parsed = await verifyAppToken(mobileSessionToken(request));
  if (!parsed) return mobileError("A valid mobile session is required.", 401);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: user, error } = await supabaseAdmin
    .from("app_users")
    .select("id, username, full_name, role, is_active, is_paused")
    .eq("id", parsed.uid)
    .maybeSingle();
  if (error || !user || !user.is_active || user.is_paused) {
    return mobileError("Your mobile session is no longer active.", 401);
  }
  if (user.role !== parsed.role) {
    return mobileError("Your mobile permissions have changed. Please sign in again.", 401);
  }

  void supabaseAdmin
    .from("user_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("user_id", user.id as string)
    .eq("session_token", mobileSessionToken(request));

  const { data: branchData } = await supabaseAdmin
    .from("user_branch_access")
    .select("branch_id")
    .eq("user_id", user.id);
  return {
    id: user.id as string,
    username: user.username as string,
    fullName: (user.full_name as string) || (user.username as string),
    role: user.role as MobileApiUser["role"],
    branchIds: ((branchData ?? []) as { branch_id: string }[]).map((entry) => entry.branch_id),
  };
}

export function limitToPermittedBranches<T extends { in: (column: string, values: string[]) => T }>(
  query: T,
  user: MobileApiUser,
) {
  if (user.role === "admin") return query;
  return query.in(
    "branch_id",
    user.branchIds.length ? user.branchIds : ["00000000-0000-0000-0000-000000000000"],
  );
}

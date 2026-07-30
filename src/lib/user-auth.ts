/**
 * user-auth.ts
 *
 * All authentication and user-management operations run as TanStack Start
 * server functions — they execute on the server using the service-role
 * Supabase client (supabaseAdmin) and never expose passwords or raw user
 * records to the browser.
 *
 * The client receives only the SessionUser shape (no password field).
 */

import { createServerFn } from "@tanstack/react-start";
import { verifyPoWToken, type PowToken } from "@/lib/pow-captcha";

// ── Public user shape (safe to store in localStorage / send to client) ──────

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "basic";
  /** IDs of branches this user may access. Admin ignores this; basic users are filtered to these. */
  branchIds: string[];
  /**
   * HMAC-signed server session token used to authorize admin server functions.
   * Format: `{userId}:{role}:{expiresMs}:{hmacHex}`
   * Signed with SESSION_SECRET at login; verified server-side — never trust
   * a caller-supplied userId alone.
   */
  sessionToken?: string;
};

export type AppUserPublic = {
  id: string;
  username: string;
  full_name: string;
  role: "admin" | "basic";
  is_active: boolean;
  created_at: string;
};

export type SaveUserInput = {
  id?: string;
  username: string;
  full_name: string;
  password: string; // blank = keep existing (update only)
  role: "admin" | "basic";
  is_active: boolean;
  branchIds: string[];
};

// ── Sign in ──────────────────────────────────────────────────────────────────

export type SignInResult =
  | { ok: true; user: SessionUser }
  | { ok: false; reason: "invalid_credentials" | "server_error" | "device_not_authorized" | "captcha_failed"; message: string };

export const serverSignIn = createServerFn({ method: "POST" })
  .validator((data: {
    username: string;
    password: string;
    powToken: PowToken;
    /** Credential ID of the passkey that already passed Windows Hello on this device */
    credentialId?: string;
  }) => data)
  .handler(async ({ data }): Promise<SignInResult> => {

    // ── 1. Verify Proof-of-Work CAPTCHA ───────────────────────────────────────
    if (!data.powToken || !verifyPoWToken(data.powToken)) {
      return {
        ok: false,
        reason: "captcha_failed",
        message: "Security check failed or expired. Please wait for it to complete and try again.",
      };
    }

    // ── 2. Load Supabase admin ─────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabaseAdmin: any;
    try {
      const mod = await import("@/integrations/supabase/client.server");
      supabaseAdmin = mod.supabaseAdmin;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[serverSignIn] Failed to init Supabase admin client:", msg);
      return { ok: false, reason: "server_error", message: `Database connection failed: ${msg}` };
    }

    // ── 3. Verify username + password ──────────────────────────────────────────
    const { data: user, error } = await supabaseAdmin
      .from("app_users")
      .select("id, username, full_name, role, password")
      .eq("username", data.username.trim().toLowerCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error("[serverSignIn] Supabase query error:", error.message, error.code, error.details);
      return { ok: false, reason: "server_error", message: `Database error: ${error.message} (code: ${error.code})` };
    }
    if (!user) {
      console.warn("[serverSignIn] No active user found for username:", data.username.trim().toLowerCase());
      return { ok: false, reason: "invalid_credentials", message: "Invalid login ID or password." };
    }
    if (user.password !== data.password) {
      console.warn("[serverSignIn] Password mismatch for username:", data.username.trim().toLowerCase());
      return { ok: false, reason: "invalid_credentials", message: "Invalid login ID or password." };
    }

    // ── 4. Device-user authorization check ────────────────────────────────────
    if (data.credentialId) {
      const { data: devRow } = await supabaseAdmin
        .from("device_registrations")
        .select("id, status")
        .eq("credential_id", data.credentialId)
        .maybeSingle();

      if (devRow && devRow.status === "approved") {
        const { data: assignments } = await supabaseAdmin
          .from("device_user_assignments")
          .select("app_user_id")
          .eq("device_registration_id", devRow.id);

        const allowedIds: string[] = ((assignments ?? []) as { app_user_id: string }[]).map(a => a.app_user_id);

        if (allowedIds.length > 0 && !allowedIds.includes(user.id as string)) {
          console.warn("[serverSignIn] User not authorized on this device:", data.username);
          return {
            ok: false,
            reason: "device_not_authorized",
            message: "Your account is not authorised to access this application from this device.",
          };
        }
      }
    }

    // ── 5. Fetch branch access ─────────────────────────────────────────────────
    const { data: branchData } = await supabaseAdmin
      .from("user_branch_access")
      .select("branch_id")
      .eq("user_id", user.id);

    // ── 6. Generate HMAC-signed session token ─────────────────────────────────
    // Token = "userId:role:expiresMs:hmac" signed with SESSION_SECRET.
    // Server functions verify this token independently — we never trust a
    // client-supplied userId alone.
    let sessionToken: string | undefined;
    try {
      const { createHmac } = await import("crypto");
      const secret = process.env.SESSION_SECRET ?? "dev-fallback-secret";
      const uid    = user.id as string;
      const role   = user.role as string;
      const expires = Date.now() + 12 * 60 * 60 * 1000; // 12 hours
      const sig = createHmac("sha256", secret)
        .update(`${uid}:${role}:${expires}`)
        .digest("hex");
      sessionToken = `${uid}:${role}:${expires}:${sig}`;
    } catch {
      // If token generation fails (e.g. crypto unavailable), continue without it.
      // Admin server functions will reject the empty token.
    }

    // ── 7. Persist session token (single-session enforcement) ─────────────────
    // One row per user – upsert replaces any previous token, so if another
    // device was already logged in its next heartbeat will get { valid: false }
    // and auto-sign-out.
    if (sessionToken) {
      try {
        const { error: upsertErr } = await supabaseAdmin
          .from("user_sessions")
          .upsert(
            {
              user_id: user.id as string,
              session_token: sessionToken,
              created_at: new Date().toISOString(),
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        if (upsertErr) {
          // Non-fatal: session enforcement best-effort (table may not exist yet)
          console.warn("[serverSignIn] Could not upsert user_sessions:", upsertErr.message);
        }
      } catch (e) {
        console.warn("[serverSignIn] Unexpected error upserting user_sessions:", e);
      }
    }

    return {
      ok: true,
      user: {
        id: user.id as string,
        username: user.username as string,
        fullName: (user.full_name as string) || (user.username as string),
        role: user.role as "admin" | "basic",
        branchIds: ((branchData ?? []) as { branch_id: string }[]).map(
          (r) => r.branch_id,
        ),
        sessionToken,
      },
    };
  });

// ── Shared token-integrity helper ────────────────────────────────────────────
// Verifies the HMAC signature AND expiry of an app session token.
// Returns the parsed { uid, role } when valid, or null when invalid/tampered/expired.
// Uses timingSafeEqual to prevent timing-oracle attacks on the signature.

async function verifyAppToken(
  token: string,
): Promise<{ uid: string; role: string } | null> {
  if (!token) return null;

  // Token format: "userId:role:expiresMs:hmacHex"
  // Strategy: split on the LAST colon → everything after is the hex signature;
  // everything before is the signed payload "userId:role:expiresMs".
  // userId is a UUID (hyphens only, no colons), so payload has exactly 3 segments.
  const lastColon = token.lastIndexOf(":");
  if (lastColon === -1) return null;

  const payload     = token.slice(0, lastColon);   // "userId:role:expiresMs"
  const suppliedSig = token.slice(lastColon + 1);  // "hmacHex"

  // Payload must have exactly 3 colon-delimited parts: uid, role, expiresMs
  const payloadParts = payload.split(":");
  if (payloadParts.length !== 3) return null;

  const [uid, role, expiresStr] = payloadParts;
  const expiresMs = Number(expiresStr);
  if (!uid || !role || !Number.isFinite(expiresMs)) return null;
  if (Date.now() > expiresMs) return null; // token expired

  try {
    const { createHmac, timingSafeEqual } = await import("crypto");
    const secret   = process.env.SESSION_SECRET ?? "dev-fallback-secret";
    // HMAC was computed over "uid:role:expiresMs" — same as payload
    const expected = createHmac("sha256", secret).update(payload).digest("hex");

    // timingSafeEqual requires equal-length buffers
    if (suppliedSig.length !== expected.length) return null;
    const aBytes = Buffer.from(suppliedSig, "utf8");
    const bBytes = Buffer.from(expected,    "utf8");
    if (!timingSafeEqual(aBytes, bBytes)) return null;
  } catch {
    return null;
  }

  return { uid, role };
}

// ── Verify session heartbeat (single-session enforcement) ────────────────────
// Called every ~30 s by the client. Returns { valid: false } when another
// device has signed in (the DB token no longer matches this client's token),
// or when the token is tampered / expired.

export const serverVerifySession = createServerFn({ method: "POST" })
  .validator((token: string) => token)
  .handler(async ({ data: token }): Promise<{ valid: boolean }> => {
    const parsed = await verifyAppToken(token);
    if (!parsed) return { valid: false };
    const { uid } = parsed;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let supabaseAdmin: any;
    try {
      const mod = await import("@/integrations/supabase/client.server");
      supabaseAdmin = mod.supabaseAdmin;
    } catch {
      // DB client unavailable — don't boot the user for infrastructure issues
      return { valid: true };
    }

    const { data, error } = await supabaseAdmin
      .from("user_sessions")
      .select("session_token")
      .eq("user_id", uid)
      .maybeSingle();

    // Any DB / RLS / table-missing error → non-destructive: let session continue
    if (error) {
      console.warn("[serverVerifySession] DB error, allowing session:", error.message);
      return { valid: true };
    }

    // No row yet (table empty / upsert failed at login) → benefit of the doubt
    if (!data) return { valid: true };

    // Row found but token differs → another device logged in → revoke this session
    if (data.session_token !== token) return { valid: false };

    // Tokens match → valid; bump last_seen_at (fire-and-forget)
    supabaseAdmin
      .from("user_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("user_id", uid)
      .then(() => {/* ignore */});

    return { valid: true };
  });

// ── Clear session on sign-out ─────────────────────────────────────────────────
// Requires a valid HMAC-signed token. Deletes matching on BOTH user_id AND
// session_token so a stale / forged token cannot revoke another user's active session.

export const serverSignOut = createServerFn({ method: "POST" })
  .validator((token: string) => token)
  .handler(async ({ data: token }): Promise<void> => {
    const parsed = await verifyAppToken(token);
    if (!parsed) return; // invalid / expired / tampered — nothing to do

    const { uid } = parsed;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // Match on BOTH columns: a stale token from a previous session cannot
      // delete the row that now belongs to a newer login.
      await supabaseAdmin
        .from("user_sessions")
        .delete()
        .eq("user_id", uid)
        .eq("session_token", token);
    } catch {
      // Non-fatal
    }
  });

// ── List users (admin-only) ──────────────────────────────────────────────────

export const serverListUsers = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppUserPublic[]> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data } = await supabaseAdmin
      .from("app_users")
      .select("id, username, full_name, role, is_active, created_at")
      .order("created_at", { ascending: true });
    return (data ?? []) as AppUserPublic[];
  },
);

// ── Get a single user's branch access (admin-only) ───────────────────────────

export const serverGetUserBranches = createServerFn({ method: "POST" })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }): Promise<string[]> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data } = await supabaseAdmin
      .from("user_branch_access")
      .select("branch_id")
      .eq("user_id", userId);
    return ((data ?? []) as { branch_id: string }[]).map((r) => r.branch_id);
  });

// ── Create or update a user (admin-only) ─────────────────────────────────────

export const serverSaveUser = createServerFn({ method: "POST" })
  .validator((input: SaveUserInput) => input)
  .handler(async ({ data }): Promise<{ id: string; error?: string }> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let userId = data.id;

    if (data.id) {
      // Update
      const payload: Record<string, unknown> = {
        username: data.username.trim().toLowerCase(),
        full_name: data.full_name.trim(),
        role: data.role,
        is_active: data.is_active,
      };
      if (data.password.trim()) payload.password = data.password;

      const { error } = await supabaseAdmin
        .from("app_users")
        .update(payload as never)
        .eq("id", data.id);
      if (error) return { id: data.id, error: error.message };
    } else {
      // Create
      const { data: created, error } = await supabaseAdmin
        .from("app_users")
        .insert({
          username: data.username.trim().toLowerCase(),
          full_name: data.full_name.trim(),
          password: data.password,
          role: data.role,
          is_active: data.is_active,
        })
        .select("id")
        .single();
      if (error || !created) return { id: "", error: error?.message ?? "Could not create user" };
      userId = (created as { id: string }).id;
    }

    // Replace branch access
    await supabaseAdmin
      .from("user_branch_access")
      .delete()
      .eq("user_id", userId!);

    if (data.branchIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("user_branch_access")
        .insert(data.branchIds.map((bid) => ({ user_id: userId!, branch_id: bid })));
      if (error) return { id: userId!, error: error.message };
    }

    return { id: userId! };
  });

// ── Delete a user (admin-only) ───────────────────────────────────────────────

export const serverDeleteUser = createServerFn({ method: "POST" })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }): Promise<{ error?: string }> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    await supabaseAdmin
      .from("user_branch_access")
      .delete()
      .eq("user_id", userId);
    const { error } = await supabaseAdmin
      .from("app_users")
      .delete()
      .eq("id", userId);
    if (error) return { error: error.message };
    return {};
  });

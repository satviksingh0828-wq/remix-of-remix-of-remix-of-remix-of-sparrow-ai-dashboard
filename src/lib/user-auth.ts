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

// ── Public user shape (safe to store in localStorage / send to client) ──────

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: "admin" | "basic";
  /** IDs of branches this user may access. Admin ignores this; basic users are filtered to these. */
  branchIds: string[];
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
    turnstileToken: string;
    /** Credential ID of the passkey that already passed Windows Hello on this device */
    credentialId?: string;
  }) => data)
  .handler(async ({ data }): Promise<SignInResult> => {
    // ── 1. Verify Turnstile CAPTCHA ────────────────────────────────────────
    const TEST_SECRET = "1x0000000000000000000000000000000AA";
    const secret = process.env.TURNSTILE_SECRET_KEY ?? TEST_SECRET;
    const token  = data.turnstileToken?.trim();

    if (!token) {
      return { ok: false, reason: "captcha_failed", message: "Please complete the CAPTCHA." };
    }

    try {
      const body = new URLSearchParams({ secret, response: token });
      const cfRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      const cfJson = await cfRes.json() as { success: boolean; "error-codes"?: string[] };
      if (!cfJson.success) {
        return { ok: false, reason: "captcha_failed", message: "CAPTCHA verification failed. Please try again." };
      }
    } catch {
      // If Turnstile is unreachable, still allow login (graceful degradation)
      console.warn("[serverSignIn] Turnstile check failed (network). Proceeding anyway.");
    }

    // ── 2. Load Supabase admin ─────────────────────────────────────────────
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

    // ── 3. Verify username + password ──────────────────────────────────────
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

    // ── 4. Device-user authorization check ───────────────────────────────
    // If the device has assigned users, only those users may log in from it.
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

        // If there ARE assigned users and this user is NOT in the list → deny
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

    // ── 5. Fetch branch access ─────────────────────────────────────────────
    const { data: branchData } = await supabaseAdmin
      .from("user_branch_access")
      .select("branch_id")
      .eq("user_id", user.id);

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
      },
    };
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
    // Cascade delete handles user_branch_access via FK, but belt-and-suspenders:
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

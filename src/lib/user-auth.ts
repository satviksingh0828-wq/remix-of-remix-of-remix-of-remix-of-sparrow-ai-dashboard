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
  | { ok: false; reason: "invalid_credentials" | "server_error"; message: string };

export const serverSignIn = createServerFn({ method: "POST" })
  .validator((data: { username: string; password: string }) => data)
  .handler(async ({ data }): Promise<SignInResult> => {
    // Dynamic import keeps supabaseAdmin out of the client bundle entirely
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

    // Fetch branch access
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

import { createFileRoute } from "@tanstack/react-router";

import { isMobileClient, issueMobileSessionToken, mobileError, mobileJson } from "@/lib/mobile-api";

export const Route = createFileRoute("/api/mobile/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!isMobileClient(request))
          return mobileError("Use the Garuda Android app to sign in.", 403);
        const body = (await request.json().catch(() => null)) as {
          username?: string;
          password?: string;
        } | null;
        const username = body?.username?.trim().toLowerCase() ?? "";
        const password = body?.password ?? "";
        if (!username || !password) return mobileError("Enter your login ID and password.", 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: user, error } = await supabaseAdmin
          .from("app_users")
          .select(
            "id, username, full_name, role, password, is_active, is_paused, failed_login_attempts",
          )
          .eq("username", username)
          .eq("is_active", true)
          .maybeSingle();
        if (error) return mobileError("The sign-in service is temporarily unavailable.", 503);
        if (!user || user.is_paused) return mobileError("Invalid login ID or password.", 401);

        if (user.password !== password) {
          const failures = ((user.failed_login_attempts as number) ?? 0) + 1;
          await supabaseAdmin
            .from("app_users")
            .update({
              failed_login_attempts: failures,
              ...(failures >= 3 ? { is_paused: true, paused_at: new Date().toISOString() } : {}),
            })
            .eq("id", user.id as string);
          return mobileError(
            failures >= 3
              ? "Your account has been paused after too many failed login attempts."
              : "Invalid login ID or password.",
            401,
          );
        }

        if ((user.failed_login_attempts as number) > 0) {
          await supabaseAdmin
            .from("app_users")
            .update({ failed_login_attempts: 0 })
            .eq("id", user.id as string);
        }
        const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: existingSession } = await supabaseAdmin
          .from("user_sessions")
          .select("last_seen_at")
          .eq("user_id", user.id as string)
          .maybeSingle();
        if (existingSession?.last_seen_at && existingSession.last_seen_at > staleBefore) {
          return mobileError(
            "This account is already active on another device. Sign out there or wait two minutes.",
            409,
          );
        }
        const { data: branchData } = await supabaseAdmin
          .from("user_branch_access")
          .select("branch_id")
          .eq("user_id", user.id as string);
        const sessionToken = issueMobileSessionToken(user.id as string, user.role as string);
        await supabaseAdmin.from("user_sessions").upsert(
          {
            user_id: user.id as string,
            session_token: sessionToken,
            created_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );

        return mobileJson({
          session_token: sessionToken,
          user: {
            id: user.id,
            username: user.username,
            fullName: user.full_name || user.username,
            role: user.role,
            branchIds: ((branchData ?? []) as { branch_id: string }[]).map(
              (entry) => entry.branch_id,
            ),
          },
        });
      },
    },
  },
});

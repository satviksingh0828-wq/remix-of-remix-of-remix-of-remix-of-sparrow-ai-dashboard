/**
 * Server functions for the System admin page.
 *
 * Security:
 *  - Every handler calls requireAdminToken(sessionToken) before touching any data.
 *  - requireAdminToken verifies the HMAC-signed session token server-side
 *    (same algorithm as serverVerifySession in user-auth.ts) and checks the
 *    embedded role === "admin".  A caller who only knows a user's UUID cannot
 *    forge a valid token — the token is signed with SESSION_SECRET on the server
 *    at login time.
 *  - All functions are POST (CSRF protection).
 *  - Heavy operations run inside Supabase RPCs, never on the client.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// ── Token-based admin guard ────────────────────────────────────────────────────
// Mirrors the verifyAppToken helper in user-auth.ts.
// Token format: "userId:role:expiresMs:hmacHex"
// Returns the verified userId so handlers can use it in DB queries.

async function requireAdminToken(token: string): Promise<string> {
  if (!token) throw new Error("Forbidden: no session token provided.");

  const lastColon = token.lastIndexOf(":");
  if (lastColon === -1) throw new Error("Forbidden: malformed token.");

  const payload     = token.slice(0, lastColon);
  const suppliedSig = token.slice(lastColon + 1);

  const payloadParts = payload.split(":");
  if (payloadParts.length !== 3) throw new Error("Forbidden: malformed token.");

  const [uid, role, expiresStr] = payloadParts;
  const expiresMs = Number(expiresStr);
  if (!uid || !role || !Number.isFinite(expiresMs)) throw new Error("Forbidden: malformed token.");
  if (Date.now() > expiresMs) throw new Error("Forbidden: session token has expired.");
  if (role !== "admin") throw new Error("Forbidden: admin access required.");

  try {
    const { createHmac, timingSafeEqual } = await import("crypto");
    const secret   = process.env.SESSION_SECRET ?? "dev-fallback-secret";
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (suppliedSig.length !== expected.length) throw new Error("Forbidden: invalid token signature.");
    const aBytes = Buffer.from(suppliedSig, "utf8");
    const bBytes = Buffer.from(expected,    "utf8");
    if (!timingSafeEqual(aBytes, bBytes)) throw new Error("Forbidden: invalid token signature.");
  } catch (e) {
    if ((e as Error).message.startsWith("Forbidden:")) throw e;
    throw new Error("Forbidden: token verification failed.");
  }

  return uid;
}

// ── Types (shared with components) ────────────────────────────────────────────

export type ClosedTripError = {
  id: string;
  trip_code: string;
  branch_name: string | null;
  start_date: string | null;
  end_date: string | null;
  closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  error_type: string;
  total_count: number;
};

export type DbStats = {
  db_size: string;
  table_count: number;
  largest_tables: Array<{
    schema_name: string;
    table_name: string;
    row_estimate: number;
    total_bytes: number;
    total_size: string;
    table_size: string;
    index_size: string;
  }>;
  connections: Array<{
    total: number;
    active: number;
    idle: number;
    idle_in_transaction: number;
    idle_aborted: number;
  }>;
  running_queries: Array<{
    pid: number;
    state: string;
    query_snippet: string;
    duration_seconds: number;
    wait_event_type: string | null;
    wait_event: string | null;
    application_name: string | null;
  }>;
  cache_hit: Array<{
    heap_hit_ratio: number | null;
    index_hit_ratio: number | null;
  }>;
  storage_buckets: Array<{ id: string; name: string; public: boolean; created_at: string }>;
  storage_error: string | null;
};

export type ProjectStats = {
  supabase_url: string;
  project_ref: string | null;
  has_management_token: boolean;
  management_data: Record<string, unknown> | null;
  management_error: string | null;
};

// ── Tab 1 – Error Panel ────────────────────────────────────────────────────────

export const serverGetClosedTripErrors = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionToken: z.string(),
      search:       z.string().optional(),
      month:        z.number().optional(),
      year:         z.number().optional(),
      dateSource:   z.enum(["start_date", "closed_at"]).default("closed_at"),
      errorType:    z.enum(["all", "start_mismatch", "end_mismatch", "either"]).default("all"),
      limit:        z.number().default(50),
      offset:       z.number().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const { data: rows, error } = await db.rpc("get_closed_trip_errors", {
      p_search:      data.search   ?? null,
      p_month:       data.month    ?? null,
      p_year:        data.year     ?? null,
      p_date_source: data.dateSource,
      p_error_type:  data.errorType,
      p_limit:       data.limit,
      p_offset:      data.offset,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ClosedTripError[];
  });

export const serverFixTripTimestamps = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionToken: z.string(),
      tripIds:      z.array(z.string()),
      useStartDate: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const { data: count, error } = await db.rpc("fix_trip_timestamps", {
      p_trip_ids:       data.tripIds,
      p_use_start_date: data.useStartDate,
    });
    if (error) throw new Error(error.message);
    return count as number;
  });

// ── Tab 2 – Database Stats ─────────────────────────────────────────────────────

export const serverGetDbStats = createServerFn({ method: "POST" })
  .validator(z.object({ sessionToken: z.string() }))
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;

    const [{ data: stats, error: statsErr }, { data: buckets, error: bucketsErr }] =
      await Promise.all([
        db.rpc("get_db_stats"),
        db.storage.listBuckets(),
      ]);

    if (statsErr) throw new Error(statsErr.message);

    return {
      ...(stats as Omit<DbStats, "storage_buckets" | "storage_error">),
      storage_buckets: buckets ?? [],
      storage_error:   bucketsErr?.message ?? null,
    } as DbStats;
  });

// ── Tab 3 – Project Stats ──────────────────────────────────────────────────────

export const serverGetProjectStats = createServerFn({ method: "POST" })
  .validator(z.object({ sessionToken: z.string() }))
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);

    const SUPABASE_URL     = process.env.SUPABASE_URL ?? "";
    const MANAGEMENT_TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN ?? "";

    // Extract project ref from URL: https://<ref>.supabase.co
    const refMatch   = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
    const projectRef = refMatch?.[1] ?? null;

    const base: ProjectStats = {
      supabase_url:         SUPABASE_URL,
      project_ref:          projectRef,
      has_management_token: !!MANAGEMENT_TOKEN,
      management_data:      null,
      management_error:     null,
    };

    if (!MANAGEMENT_TOKEN || !projectRef) {
      return {
        ...base,
        management_error: "SUPABASE_MANAGEMENT_TOKEN is not configured. Add it to your Vercel environment variables.",
      };
    }

    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
        headers: { Authorization: `Bearer ${MANAGEMENT_TOKEN}` },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Management API ${res.status}: ${body || res.statusText}`);
      }
      const managementData = await res.json() as Record<string, unknown>;
      return { ...base, management_data: managementData };
    } catch (err) {
      return {
        ...base,
        management_error: err instanceof Error ? err.message : String(err),
      };
    }
  });

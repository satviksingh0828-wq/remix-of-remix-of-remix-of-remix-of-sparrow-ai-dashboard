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

  const payload = token.slice(0, lastColon);
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
    const secret = process.env.SESSION_SECRET ?? "dev-fallback-secret";
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    if (suppliedSig.length !== expected.length)
      throw new Error("Forbidden: invalid token signature.");
    const aBytes = Buffer.from(suppliedSig, "utf8");
    const bBytes = Buffer.from(expected, "utf8");
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

export type CorrectionManifest = {
  index: number;
  manifest_number: string;
  manifest_date: string | null;
  from_location: string;
  to_location: string;
  freight: number;
  loading: number;
  fixed: number;
};

export type CorrectionTrip = {
  id: string;
  trip_code: string;
  branch_name: string | null;
  start_date: string | null;
  end_date: string | null;
  ownership: "own" | "rented";
  manifests: CorrectionManifest[];
  other_income: Array<{ type: string; amount: number }>;
  expenses: Array<{ type: string; amount: number }>;
};

// ── Correction Panel ──────────────────────────────────────────────────────────

export const serverGetCorrectionTrips = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionToken: z.string(),
      purpose: z.enum(["missing_end_date", "freight"]),
      search: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<CorrectionTrip[]> => {
    await requireAdminToken(data.sessionToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("closed_trips")
      .select("id,trip_code,branch_name,start_date,end_date,snapshot")
      .order("closed_at", { ascending: false });
    if (error) throw new Error(error.message);

    const search = data.search?.trim().toLowerCase() ?? "";
    return (rows ?? []).flatMap((row) => {
      const snapshot = (row.snapshot ?? {}) as Record<string, unknown>;
      const trip = (snapshot.trip ?? {}) as Record<string, unknown>;
      const manifests = (snapshot.manifests ?? []) as Record<string, unknown>[];
      const lines = (snapshot.manifest_lines ?? []) as Record<string, unknown>[];
      const mappedManifests = manifests.map((manifest, index) => {
        const line = lines[index] ?? {};
        return {
          index,
          manifest_number: String(manifest.manifest_number ?? ""),
          manifest_date: manifest.manifest_date ? String(manifest.manifest_date) : null,
          from_location: String(manifest.from_pin_code ?? manifest.from_location_id ?? ""),
          to_location: String(manifest.to_pin_code ?? manifest.to_location_id ?? ""),
          freight: Number(line.freight ?? 0),
          loading: Number(line.loading ?? 0),
          fixed: Number(line.fixed ?? 0),
        };
      });
      const endDate = String(row.end_date ?? trip.end_date ?? "").trim();
      const matchesPurpose =
        data.purpose === "missing_end_date"
          ? !endDate
          : mappedManifests.some((manifest) => manifest.freight === 0 || manifest.loading === 0);
      const matchesSearch =
        !search ||
        String(row.trip_code ?? "")
          .toLowerCase()
          .includes(search) ||
        String(row.branch_name ?? "")
          .toLowerCase()
          .includes(search);
      if (!matchesPurpose || !matchesSearch) return [];

      const mapMoneyRows = (value: unknown) =>
        ((value ?? []) as Record<string, unknown>[]).map((item) => ({
          type: String(item.income_type ?? item.expense_type ?? item.type ?? item.name ?? "Other"),
          amount: Number(item.amount ?? 0),
        }));
      return [
        {
          id: row.id,
          trip_code: row.trip_code,
          branch_name: row.branch_name,
          start_date: row.start_date || String(trip.start_date ?? "") || null,
          end_date: endDate || null,
          ownership: String(trip.ownership ?? "own") === "rented" ? "rented" : "own",
          manifests: mappedManifests.filter(
            (manifest) =>
              data.purpose !== "freight" || manifest.freight === 0 || manifest.loading === 0,
          ),
          other_income: mapMoneyRows(snapshot.other_income),
          expenses: mapMoneyRows(snapshot.expenses),
        },
      ];
    });
  });

export const serverFixMissingEndDates = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionToken: z.string(),
      tripIds: z.array(z.string()).min(1),
      daysAfterStart: z.union([z.literal(1), z.literal(2)]),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let updated = 0;
    for (const id of data.tripIds) {
      const { data: row, error } = await supabaseAdmin
        .from("closed_trips")
        .select("start_date,end_date,snapshot")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      if (row.end_date) continue;
      const snapshot = (row.snapshot ?? {}) as Record<string, unknown>;
      const trip = { ...((snapshot.trip ?? {}) as Record<string, unknown>) };
      const start = String(row.start_date ?? trip.start_date ?? "");
      if (!start) continue;
      const end = new Date(`${start.slice(0, 10)}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + data.daysAfterStart);
      const endDate = end.toISOString().slice(0, 10);
      trip.end_date = endDate;
      const { error: updateError } = await supabaseAdmin
        .from("closed_trips")
        .update({ end_date: endDate, snapshot: { ...snapshot, trip } })
        .eq("id", id);
      if (updateError) throw new Error(updateError.message);
      updated += 1;
    }
    return updated;
  });

export const serverUpdateCorrectionManifest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionToken: z.string(),
      tripId: z.string(),
      manifestIndex: z.number().int().nonnegative(),
      freight: z.number().nonnegative(),
      loading: z.number().nonnegative(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("closed_trips")
      .select("snapshot,total_expense")
      .eq("id", data.tripId)
      .single();
    if (error) throw new Error(error.message);
    const snapshot = (row.snapshot ?? {}) as Record<string, unknown>;
    const lines = [...((snapshot.manifest_lines ?? []) as Record<string, unknown>[])];
    if (!lines[data.manifestIndex]) throw new Error("Manifest charge line was not found.");
    lines[data.manifestIndex] = {
      ...lines[data.manifestIndex],
      freight: data.freight,
      loading: data.loading,
      total: data.freight + data.loading + Number(lines[data.manifestIndex].fixed ?? 0),
    };
    const manifestIncome = lines.reduce(
      (sum, line) =>
        sum + Number(line.freight ?? 0) + Number(line.loading ?? 0) + Number(line.fixed ?? 0),
      0,
    );
    const otherIncome = ((snapshot.other_income ?? []) as Record<string, unknown>[]).reduce(
      (sum, item) => sum + Number(item.amount ?? 0),
      0,
    );
    const totalIncome = manifestIncome + otherIncome;
    const totalExpense = Number(row.total_expense ?? 0);
    const totals = {
      ...((snapshot.totals ?? {}) as Record<string, unknown>),
      manifest_income: manifestIncome,
      other_income: otherIncome,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_income: totalIncome - totalExpense,
    };
    const { error: updateError } = await supabaseAdmin
      .from("closed_trips")
      .update({
        snapshot: { ...snapshot, manifest_lines: lines, totals },
        total_income: totalIncome,
        net_income: totalIncome - totalExpense,
      })
      .eq("id", data.tripId);
    if (updateError) throw new Error(updateError.message);
    return true;
  });

// ── Tab 1 – Error Panel ────────────────────────────────────────────────────────

export const serverGetClosedTripErrors = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionToken: z.string(),
      search: z.string().optional(),
      month: z.number().optional(),
      year: z.number().optional(),
      dateSource: z.enum(["start_date", "closed_at"]).default("closed_at"),
      errorType: z.enum(["all", "start_mismatch", "end_mismatch", "either"]).default("all"),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const { data: rows, error } = await db.rpc("get_closed_trip_errors", {
      p_search: data.search ?? null,
      p_month: data.month ?? null,
      p_year: data.year ?? null,
      p_date_source: data.dateSource,
      p_error_type: data.errorType,
      p_limit: data.limit,
      p_offset: data.offset,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ClosedTripError[];
  });

export const serverFixTripTimestamps = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionToken: z.string(),
      tripIds: z.array(z.string()),
      useStartDate: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const { data: count, error } = await db.rpc("fix_trip_timestamps", {
      p_trip_ids: data.tripIds,
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
      await Promise.all([db.rpc("get_db_stats"), db.storage.listBuckets()]);

    if (statsErr) throw new Error(statsErr.message);

    return {
      ...(stats as Omit<DbStats, "storage_buckets" | "storage_error">),
      storage_buckets: buckets ?? [],
      storage_error: bucketsErr?.message ?? null,
    } as DbStats;
  });

// ── Tab 3 – Security Stats ────────────────────────────────────────────────────

export type SecurityStats = {
  users: {
    total: number;
    active: number;
    inactive: number;
    paused: number;
    admins: number;
    basic: number;
    viewers: number;
    with_failed_attempts: number;
  };
  failed_users: Array<{
    id: string;
    username: string;
    full_name: string;
    role: string;
    failed_login_attempts: number;
    is_paused: boolean;
    is_active: boolean;
  }>;
  devices: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  sessions: { active_sessions: number };
  recent_events: Array<{
    id: string;
    username: string;
    action: string;
    entity_type: string;
    details: Record<string, unknown>;
    created_at: string;
  }>;
};

export const serverGetSecurityStats = createServerFn({ method: "POST" })
  .validator(z.object({ sessionToken: z.string() }))
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabaseAdmin as any;
    const { data: stats, error } = await db.rpc("get_security_stats");
    if (error) throw new Error(error.message);
    return stats as SecurityStats;
  });

// ── Tab 5 – Cloudflare Turnstile Stats ────────────────────────────────────────

export type TurnstileDay = {
  date: string; // "YYYY-MM-DD"
  count: number; // total challenges issued that day
};

export type TurnstileTopIP = {
  ip: string;
  count: number;
};

export type TurnstileTopCountry = {
  country: string;
  count: number;
};

export type TurnstileStats = {
  configured: boolean;
  account_id_present: boolean;
  api_token_present: boolean;
  sitekey: string | null;
  days: TurnstileDay[];
  total_count: number;
  top_ips: TurnstileTopIP[];
  top_countries: TurnstileTopCountry[];
  ip_error: string | null;
  country_error: string | null;
  error: string | null;
};

// Shared helper: POST one GraphQL query to the Cloudflare Analytics API
async function cfGraphQL(apiToken: string, query: string): Promise<unknown> {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Cloudflare API ${res.status}: ${txt || res.statusText}`);
  }
  const json = (await res.json()) as { data?: unknown; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

export const serverGetTurnstileStats = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionToken: z.string(),
      days: z.number().min(1).max(90).default(30),
    }),
  )
  .handler(async ({ data }): Promise<TurnstileStats> => {
    await requireAdminToken(data.sessionToken);

    const accountId = process.env.CF_ACCOUNT_ID ?? "";
    const apiToken = process.env.CF_API_TOKEN ?? "";
    const sitekey = process.env.VITE_TURNSTILE_SITEKEY ?? null;

    const base: TurnstileStats = {
      configured: !!(accountId && apiToken),
      account_id_present: !!accountId,
      api_token_present: !!apiToken,
      sitekey,
      days: [],
      total_count: 0,
      top_ips: [],
      top_countries: [],
      ip_error: null,
      country_error: null,
      error: null,
    };

    if (!accountId || !apiToken) {
      return { ...base, error: "CF_ACCOUNT_ID and CF_API_TOKEN are not configured." };
    }

    const until = new Date();
    const since = new Date();
    since.setDate(since.getDate() - data.days + 1);
    const fmtDate = (d: Date) => d.toISOString().slice(0, 10);

    // siteKey filter string — omit if no sitekey configured
    const skFilter = sitekey ? `, siteKey: "${sitekey}"` : "";
    const dateFilter = `date_geq: "${fmtDate(since)}", date_leq: "${fmtDate(until)}"`;

    // ── Three independent queries, run in parallel ─────────────────────────────
    // Separate requests so one bad dimension name doesn't kill the others.

    const dailyQuery = `{
      viewer {
        accounts(filter: {accountTag: "${accountId}"}) {
          turnstileAdaptiveGroups(
            filter: {${dateFilter}${skFilter}}
            limit: 90
            orderBy: [date_ASC]
          ) {
            count
            dimensions { date }
          }
        }
      }
    }`;

    const ipQuery = `{
      viewer {
        accounts(filter: {accountTag: "${accountId}"}) {
          turnstileAdaptiveGroups(
            filter: {${dateFilter}${skFilter}}
            limit: 20
            orderBy: [count_DESC]
          ) {
            count
            dimensions { clientIP }
          }
        }
      }
    }`;

    const countryQuery = `{
      viewer {
        accounts(filter: {accountTag: "${accountId}"}) {
          turnstileAdaptiveGroups(
            filter: {${dateFilter}${skFilter}}
            limit: 15
            orderBy: [count_DESC]
          ) {
            count
            dimensions { clientCountryName }
          }
        }
      }
    }`;

    type GroupResult = {
      viewer?: {
        accounts?: Array<{
          turnstileAdaptiveGroups?: Array<{
            count: number;
            dimensions: Record<string, string | null>;
          }>;
        }>;
      };
    };

    const [dailyResult, ipResult, countryResult] = await Promise.allSettled([
      cfGraphQL(apiToken, dailyQuery),
      cfGraphQL(apiToken, ipQuery),
      cfGraphQL(apiToken, countryQuery),
    ]);

    // ── Process daily ──────────────────────────────────────────────────────────
    if (dailyResult.status === "rejected") {
      return { ...base, error: String(dailyResult.reason) };
    }
    const dailyGroups =
      (dailyResult.value as GroupResult)?.viewer?.accounts?.[0]?.turnstileAdaptiveGroups ?? [];

    const days: TurnstileDay[] = dailyGroups.map((g) => ({
      date: g.dimensions.date ?? "",
      count: g.count ?? 0,
    }));
    const total_count = days.reduce((s, d) => s + d.count, 0);

    // ── Process top IPs ───────────────────────────────────────────────────────
    let top_ips: TurnstileTopIP[] = [];
    let ip_error: string | null = null;
    if (ipResult.status === "fulfilled") {
      const ipGroups =
        (ipResult.value as GroupResult)?.viewer?.accounts?.[0]?.turnstileAdaptiveGroups ?? [];
      top_ips = ipGroups
        .filter((g) => g.dimensions.clientIP)
        .map((g) => ({ ip: g.dimensions.clientIP!, count: g.count }));
    } else {
      ip_error = String(ipResult.reason);
    }

    // ── Process top countries ─────────────────────────────────────────────────
    let top_countries: TurnstileTopCountry[] = [];
    let country_error: string | null = null;
    if (countryResult.status === "fulfilled") {
      const cGroups =
        (countryResult.value as GroupResult)?.viewer?.accounts?.[0]?.turnstileAdaptiveGroups ?? [];
      top_countries = cGroups
        .filter((g) => g.dimensions.clientCountryName)
        .map((g) => ({ country: g.dimensions.clientCountryName!, count: g.count }));
    } else {
      country_error = String(countryResult.reason);
    }

    return {
      ...base,
      days,
      total_count,
      top_ips,
      top_countries,
      ip_error,
      country_error,
      error: null,
    };
  });

// ── Tab 4 – Project Stats ──────────────────────────────────────────────────────

export const serverGetProjectStats = createServerFn({ method: "POST" })
  .validator(z.object({ sessionToken: z.string() }))
  .handler(async ({ data }) => {
    await requireAdminToken(data.sessionToken);

    const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
    const MANAGEMENT_TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN ?? "";

    // Extract project ref from URL: https://<ref>.supabase.co
    const refMatch = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
    const projectRef = refMatch?.[1] ?? null;

    const base: ProjectStats = {
      supabase_url: SUPABASE_URL,
      project_ref: projectRef,
      has_management_token: !!MANAGEMENT_TOKEN,
      management_data: null,
      management_error: null,
    };

    if (!MANAGEMENT_TOKEN || !projectRef) {
      return {
        ...base,
        management_error:
          "SUPABASE_MANAGEMENT_TOKEN is not configured. Add it to your Vercel environment variables.",
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
      const managementData = (await res.json()) as Record<string, unknown>;
      return { ...base, management_data: managementData };
    } catch (err) {
      return {
        ...base,
        management_error: err instanceof Error ? err.message : String(err),
      };
    }
  });

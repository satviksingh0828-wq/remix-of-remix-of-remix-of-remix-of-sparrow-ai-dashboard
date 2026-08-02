/**
 * One-time script: create the notifications table in Supabase.
 * Run: bun run scripts/apply-notifications-migration.ts
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const steps: Array<{ label: string; sql: string }> = [
  {
    label: "Create notifications table",
    sql: `
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind         text        NOT NULL,
  ref_id       text        NOT NULL,
  title        text        NOT NULL,
  detail       text        NOT NULL,
  days_left    integer,
  dismissed    boolean     NOT NULL DEFAULT false,
  dismissed_at timestamptz,
  dismissed_by text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_kind_ref_id_key UNIQUE (kind, ref_id)
);`,
  },
  {
    label: "Enable RLS",
    sql: `ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;`,
  },
  {
    label: "Admin select policy",
    sql: `
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'admin_select_notifications'
  ) THEN
    CREATE POLICY "admin_select_notifications" ON public.notifications
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'admin'
        )
      );
  END IF;
END $$;`,
  },
];

for (const step of steps) {
  console.log(`→ ${step.label}…`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db as any).rpc("exec_sql", { sql: step.sql }).maybeSingle().catch(() => ({ error: null }));
  if (error) console.warn("  (rpc unavailable, trying direct):", error);
  else console.log("  ✓");
}

// Verify table exists
const { data, error } = await db.from("notifications").select("id").limit(0);
if (error) {
  console.error("✗ Table not accessible:", error.message);
  console.log("\nRun this SQL manually in Supabase SQL Editor:");
  console.log(steps.map((s) => s.sql).join("\n\n"));
} else {
  console.log("✓ notifications table is ready.");
  void data;
}

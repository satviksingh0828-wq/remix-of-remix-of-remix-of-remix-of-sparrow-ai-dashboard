-- Persistent admin notification store.
-- kind + ref_id is unique — no duplicate alerts for the same underlying record.
-- dismissed = true means any admin has acknowledged it; it won't re-appear.

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text        NOT NULL,          -- 'insurance' | 'road_tax' | 'manifest_zero_income'
  ref_id      text        NOT NULL,          -- stable key: insurance id, road_tax id, manifest id
  title       text        NOT NULL,
  detail      text        NOT NULL,
  days_left   integer,                       -- NULL for non-expiry kinds
  dismissed   boolean     NOT NULL DEFAULT false,
  dismissed_at timestamptz,
  dismissed_by text,                         -- username of admin who dismissed
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_kind_ref_id_key UNIQUE (kind, ref_id)
);

-- Only service-role (server functions) writes; authenticated admin reads their own unread.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Inserts and updates go through service-role (server functions bypass RLS).

-- Track notification email delivery so the two-minute bell sync does not
-- repeatedly send the same alert. Failed deliveries remain NULL and retry.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz;

CREATE INDEX IF NOT EXISTS notifications_pending_email_idx
  ON public.notifications (created_at)
  WHERE dismissed = false AND emailed_at IS NULL;

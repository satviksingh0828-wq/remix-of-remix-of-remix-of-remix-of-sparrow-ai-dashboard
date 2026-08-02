-- ============================================================
-- Fix fix_trip_timestamps v3 – bypass the updated_at trigger
--
-- The set_closed_trips_updated_at BEFORE UPDATE trigger was
-- overwriting updated_at = now() even after we set it correctly.
-- Solution: disable the trigger for the duration of the UPDATE,
-- then re-enable it, so all three timestamp columns keep the
-- corrected value.
-- ============================================================

DROP FUNCTION IF EXISTS public.fix_trip_timestamps(uuid[], boolean);

CREATE OR REPLACE FUNCTION public.fix_trip_timestamps(
  p_trip_ids       uuid[],
  p_use_start_date boolean DEFAULT true
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  -- Disable the auto-updated_at trigger so our values survive
  ALTER TABLE public.closed_trips DISABLE TRIGGER set_closed_trips_updated_at;

  BEGIN
    IF p_use_start_date THEN
      UPDATE public.closed_trips
      SET
        closed_at  = (start_date::date)::timestamptz,
        created_at = (start_date::date)::timestamptz,
        updated_at = (start_date::date)::timestamptz
      WHERE id = ANY(p_trip_ids)
        AND start_date IS NOT NULL
        AND start_date <> '';
    ELSE
      UPDATE public.closed_trips
      SET
        closed_at  = (end_date::date)::timestamptz,
        created_at = (end_date::date)::timestamptz,
        updated_at = (end_date::date)::timestamptz
      WHERE id = ANY(p_trip_ids)
        AND end_date IS NOT NULL
        AND end_date <> '';
    END IF;

    GET DIAGNOSTICS v_updated = ROW_COUNT;

  EXCEPTION WHEN OTHERS THEN
    -- Always re-enable the trigger even on error
    ALTER TABLE public.closed_trips ENABLE TRIGGER set_closed_trips_updated_at;
    RAISE;
  END;

  -- Re-enable the trigger
  ALTER TABLE public.closed_trips ENABLE TRIGGER set_closed_trips_updated_at;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_trip_timestamps TO anon, authenticated, service_role;

-- ============================================================
-- Fix fix_trip_timestamps: write timestamptz values to timestamptz columns
--
-- The previous version cast to ::text before writing, which fails with:
--   "column closed_at is of type timestamp with time zone but
--    expression is of type text"
-- closed_at / created_at / updated_at are all timestamptz NOT NULL.
-- Cast start_date/end_date (text) → date → timestamptz before UPDATE.
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
  IF p_use_start_date THEN
    UPDATE public.closed_trips
    SET
      closed_at  = (start_date::date)::timestamptz,
      created_at = (start_date::date)::timestamptz,
      updated_at = (start_date::date)::timestamptz
    WHERE id = ANY(p_trip_ids) AND start_date IS NOT NULL AND start_date <> '';
  ELSE
    UPDATE public.closed_trips
    SET
      closed_at  = (end_date::date)::timestamptz,
      created_at = (end_date::date)::timestamptz,
      updated_at = (end_date::date)::timestamptz
    WHERE id = ANY(p_trip_ids) AND end_date IS NOT NULL AND end_date <> '';
  END IF;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_trip_timestamps TO anon, authenticated, service_role;

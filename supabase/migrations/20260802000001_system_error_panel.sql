-- ============================================================
-- System page – Error Panel RPCs
-- Detects and bulk-fixes timestamp inconsistencies in closed_trips.
-- All functions use SECURITY DEFINER so the service_role caller
-- can access the table even if RLS restricts direct access.
-- ============================================================

-- ── 1. get_closed_trip_errors ─────────────────────────────────────────────────
-- Returns paginated error trips (those where start_date or end_date month/year
-- does not match closed_at month/year).
-- Also returns total_count in every row (for pagination without a second query).

CREATE OR REPLACE FUNCTION public.get_closed_trip_errors(
  p_search      text    DEFAULT NULL,
  p_month       int     DEFAULT NULL,
  p_year        int     DEFAULT NULL,
  p_date_source text    DEFAULT 'closed_at',  -- 'start_date' | 'closed_at'
  p_error_type  text    DEFAULT 'all',         -- 'all' | 'start_mismatch' | 'end_mismatch' | 'either'
  p_limit       int     DEFAULT 50,
  p_offset      int     DEFAULT 0
)
RETURNS TABLE (
  id            uuid,
  trip_code     text,
  branch_name   text,
  start_date    date,
  end_date      date,
  closed_at     timestamptz,
  created_at    timestamptz,
  updated_at    timestamptz,
  error_type    text,
  total_count   bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      ct.id,
      ct.trip_code,
      ct.branch_name,
      ct.start_date,
      ct.end_date,
      ct.closed_at,
      ct.created_at,
      ct.updated_at,
      -- Mismatch flags (month OR year difference counts)
      (
        ct.start_date IS NOT NULL AND ct.closed_at IS NOT NULL AND (
          EXTRACT(MONTH FROM ct.start_date) <> EXTRACT(MONTH FROM ct.closed_at) OR
          EXTRACT(YEAR  FROM ct.start_date) <> EXTRACT(YEAR  FROM ct.closed_at)
        )
      ) AS has_start_mismatch,
      (
        ct.end_date IS NOT NULL AND ct.closed_at IS NOT NULL AND (
          EXTRACT(MONTH FROM ct.end_date) <> EXTRACT(MONTH FROM ct.closed_at) OR
          EXTRACT(YEAR  FROM ct.end_date) <> EXTRACT(YEAR  FROM ct.closed_at)
        )
      ) AS has_end_mismatch,
      -- Date used for month/year filtering
      CASE p_date_source
        WHEN 'start_date' THEN ct.start_date::date
        ELSE ct.closed_at::date
      END AS filter_date
    FROM public.closed_trips ct
    WHERE
      ct.closed_at IS NOT NULL
  ),
  -- Keep only rows that actually have at least one mismatch
  errors AS (
    SELECT b.*
    FROM base b
    WHERE
      (b.has_start_mismatch OR b.has_end_mismatch)
      -- search
      AND (
        p_search IS NULL OR p_search = ''
        OR b.trip_code   ILIKE '%' || p_search || '%'
        OR b.branch_name ILIKE '%' || p_search || '%'
      )
      -- month filter
      AND (p_month IS NULL OR EXTRACT(MONTH FROM b.filter_date) = p_month)
      -- year filter
      AND (p_year  IS NULL OR EXTRACT(YEAR  FROM b.filter_date) = p_year)
      -- error type filter
      AND (
        p_error_type = 'all'
        OR (p_error_type = 'start_mismatch' AND b.has_start_mismatch AND NOT b.has_end_mismatch)
        OR (p_error_type = 'end_mismatch'   AND b.has_end_mismatch   AND NOT b.has_start_mismatch)
        OR (p_error_type = 'either'         AND (b.has_start_mismatch OR b.has_end_mismatch))
      )
  ),
  counted AS (
    SELECT COUNT(*) AS cnt FROM errors
  )
  SELECT
    e.id,
    e.trip_code,
    e.branch_name,
    e.start_date,
    e.end_date,
    e.closed_at,
    e.created_at,
    e.updated_at,
    CASE
      WHEN e.has_start_mismatch AND e.has_end_mismatch THEN 'Both mismatch'
      WHEN e.has_start_mismatch                        THEN 'Start mismatch'
      ELSE                                                  'End mismatch'
    END AS error_type,
    c.cnt  AS total_count
  FROM errors e, counted c
  ORDER BY e.closed_at DESC NULLS LAST
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_closed_trip_errors TO service_role, authenticated;

-- ── 2. fix_trip_timestamps ────────────────────────────────────────────────────
-- Bulk-updates closed_at / created_at / updated_at for the given trip IDs.
-- Returns the number of rows actually updated.
--
-- NOTE: If a trigger on closed_trips auto-updates `updated_at`, that trigger
-- will run after this statement and may overwrite the value we set.
-- In that case, disable or adjust the trigger before running fixes.

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
      closed_at  = start_date::timestamptz,
      created_at = start_date::timestamptz,
      updated_at = start_date::timestamptz
    WHERE
      id = ANY(p_trip_ids)
      AND start_date IS NOT NULL;
  ELSE
    UPDATE public.closed_trips
    SET
      closed_at  = end_date::timestamptz,
      created_at = end_date::timestamptz,
      updated_at = end_date::timestamptz
    WHERE
      id = ANY(p_trip_ids)
      AND end_date IS NOT NULL;
  END IF;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_trip_timestamps TO service_role, authenticated;

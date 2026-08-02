-- ============================================================
-- System page – Error Panel RPCs  (v3 – text-safe)
--
-- All date/timestamp columns in closed_trips are stored as TEXT
-- (confirmed from Supabase generated types: start_date/end_date/
--  closed_at/created_at/updated_at all return string in TypeScript).
--
-- RETURNS TABLE therefore declares them as TEXT, and every
-- DATE_PART() call casts the value explicitly before use.
-- This avoids both:
--   • "structure of query does not match function result type"
--   • "function pg_catalog.extract(unknown, text) does not exist"
-- ============================================================

-- ── 1. get_closed_trip_errors ─────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_closed_trip_errors(text,int,int,text,text,int,int);

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
  start_date    text,
  end_date      text,
  closed_at     text,
  created_at    text,
  updated_at    text,
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
      ct.trip_code::text,
      ct.branch_name::text,
      ct.start_date::text,
      ct.end_date::text,
      ct.closed_at::text,
      ct.created_at::text,
      ct.updated_at::text,
      -- Mismatch: cast to date/timestamptz before comparing months/years
      (
        ct.start_date IS NOT NULL AND ct.closed_at IS NOT NULL AND (
          DATE_PART('month', ct.start_date::date)       <> DATE_PART('month', ct.closed_at::timestamptz) OR
          DATE_PART('year',  ct.start_date::date)       <> DATE_PART('year',  ct.closed_at::timestamptz)
        )
      ) AS has_start_mismatch,
      (
        ct.end_date IS NOT NULL AND ct.closed_at IS NOT NULL AND (
          DATE_PART('month', ct.end_date::date)         <> DATE_PART('month', ct.closed_at::timestamptz) OR
          DATE_PART('year',  ct.end_date::date)         <> DATE_PART('year',  ct.closed_at::timestamptz)
        )
      ) AS has_end_mismatch,
      -- filter_date as a real DATE so DATE_PART works in the next CTE
      CASE p_date_source
        WHEN 'start_date' THEN ct.start_date::date
        ELSE                   ct.closed_at::date
      END AS filter_date
    FROM public.closed_trips ct
    WHERE ct.closed_at IS NOT NULL
  ),
  errors AS (
    SELECT b.*
    FROM base b
    WHERE
      (b.has_start_mismatch OR b.has_end_mismatch)
      AND (
        p_search IS NULL OR p_search = ''
        OR b.trip_code   ILIKE '%' || p_search || '%'
        OR b.branch_name ILIKE '%' || p_search || '%'
      )
      AND (p_month IS NULL OR DATE_PART('month', b.filter_date)::int = p_month)
      AND (p_year  IS NULL OR DATE_PART('year',  b.filter_date)::int = p_year)
      AND (
        p_error_type = 'all'
        OR (p_error_type = 'start_mismatch' AND b.has_start_mismatch AND NOT b.has_end_mismatch)
        OR (p_error_type = 'end_mismatch'   AND b.has_end_mismatch   AND NOT b.has_start_mismatch)
        OR (p_error_type = 'either'         AND (b.has_start_mismatch OR b.has_end_mismatch))
      )
  ),
  counted AS (SELECT COUNT(*) AS cnt FROM errors)
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
    c.cnt AS total_count
  FROM errors e, counted c
  ORDER BY e.closed_at DESC NULLS LAST
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_closed_trip_errors TO anon, authenticated, service_role;

-- ── 2. fix_trip_timestamps ────────────────────────────────────────────────────
-- Casts text dates to date then to timestamptz before writing back.
-- This is safe whether the underlying columns are text, date, or timestamptz.

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
      closed_at  = (start_date::date)::text,
      created_at = (start_date::date)::text,
      updated_at = (start_date::date)::text
    WHERE id = ANY(p_trip_ids) AND start_date IS NOT NULL;
  ELSE
    UPDATE public.closed_trips
    SET
      closed_at  = (end_date::date)::text,
      created_at = (end_date::date)::text,
      updated_at = (end_date::date)::text
    WHERE id = ANY(p_trip_ids) AND end_date IS NOT NULL;
  END IF;
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fix_trip_timestamps TO anon, authenticated, service_role;

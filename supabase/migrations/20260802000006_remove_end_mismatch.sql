-- ============================================================
-- Remove end-mismatch detection from get_closed_trip_errors
-- Only start_date vs closed_at mismatch is treated as an error.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_closed_trip_errors(text,int,int,text,text,int,int);

CREATE OR REPLACE FUNCTION public.get_closed_trip_errors(
  p_search      text    DEFAULT NULL,
  p_month       int     DEFAULT NULL,
  p_year        int     DEFAULT NULL,
  p_date_source text    DEFAULT 'closed_at',  -- 'start_date' | 'closed_at'
  p_error_type  text    DEFAULT 'all',         -- kept for compat, ignored (always start_mismatch)
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
      -- Only start_date vs closed_at mismatch counts as an error
      (
        ct.start_date IS NOT NULL AND ct.start_date <> '' AND ct.closed_at IS NOT NULL AND (
          DATE_PART('month', ct.start_date::date)   <> DATE_PART('month', ct.closed_at::timestamptz) OR
          DATE_PART('year',  ct.start_date::date)   <> DATE_PART('year',  ct.closed_at::timestamptz)
        )
      ) AS has_start_mismatch,
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
      b.has_start_mismatch
      AND (
        p_search IS NULL OR p_search = ''
        OR b.trip_code   ILIKE '%' || p_search || '%'
        OR b.branch_name ILIKE '%' || p_search || '%'
      )
      AND (p_month IS NULL OR DATE_PART('month', b.filter_date)::int = p_month)
      AND (p_year  IS NULL OR DATE_PART('year',  b.filter_date)::int = p_year)
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
    'Start mismatch'::text AS error_type,
    c.cnt AS total_count
  FROM errors e, counted c
  ORDER BY e.closed_at DESC NULLS LAST
  LIMIT  p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_closed_trip_errors TO anon, authenticated, service_role;

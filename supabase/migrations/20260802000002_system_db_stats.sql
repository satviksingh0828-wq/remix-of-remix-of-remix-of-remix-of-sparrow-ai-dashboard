-- ============================================================
-- System page – Database Stats RPC
-- Reads PostgreSQL system views that require pg_monitor / superuser.
-- SECURITY DEFINER lets the service_role caller access them safely.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_db_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_db_size          text;
  v_table_count      int;
  v_largest_tables   jsonb;
  v_connections      jsonb;
  v_running_queries  jsonb;
  v_cache_hit        jsonb;
BEGIN
  -- Overall DB size
  SELECT pg_size_pretty(pg_database_size(current_database()))
  INTO v_db_size;

  -- Public table count
  SELECT COUNT(*)::int
  INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  -- Top-20 largest tables with row estimates, table size and index size
  SELECT COALESCE(jsonb_agg(t ORDER BY t.total_bytes DESC), '[]'::jsonb)
  INTO v_largest_tables
  FROM (
    SELECT
      pst.schemaname                                                         AS schema_name,
      pst.relname                                                            AS table_name,
      pst.n_live_tup                                                         AS row_estimate,
      pg_total_relation_size(pst.relid)                                      AS total_bytes,
      pg_size_pretty(pg_total_relation_size(pst.relid))                      AS total_size,
      pg_size_pretty(pg_relation_size(pst.relid))                            AS table_size,
      pg_size_pretty(
        pg_total_relation_size(pst.relid) - pg_relation_size(pst.relid)
      )                                                                       AS index_size
    FROM pg_stat_user_tables pst
    WHERE pst.schemaname = 'public'
    ORDER BY pg_total_relation_size(pst.relid) DESC
    LIMIT 20
  ) t;

  -- Connection summary
  SELECT COALESCE(jsonb_agg(c), '[]'::jsonb)
  INTO v_connections
  FROM (
    SELECT
      COUNT(*)                                                AS total,
      COUNT(*) FILTER (WHERE state = 'active')               AS active,
      COUNT(*) FILTER (WHERE state = 'idle')                 AS idle,
      COUNT(*) FILTER (WHERE state = 'idle in transaction')  AS idle_in_transaction,
      COUNT(*) FILTER (WHERE state = 'idle in transaction (aborted)') AS idle_aborted
    FROM pg_stat_activity
    WHERE datname = current_database()
  ) c;

  -- Running queries (non-idle, excluding this backend)
  SELECT COALESCE(jsonb_agg(q ORDER BY q.duration DESC), '[]'::jsonb)
  INTO v_running_queries
  FROM (
    SELECT
      pid,
      state,
      LEFT(query, 250)           AS query_snippet,
      EXTRACT(EPOCH FROM (now() - query_start))::int AS duration_seconds,
      wait_event_type,
      wait_event,
      application_name
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state <> 'idle'
      AND pid <> pg_backend_pid()
    ORDER BY query_start
    LIMIT 20
  ) q;

  -- Cache hit ratios
  SELECT COALESCE(jsonb_agg(ch), '[]'::jsonb)
  INTO v_cache_hit
  FROM (
    SELECT
      ROUND(
        100.0 * SUM(heap_blks_hit)
        / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0),
        2
      ) AS heap_hit_ratio,
      ROUND(
        100.0 * SUM(idx_blks_hit)
        / NULLIF(SUM(idx_blks_hit) + SUM(idx_blks_read), 0),
        2
      ) AS index_hit_ratio
    FROM pg_statio_user_tables
  ) ch;

  RETURN jsonb_build_object(
    'db_size',         v_db_size,
    'table_count',     v_table_count,
    'largest_tables',  COALESCE(v_largest_tables, '[]'::jsonb),
    'connections',     COALESCE(v_connections,    '[]'::jsonb),
    'running_queries', COALESCE(v_running_queries,'[]'::jsonb),
    'cache_hit',       COALESCE(v_cache_hit,      '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_db_stats TO service_role, authenticated;

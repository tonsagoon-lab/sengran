-- Aggregate page views per day server-side to avoid PostgREST 1000-row limit
CREATE OR REPLACE FUNCTION get_pageviews_per_day(since_ts timestamptz, until_ts timestamptz)
RETURNS TABLE (day date, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT created_at::date AS day, count(*)::bigint AS cnt
  FROM page_views
  WHERE created_at >= since_ts AND created_at <= until_ts
  GROUP BY 1
  ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION get_pageviews_per_day(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_pageviews_per_day(timestamptz, timestamptz) TO service_role;

-- Same for top referrers
CREATE OR REPLACE FUNCTION get_top_referrers(since_ts timestamptz, limit_n int DEFAULT 10)
RETURNS TABLE (domain text, cnt bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT referrer_domain AS domain, count(*)::bigint AS cnt
  FROM page_views
  WHERE created_at >= since_ts AND referrer_domain IS NOT NULL
  GROUP BY 1
  ORDER BY 2 DESC
  LIMIT limit_n;
$$;

REVOKE ALL ON FUNCTION get_top_referrers(timestamptz, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_top_referrers(timestamptz, int) TO service_role;

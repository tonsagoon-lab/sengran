-- Track search queries for admin analytics
CREATE TABLE search_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query      text NOT NULL CHECK(length(trim(query)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_search_logs_query   ON search_logs(query);
CREATE INDEX idx_search_logs_created ON search_logs(created_at DESC);

ALTER TABLE search_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (via server action using anon key + SECURITY DEFINER fn)
CREATE OR REPLACE FUNCTION log_search(q text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF length(trim(q)) > 0 THEN
    INSERT INTO search_logs(query) VALUES (trim(q));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION log_search FROM PUBLIC;
GRANT EXECUTE ON FUNCTION log_search TO anon, authenticated;

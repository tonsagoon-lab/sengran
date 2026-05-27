-- Page view tracking
CREATE TABLE IF NOT EXISTS page_views (
  id bigserial PRIMARY KEY,
  path text NOT NULL,
  referrer text,
  referrer_domain text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX page_views_created_at_idx ON page_views (created_at DESC);
CREATE INDEX page_views_referrer_domain_idx ON page_views (referrer_domain) WHERE referrer_domain IS NOT NULL;
CREATE INDEX page_views_path_idx ON page_views (path);

-- RLS: anyone can insert (anon tracking), only service role can read
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_page_views" ON page_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);

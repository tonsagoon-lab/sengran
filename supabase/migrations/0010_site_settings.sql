-- Site settings key-value store (favicon, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public read (layout fetches favicon without auth)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_site_settings"
  ON site_settings FOR SELECT
  USING (true);

-- Only service role can write (via admin client)

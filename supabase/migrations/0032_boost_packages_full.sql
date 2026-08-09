-- Rebuild boost_packages from scratch (table was missing in production)
-- Consolidates 0012 (create) + 0028 (type/reach columns) + seed data.

CREATE TABLE IF NOT EXISTS boost_packages (
  id            serial      PRIMARY KEY,
  name_th       text        NOT NULL,
  price_thb     int         NOT NULL,
  duration_days int         NOT NULL,
  package_type  text        NOT NULL DEFAULT 'premium' CHECK (package_type IN ('premium', 'facebook')),
  reach_text    text,
  is_active     boolean     NOT NULL DEFAULT true,
  display_order int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE boost_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boost_packages: public read" ON boost_packages;
DROP POLICY IF EXISTS "public_read_active_boost_packages" ON boost_packages;

CREATE POLICY "public_read_active_boost_packages" ON boost_packages
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- Seed default packages (only when the table has no rows)
INSERT INTO boost_packages (name_th, price_thb, duration_days, package_type, reach_text, is_active, display_order)
SELECT * FROM (VALUES
  ('Premium 7 วัน',           300::int,  7::int,  'premium',  NULL::text,             true, 0),
  ('Premium 15 วัน',          590::int,  15::int, 'premium',  NULL::text,             true, 1),
  ('Premium 30 วัน',          990::int,  30::int, 'premium',  NULL::text,             true, 2),
  ('โฆษณา Facebook 10 วัน',   1500::int, 10::int, 'facebook', 'คนเห็น 20,000+ คน',    true, 0),
  ('โฆษณา Facebook 20 วัน',   2990::int, 20::int, 'facebook', 'คนเห็น 45,000+ คน',    true, 1)
) AS t(name_th, price_thb, duration_days, package_type, reach_text, is_active, display_order)
WHERE NOT EXISTS (SELECT 1 FROM boost_packages);

-- Add package_type and reach_text to boost_packages
ALTER TABLE boost_packages
  ADD COLUMN IF NOT EXISTS package_type text NOT NULL DEFAULT 'premium'
    CHECK (package_type IN ('premium', 'facebook')),
  ADD COLUMN IF NOT EXISTS reach_text text;

-- Seed default Facebook packages if none exist yet
INSERT INTO boost_packages (name_th, price_thb, duration_days, package_type, reach_text, is_active, display_order)
SELECT name_th, price_thb, duration_days, package_type, reach_text, true, display_order
FROM (VALUES
  ('โฆษณา Facebook 10 วัน', 1500, 10, 'facebook', 'คนเห็น 20,000+ คน', 0),
  ('โฆษณา Facebook 20 วัน', 2990, 20, 'facebook', 'คนเห็น 45,000+ คน', 1)
) AS t(name_th, price_thb, duration_days, package_type, reach_text, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM boost_packages WHERE package_type = 'facebook'
);

-- Allow public to read active packages (for promote modal)
CREATE POLICY IF NOT EXISTS "public_read_active_boost_packages" ON boost_packages
  FOR SELECT TO anon, authenticated USING (is_active = true);

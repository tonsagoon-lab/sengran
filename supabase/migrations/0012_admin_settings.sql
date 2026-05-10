-- Admin settings: provinces is_active, boost_packages, system_announcement

-- Provinces: add is_active toggle
ALTER TABLE provinces ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Boost packages table
CREATE TABLE IF NOT EXISTS boost_packages (
  id            serial      PRIMARY KEY,
  name_th       text        NOT NULL,
  price_thb     int         NOT NULL,
  duration_days int         NOT NULL,
  is_active     boolean     NOT NULL DEFAULT true,
  display_order int         NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE boost_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boost_packages: public read" ON boost_packages
  FOR SELECT USING (true);

-- System announcement (single row, id always = 1)
CREATE TABLE IF NOT EXISTS system_announcement (
  id         int         PRIMARY KEY DEFAULT 1,
  message    text        NOT NULL DEFAULT '',
  is_active  boolean     NOT NULL DEFAULT false,
  bg_color   text        NOT NULL DEFAULT 'orange',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE system_announcement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "system_announcement: public read" ON system_announcement
  FOR SELECT USING (true);

INSERT INTO system_announcement (id, message, is_active, bg_color)
  VALUES (1, '', false, 'orange')
  ON CONFLICT (id) DO NOTHING;

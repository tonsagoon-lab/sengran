-- Migration 0029: Equipment marketplace
-- Run this in Supabase SQL Editor

-- 1. Add 'equipment' to listing_type check
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN ('sale', 'rent', 'both', 'equipment'));

-- 2. Add 'reserved' to status check
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'published', 'sold', 'expired', 'hidden', 'reserved'));

-- 3. Add condition column for equipment items
ALTER TABLE listings ADD COLUMN IF NOT EXISTS condition text
  CHECK (condition IN ('excellent', 'good', 'fair'));

-- 4. Add posted_ip for fraud tracking
ALTER TABLE listings ADD COLUMN IF NOT EXISTS posted_ip text;

-- 5. Add category_type to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_type text NOT NULL DEFAULT 'shop'
  CHECK (category_type IN ('shop', 'equipment'));

-- Ensure all existing categories stay as 'shop'
UPDATE categories SET category_type = 'shop' WHERE category_type IS NULL OR category_type = 'shop';

-- 6. Add phone verification to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

-- 7. OTP attempts table
CREATE TABLE IF NOT EXISTS otp_attempts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL,
  code        text NOT NULL,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  verified    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone_expires ON otp_attempts(phone, expires_at);

-- 8. Activity logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  ip_address  text,
  user_agent  text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON user_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_created ON user_activity_logs(created_at DESC);

-- 9. RLS for new tables (service-only access)
ALTER TABLE otp_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service only" ON otp_attempts;
DROP POLICY IF EXISTS "service only" ON user_activity_logs;

CREATE POLICY "service only" ON otp_attempts USING (false);
CREATE POLICY "service only" ON user_activity_logs USING (false);

-- 10. Seed 16 equipment categories
INSERT INTO categories (name_th, slug, icon, display_order, is_active, category_type) VALUES
  ('เตา & อุปกรณ์ทำอาหาร',   'cooking-equipment',   'Flame',        100, true, 'equipment'),
  ('เครื่องแปรรูปอาหาร',      'food-processor',      'Blend',        101, true, 'equipment'),
  ('ตู้แช่ & ตู้เย็น',         'refrigeration',       'Snowflake',    102, true, 'equipment'),
  ('เบเกอรี่ & ขนม',          'bakery-equipment',    'Cookie',       103, true, 'equipment'),
  ('เครื่องชงกาแฟ',           'coffee-machine',      'Coffee',       104, true, 'equipment'),
  ('เครื่องดื่ม & น้ำแข็ง',  'beverage-equipment',  'GlassWater',   105, true, 'equipment'),
  ('ไอศกรีม',                 'ice-cream-equipment', 'IceCream',     106, true, 'equipment'),
  ('โต๊ะ & เก้าอี้',          'furniture-equipment', 'Armchair',     107, true, 'equipment'),
  ('เคาน์เตอร์ & ชั้นวาง',    'counter-shelf',       'LayoutList',   108, true, 'equipment'),
  ('ซิงค์ & อุปกรณ์ล้าง',    'sink-washing',        'Waves',        109, true, 'equipment'),
  ('รถเข็น & อุปกรณ์เสิร์ฟ','cart-serving',        'ShoppingCart', 110, true, 'equipment'),
  ('ป้าย & แสงสว่าง',         'signage-lighting',    'Lamp',         111, true, 'equipment'),
  ('POS & ระบบร้าน',          'pos-system',          'Monitor',      112, true, 'equipment'),
  ('แอร์ & พัดลม',            'air-cooling',         'Wind',         113, true, 'equipment'),
  ('อุปกรณ์ไฟฟ้า',            'electrical-equipment','Zap',          114, true, 'equipment'),
  ('อื่นๆ (อุปกรณ์)',         'equipment-other',     'Package',      115, true, 'equipment')
ON CONFLICT (slug) DO NOTHING;

-- 11. Index for equipment listings
CREATE INDEX IF NOT EXISTS idx_listings_equipment
  ON listings(status, published_at DESC)
  WHERE listing_type = 'equipment';

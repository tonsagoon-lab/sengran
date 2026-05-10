-- Banners table for homepage slider
-- Note: migration 0005 is 0005_location_search.sql

CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  image_url text NOT NULL,
  link_url text,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners: public read active" ON banners
  FOR SELECT USING (
    is_active = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

-- NOTE: Create a Storage bucket named "banners" (public read) manually
-- in the Supabase dashboard: Storage → New Bucket → name: "banners", Public: ON

-- Example banner insert (run after creating the bucket and uploading an image):
-- INSERT INTO banners (title, image_url, display_order)
-- VALUES ('ลงประกาศฟรี',
--   'https://<project-ref>.supabase.co/storage/v1/object/public/banners/welcome.jpg', 1);

-- เพิ่มต่อท้ายของ 0006_banners.sql เดิม (หลัง CREATE POLICY)

-- Index สำหรับ query หลัก: active banners เรียง display_order
CREATE INDEX IF NOT EXISTS idx_banners_active_order
  ON banners (display_order)
  WHERE is_active = true;

-- Constraint กัน end date มาก่อน start date
ALTER TABLE banners 
  ADD CONSTRAINT banners_date_range_valid
  CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at);

-- Constraint กัน image_url เป็นสตริงว่าง
ALTER TABLE banners
  ADD CONSTRAINT banners_image_url_not_empty
  CHECK (length(trim(image_url)) > 0);
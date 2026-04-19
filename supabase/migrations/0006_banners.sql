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

-- Testimonials / customer reviews for homepage trust section
-- Short phrases (no names) — grouped as compact quote chips

CREATE TABLE IF NOT EXISTS testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "testimonials: public read active" ON testimonials
  FOR SELECT USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_testimonials_active_order
  ON testimonials (display_order)
  WHERE is_active = true;

-- Mock seed short phrases (admin can edit/replace later)
INSERT INTO testimonials (message, display_order) VALUES
  ('ปิดดีลได้เร็วมาก', 0),
  ('มีคนติดต่อเยอะ ตรงกลุ่ม', 1),
  ('ลงประกาศฟรี ไม่มีค่าใช้จ่ายแอบแฝง', 2),
  ('เว็บใช้งานง่าย ลงรูปได้เยอะ', 3),
  ('ทีมงานตอบไว มืออาชีพ', 4),
  ('ได้ราคาตามที่ตั้งไว้', 5),
  ('หาร้านทำเลดีเจอในเว็บนี้', 6),
  ('คนติดต่อจริงจัง ไม่เสียเวลา', 7)
ON CONFLICT DO NOTHING;

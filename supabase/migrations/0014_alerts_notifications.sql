-- Alert preferences: เงื่อนไขการแจ้งเตือนของแต่ละ user
CREATE TABLE IF NOT EXISTS alert_preferences (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  province_ids  int[]       NOT NULL DEFAULT '{}',   -- empty = ทุกจังหวัด
  category_id   int         REFERENCES categories(id) ON DELETE SET NULL,
  listing_type  text        CHECK (listing_type IN ('sale', 'rent', 'both')),
  min_price     int,
  max_price     int,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alert_preferences" ON alert_preferences FOR ALL USING (auth.uid() = user_id);

-- Notifications: ประกาศใหม่ที่ตรงเงื่อนไข (ลบตามประกาศที่ถูกลบ)
CREATE TABLE IF NOT EXISTS notifications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id            uuid        REFERENCES listings(id) ON DELETE CASCADE,
  alert_preference_id   uuid        REFERENCES alert_preferences(id) ON DELETE SET NULL,
  read_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own notifications update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alert_preferences_active ON alert_preferences (user_id) WHERE is_active = true;

-- Trigger: สร้าง notifications เมื่อประกาศถูก publish
CREATE OR REPLACE FUNCTION create_listing_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- เฉพาะเมื่อ status เปลี่ยนเป็น 'published'
  IF NOT (
    (TG_OP = 'INSERT' AND NEW.status = 'published') OR
    (TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM 'published') AND NEW.status = 'published')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, listing_id, alert_preference_id)
  SELECT DISTINCT ON (ap.user_id) ap.user_id, NEW.id, ap.id
  FROM alert_preferences ap
  WHERE ap.is_active = true
    AND ap.user_id != NEW.user_id
    -- province filter: empty array = ทุกจังหวัด
    AND (cardinality(ap.province_ids) = 0 OR NEW.province_id = ANY(ap.province_ids))
    -- category filter
    AND (ap.category_id IS NULL OR ap.category_id = NEW.category_id)
    -- listing type filter
    AND (
      ap.listing_type IS NULL OR
      ap.listing_type = NEW.listing_type OR
      NEW.listing_type = 'both' OR
      ap.listing_type = 'both'
    )
    -- price filter (ตรงกับ sale_price หรือ rent_price อย่างใดอย่างหนึ่ง)
    AND (
      ap.min_price IS NULL OR
      (NEW.sale_price  IS NOT NULL AND NEW.sale_price  >= ap.min_price) OR
      (NEW.rent_price  IS NOT NULL AND NEW.rent_price  >= ap.min_price)
    )
    AND (
      ap.max_price IS NULL OR
      (NEW.sale_price  IS NOT NULL AND NEW.sale_price  <= ap.max_price) OR
      (NEW.rent_price  IS NOT NULL AND NEW.rent_price  <= ap.max_price)
    )
  ORDER BY ap.user_id, ap.created_at DESC;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_listing_published ON listings;
CREATE TRIGGER on_listing_published
AFTER INSERT OR UPDATE OF status ON listings
FOR EACH ROW EXECUTE FUNCTION create_listing_notifications();

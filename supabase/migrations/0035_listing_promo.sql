-- Promotion / discount fields on listings
-- Only meaningful for listing_type='sale' (เซ้ง). Owner-controlled — no expiry.

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS promo_type text CHECK (promo_type IN ('percent', 'amount')),
  ADD COLUMN IF NOT EXISTS promo_value numeric CHECK (promo_value IS NULL OR promo_value > 0),
  ADD COLUMN IF NOT EXISTS promo_activated_at timestamptz;

-- Percent must be 0-100
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_promo_percent_valid;
ALTER TABLE listings
  ADD CONSTRAINT listings_promo_percent_valid
  CHECK (promo_type IS DISTINCT FROM 'percent' OR (promo_value > 0 AND promo_value < 100));

-- Both promo columns must be set together or neither
ALTER TABLE listings
  DROP CONSTRAINT IF EXISTS listings_promo_pair_valid;
ALTER TABLE listings
  ADD CONSTRAINT listings_promo_pair_valid
  CHECK ((promo_type IS NULL AND promo_value IS NULL) OR (promo_type IS NOT NULL AND promo_value IS NOT NULL));

-- Index for the "โปรโมชั่นล่าสุด" homepage row
CREATE INDEX IF NOT EXISTS idx_listings_promo_active
  ON listings (promo_activated_at DESC)
  WHERE promo_type IS NOT NULL AND status = 'published';

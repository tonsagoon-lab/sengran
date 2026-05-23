-- Add near-me location filter to alert_preferences
ALTER TABLE alert_preferences
  ADD COLUMN IF NOT EXISTS center_lat  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS center_lng  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS radius_km   INT;

-- Update trigger: support both province-list mode and near-me (lat/lng + radius) mode
CREATE OR REPLACE FUNCTION create_listing_notifications()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    -- location: near-me mode OR province-list mode
    AND (
      (
        ap.center_lat IS NOT NULL
        AND ap.center_lng IS NOT NULL
        AND ap.radius_km IS NOT NULL
        AND NEW.latitude IS NOT NULL
        AND NEW.longitude IS NOT NULL
        AND (
          6371 * acos(
            LEAST(1,
              cos(radians(ap.center_lat)) * cos(radians(NEW.latitude)) *
              cos(radians(NEW.longitude) - radians(ap.center_lng)) +
              sin(radians(ap.center_lat)) * sin(radians(NEW.latitude))
            )
          )
        ) <= ap.radius_km
      )
      OR
      (
        ap.center_lat IS NULL
        AND (cardinality(ap.province_ids) = 0 OR NEW.province_id = ANY(ap.province_ids))
      )
    )
    AND (ap.category_id IS NULL OR ap.category_id = NEW.category_id)
    AND (
      ap.listing_type IS NULL OR
      ap.listing_type = NEW.listing_type OR
      NEW.listing_type = 'both' OR
      ap.listing_type = 'both'
    )
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

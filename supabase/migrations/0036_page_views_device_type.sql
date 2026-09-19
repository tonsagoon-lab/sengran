-- Track device type (mobile/tablet/desktop) per page view
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS device_type text;

CREATE INDEX IF NOT EXISTS page_views_device_type_idx
  ON page_views (device_type)
  WHERE device_type IS NOT NULL;

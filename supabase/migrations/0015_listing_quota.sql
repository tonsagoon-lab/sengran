-- Per-user listing quota override (null = use global default)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS listing_quota int NULL;

-- Global default quota in system_announcement singleton
ALTER TABLE system_announcement ADD COLUMN IF NOT EXISTS default_listing_quota int NOT NULL DEFAULT 5;

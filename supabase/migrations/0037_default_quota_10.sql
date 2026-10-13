-- Raise default free listing quota from 5 to 10.
-- Users with a per-profile override in profiles.listing_quota are unaffected.
UPDATE system_announcement
  SET default_listing_quota = 10
  WHERE id = 1 AND default_listing_quota = 5;

ALTER TABLE system_announcement
  ALTER COLUMN default_listing_quota SET DEFAULT 10;

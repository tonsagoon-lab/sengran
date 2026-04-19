-- Indexes to support the search/browse query patterns

-- Title ILIKE search (trigram index for fast %keyword% lookups)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm
  ON listings USING gin (title gin_trgm_ops)
  WHERE status = 'published';

-- Composite index for the most common filter combination
CREATE INDEX IF NOT EXISTS idx_listings_status_published_at
  ON listings (status, published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_listings_category_status
  ON listings (category_id, status, published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_listings_province_status
  ON listings (province_id, status, published_at DESC)
  WHERE status = 'published';

-- Featured listings lookup
CREATE INDEX IF NOT EXISTS idx_listings_featured
  ON listings (is_featured, featured_until)
  WHERE status = 'published' AND is_featured = true;

-- Amenity join
CREATE INDEX IF NOT EXISTS idx_listing_amenities_amenity_id
  ON listing_amenities (amenity_id, listing_id);

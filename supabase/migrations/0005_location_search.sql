-- Haversine-based proximity search for listings (no PostGIS required)
-- Note: migration 0004 is 0004_search_indexes.sql

CREATE OR REPLACE FUNCTION listings_within_distance(
  center_lat double precision,
  center_lng double precision,
  radius_km double precision
)
RETURNS TABLE (id uuid, distance_km double precision)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    id,
    (6371 * acos(
      GREATEST(-1, LEAST(1,
        cos(radians(center_lat)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(center_lng)) +
        sin(radians(center_lat)) * sin(radians(latitude))
      ))
    )) AS distance_km
  FROM listings
  WHERE status = 'published'
    AND latitude IS NOT NULL
    AND longitude IS NOT NULL
    AND (6371 * acos(
      GREATEST(-1, LEAST(1,
        cos(radians(center_lat)) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(center_lng)) +
        sin(radians(center_lat)) * sin(radians(latitude))
      ))
    )) < radius_km
  ORDER BY distance_km ASC;
$$;

REVOKE ALL ON FUNCTION listings_within_distance(double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION listings_within_distance(double precision, double precision, double precision)
  TO anon, authenticated;

-- Popular provinces by listing count (used on homepage)
CREATE OR REPLACE FUNCTION popular_provinces(limit_n integer DEFAULT 12)
RETURNS TABLE (
  province_id integer,
  name_th text,
  name_en text,
  slug text,
  listing_count bigint
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    l.province_id,
    p.name_th,
    p.name_en,
    p.slug,
    COUNT(*)::bigint AS listing_count
  FROM listings l
  JOIN provinces p ON l.province_id = p.id
  WHERE l.status = 'published' AND l.province_id IS NOT NULL
  GROUP BY l.province_id, p.name_th, p.name_en, p.slug
  ORDER BY listing_count DESC
  LIMIT limit_n;
$$;

REVOKE ALL ON FUNCTION popular_provinces(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION popular_provinces(integer) TO anon, authenticated;

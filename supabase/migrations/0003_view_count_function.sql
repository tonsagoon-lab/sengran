-- ============================================================
-- 0003_view_count_function.sql
-- SECURITY DEFINER function to increment listing view count
-- bypasses RLS so anonymous users can trigger it
-- ============================================================

CREATE OR REPLACE FUNCTION increment_listing_view_count(listing_slug text)
RETURNS void AS $$
BEGIN
  UPDATE listings
  SET view_count = view_count + 1
  WHERE slug = listing_slug
    AND status = 'published';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

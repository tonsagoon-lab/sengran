-- ============================================================
-- 0003_view_count_function.sql
-- SECURITY DEFINER function to increment listing view count
-- bypasses RLS so anonymous users can trigger it
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_listing_view_count(listing_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.listings
  SET view_count = view_count + 1
  WHERE slug = listing_slug
    AND status = 'published';
END;
$$;

-- Revoke default and grant explicitly
REVOKE ALL ON FUNCTION public.increment_listing_view_count(text) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_listing_view_count(text) TO anon, authenticated;
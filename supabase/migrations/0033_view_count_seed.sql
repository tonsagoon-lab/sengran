-- ============================================================
-- 0033_view_count_seed.sql
-- Seed a random baseline (70-150) once a listing crosses 20 real views.
-- Displayed view count = view_count + view_count_seed (public frontends only).
-- If view_count < 20 the frontend hides the count entirely.
-- ============================================================

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS view_count_seed int;

-- Backfill: any listing already past the threshold gets a seed immediately
UPDATE public.listings
SET view_count_seed = floor(random() * 81)::int + 70
WHERE view_count >= 20 AND view_count_seed IS NULL;

-- Rewrite the increment RPC so the seed is assigned the moment we cross 20
CREATE OR REPLACE FUNCTION public.increment_listing_view_count(listing_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_count int;
BEGIN
  UPDATE public.listings
  SET view_count = view_count + 1
  WHERE slug = listing_slug
    AND status = 'published'
  RETURNING view_count INTO new_count;

  IF new_count IS NOT NULL AND new_count >= 20 THEN
    UPDATE public.listings
    SET view_count_seed = floor(random() * 81)::int + 70
    WHERE slug = listing_slug
      AND view_count_seed IS NULL;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_listing_view_count(text) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_listing_view_count(text) TO anon, authenticated;

-- Allow authenticated users to delete their own account (App Store / Play Store requirement)
-- Deletes profile row (cascades to listings, favorites, messages, conversations, notifications, etc.)
-- Then deletes auth.users row using SECURITY DEFINER privileges

CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Best-effort: unlink storage-owning rows first so downstream cascades work cleanly
  DELETE FROM public.listing_images
    WHERE listing_id IN (SELECT id FROM public.listings WHERE user_id = uid);

  -- Delete profile (cascades to listings, favorites, transactions, boosts, notifications, alert_preferences, etc.)
  DELETE FROM public.profiles WHERE id = uid;

  -- Delete the auth user record itself
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM public;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;

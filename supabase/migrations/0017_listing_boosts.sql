-- listing_boosts: tracks all promotion purchases
CREATE TABLE IF NOT EXISTS listing_boosts (
  id          bigserial   PRIMARY KEY,
  listing_id  uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('homepage', 'premium', 'facebook')),
  package_key text        NOT NULL,
  coins_spent int         NOT NULL,
  duration_days int,
  expires_at  timestamptz,
  status      text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS listing_boosts_listing_id_idx ON listing_boosts(listing_id);
CREATE INDEX IF NOT EXISTS listing_boosts_user_id_idx ON listing_boosts(user_id);

ALTER TABLE listing_boosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boosts" ON listing_boosts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

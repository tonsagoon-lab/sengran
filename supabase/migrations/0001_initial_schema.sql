-- ============================================================
-- 0001_initial_schema.sql
-- เซ้งร้าน.com — Initial database schema
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE profiles (
  id                uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      text,
  mobile            text,
  line_id           text,
  avatar_url        text,
  role              text        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  wallet_balance    numeric(10,2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  legacy_wp_user_id int,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ── Categories ───────────────────────────────────────────────
CREATE TABLE categories (
  id            serial      PRIMARY KEY,
  name_th       text        NOT NULL,
  slug          text        NOT NULL UNIQUE,
  icon          text,
  display_order int         NOT NULL DEFAULT 0,
  is_active     boolean     NOT NULL DEFAULT true
);

-- ── Provinces ────────────────────────────────────────────────
CREATE TABLE provinces (
  id       serial PRIMARY KEY,
  name_th  text   NOT NULL,
  name_en  text   NOT NULL,
  slug     text   NOT NULL UNIQUE,
  region   text   NOT NULL
);

-- ── Amenities ────────────────────────────────────────────────
CREATE TABLE amenities (
  id      serial PRIMARY KEY,
  name_th text   NOT NULL,
  slug    text   NOT NULL UNIQUE,
  icon    text
);

-- ── Listings ─────────────────────────────────────────────────
CREATE TABLE listings (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title              text          NOT NULL,
  description        text          NOT NULL,
  listing_type       text          NOT NULL CHECK (listing_type IN ('sale', 'rent', 'both')),
  sale_price         numeric(12,2),
  rent_price         numeric(12,2),
  deposit_months     int,
  price_note         text,
  category_id        int           REFERENCES categories(id),
  province_id        int           REFERENCES provinces(id),
  district           text,
  address            text,
  latitude           double precision,
  longitude          double precision,
  area_sqm           numeric(8,2),
  contact_name       text          NOT NULL,
  contact_mobile     text          NOT NULL,
  contact_line       text,
  video_url          text,
  status             text          NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'sold', 'expired', 'hidden')),
  is_featured        boolean       NOT NULL DEFAULT false,
  featured_until     timestamptz,
  boost_until        timestamptz,
  boost_rank         int           NOT NULL DEFAULT 0,
  view_count         int           NOT NULL DEFAULT 0,
  slug               text          NOT NULL UNIQUE,
  published_at       timestamptz,
  expires_at         timestamptz,
  legacy_wp_post_id  int           UNIQUE,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

-- ── Listing Images ───────────────────────────────────────────
CREATE TABLE listing_images (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  storage_path  text        NOT NULL,
  display_order int         NOT NULL DEFAULT 0,
  alt_text      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Listing Amenities (many-to-many) ─────────────────────────
CREATE TABLE listing_amenities (
  listing_id  uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  amenity_id  int  NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (listing_id, amenity_id)
);

-- ── Transactions ─────────────────────────────────────────────
CREATE TABLE transactions (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid          NOT NULL REFERENCES profiles(id),
  type           text          NOT NULL CHECK (type IN ('topup', 'boost', 'feature', 'refund', 'admin_adjust')),
  amount         numeric(10,2) NOT NULL,
  balance_after  numeric(10,2) NOT NULL,
  reference_id   uuid,
  status         text          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method text,
  payment_ref    text,
  notes          text,
  created_at     timestamptz   NOT NULL DEFAULT now()
);

-- ── Boosts ───────────────────────────────────────────────────
CREATE TABLE boosts (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id     uuid          NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id        uuid          NOT NULL REFERENCES profiles(id),
  boost_type     text          NOT NULL CHECK (boost_type IN ('top', 'featured')),
  starts_at      timestamptz   NOT NULL,
  ends_at        timestamptz   NOT NULL,
  price          numeric(10,2) NOT NULL,
  transaction_id uuid          REFERENCES transactions(id),
  created_at     timestamptz   NOT NULL DEFAULT now()
);

-- ── Favorites ────────────────────────────────────────────────
CREATE TABLE favorites (
  user_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id uuid        NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_listings_status_published
  ON listings (status, published_at DESC);

CREATE INDEX idx_listings_category_province_status
  ON listings (category_id, province_id, status);

CREATE INDEX idx_listings_boost
  ON listings (boost_rank DESC, boost_until DESC)
  WHERE status = 'published';

CREATE INDEX idx_listings_slug
  ON listings (slug);

CREATE INDEX idx_listings_user
  ON listings (user_id);

CREATE INDEX idx_listing_images_listing_order
  ON listing_images (listing_id, display_order);

CREATE INDEX idx_transactions_user_date
  ON transactions (user_id, created_at DESC);

-- Full-text search (Thai text doesn't tokenize well with english;
-- 'simple' config skips stemming — best option without pg_jieba extension)
CREATE INDEX idx_listings_fts
  ON listings
  USING gin(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER — auto-create profile on auth.users insert
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, mobile)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'mobile', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE provinces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_images    ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE boosts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites         ENABLE ROW LEVEL SECURITY;

-- ── profiles policies ────────────────────────────────────────
CREATE POLICY "profiles: public read"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "profiles: users update own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── categories / provinces / amenities (public read-only) ────
CREATE POLICY "categories: public read"
  ON categories FOR SELECT USING (true);

CREATE POLICY "provinces: public read"
  ON provinces FOR SELECT USING (true);

CREATE POLICY "amenities: public read"
  ON amenities FOR SELECT USING (true);

-- ── listings policies ────────────────────────────────────────
-- Anyone can see published listings
CREATE POLICY "listings: public read published"
  ON listings FOR SELECT
  USING (status = 'published');

-- Owners can see all their own listings (including drafts)
CREATE POLICY "listings: owner read own"
  ON listings FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create listings
CREATE POLICY "listings: auth insert"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Owners can update their own listings
CREATE POLICY "listings: owner update"
  ON listings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Owners can delete their own listings
CREATE POLICY "listings: owner delete"
  ON listings FOR DELETE
  USING (auth.uid() = user_id);

-- ── listing_images policies ──────────────────────────────────
CREATE POLICY "listing_images: public read published"
  ON listing_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = listing_id AND (l.status = 'published' OR l.user_id = auth.uid())
    )
  );

CREATE POLICY "listing_images: owner insert"
  ON listing_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "listing_images: owner delete"
  ON listing_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );

-- ── listing_amenities policies ───────────────────────────────
CREATE POLICY "listing_amenities: public read published"
  ON listing_amenities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = listing_id AND (l.status = 'published' OR l.user_id = auth.uid())
    )
  );

CREATE POLICY "listing_amenities: owner insert"
  ON listing_amenities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );

CREATE POLICY "listing_amenities: owner delete"
  ON listing_amenities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM listings l
      WHERE l.id = listing_id AND l.user_id = auth.uid()
    )
  );

-- ── transactions policies ────────────────────────────────────
CREATE POLICY "transactions: users read own"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

-- ── boosts policies ──────────────────────────────────────────
CREATE POLICY "boosts: users read own"
  ON boosts FOR SELECT
  USING (auth.uid() = user_id);

-- ── favorites policies ───────────────────────────────────────
CREATE POLICY "favorites: users read own"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites: users insert own"
  ON favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites: users delete own"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);
-- ── Extra check constraints for data integrity ───────────────
ALTER TABLE listings
  ADD CONSTRAINT listings_sale_price_positive
    CHECK (sale_price IS NULL OR sale_price >= 0),
  ADD CONSTRAINT listings_rent_price_positive
    CHECK (rent_price IS NULL OR rent_price >= 0),
  ADD CONSTRAINT listings_area_positive
    CHECK (area_sqm IS NULL OR area_sqm > 0),
  ADD CONSTRAINT listings_has_price
    CHECK (
      (listing_type = 'sale' AND sale_price IS NOT NULL) OR
      (listing_type = 'rent' AND rent_price IS NOT NULL) OR
      (listing_type = 'both' AND sale_price IS NOT NULL AND rent_price IS NOT NULL)
    );

-- Extra index for "my listings" page
CREATE INDEX idx_listings_user_status_updated
  ON listings (user_id, status, updated_at DESC);
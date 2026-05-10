CREATE TABLE IF NOT EXISTS articles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  slug            text        NOT NULL UNIQUE,
  content         text        NOT NULL DEFAULT '',
  excerpt         text,
  cover_image_url text,
  author_id       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at    timestamptz,
  meta_description text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "articles: public read published" ON articles
  FOR SELECT USING (status = 'published');

-- Index for slug lookup and listing
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published_at DESC)
  WHERE status = 'published';

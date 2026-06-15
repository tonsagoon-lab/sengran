-- Auto-cleanup old page_views on insert (probabilistic, runs ~1% of inserts)
-- Prevents free-tier storage limits from blocking new rows
CREATE OR REPLACE FUNCTION cleanup_old_page_views()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF random() < 0.01 THEN
    DELETE FROM page_views WHERE created_at < NOW() - INTERVAL '90 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_cleanup_page_views ON page_views;
CREATE TRIGGER auto_cleanup_page_views
  AFTER INSERT ON page_views
  FOR EACH ROW EXECUTE FUNCTION cleanup_old_page_views();

-- One-time: delete rows older than 90 days right now
DELETE FROM page_views WHERE created_at < NOW() - INTERVAL '90 days';

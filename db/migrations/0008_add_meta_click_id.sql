ALTER TABLE attribution_clicks
  ADD COLUMN IF NOT EXISTS fbclid text;

CREATE INDEX IF NOT EXISTS attribution_clicks_fbclid_idx
  ON attribution_clicks (fbclid)
  WHERE fbclid IS NOT NULL;

ALTER TABLE attribution_conversions
  ADD COLUMN IF NOT EXISTS fbclid text;

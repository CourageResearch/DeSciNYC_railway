ALTER TABLE IF EXISTS ad_ads
  ADD COLUMN IF NOT EXISTS creative_headline text,
  ADD COLUMN IF NOT EXISTS creative_body text,
  ADD COLUMN IF NOT EXISTS creative_image_url text,
  ADD COLUMN IF NOT EXISTS creative_image_label text,
  ADD COLUMN IF NOT EXISTS creative_format text,
  ADD COLUMN IF NOT EXISTS creative_theme text;

ALTER TABLE IF EXISTS ad_daily_metrics
  ADD COLUMN IF NOT EXISTS creative_headline text,
  ADD COLUMN IF NOT EXISTS creative_body text,
  ADD COLUMN IF NOT EXISTS creative_image_url text,
  ADD COLUMN IF NOT EXISTS creative_image_label text,
  ADD COLUMN IF NOT EXISTS creative_format text,
  ADD COLUMN IF NOT EXISTS creative_theme text,
  ADD COLUMN IF NOT EXISTS destination_url text;

CREATE INDEX IF NOT EXISTS ad_daily_metrics_creative_idx
  ON ad_daily_metrics (
    creative_theme,
    creative_headline,
    creative_image_label,
    metric_date DESC
  );

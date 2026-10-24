-- Persist dates for events hosted outside Luma so homepage ordering stays correct.
ALTER TABLE events ADD COLUMN IF NOT EXISTS starts_at timestamptz;

WITH updated AS (
  UPDATE events
  SET title = 'Quantifying Uncertainty in Clinical Trials (LA Tech Week)',
      speaker = 'Dr. Michael Fischer',
      yt_uuid = 'bqDch_aXFWY',
      luma_url = 'https://partiful.com/e/TNW85AMKAETKLfvV779p',
      luma_id = 'partiful-TNW85AMKAETKLfvV779p',
      starts_at = '2026-10-14T22:00:00Z',
      active = false
  WHERE yt_uuid = 'bqDch_aXFWY'
     OR luma_url = 'https://partiful.com/e/TNW85AMKAETKLfvV779p'
  RETURNING 1
)
INSERT INTO events (
  title, speaker, yt_uuid, luma_url, luma_id, starts_at, active, sort_order
)
SELECT
  'Quantifying Uncertainty in Clinical Trials (LA Tech Week)',
  'Dr. Michael Fischer',
  'bqDch_aXFWY',
  'https://partiful.com/e/TNW85AMKAETKLfvV779p',
  'partiful-TNW85AMKAETKLfvV779p',
  '2026-10-14T22:00:00Z'::timestamptz,
  false,
  (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM events)
WHERE NOT EXISTS (SELECT 1 FROM updated)
  AND NOT EXISTS (
    SELECT 1 FROM events
    WHERE yt_uuid = 'bqDch_aXFWY'
       OR luma_url = 'https://partiful.com/e/TNW85AMKAETKLfvV779p'
  );

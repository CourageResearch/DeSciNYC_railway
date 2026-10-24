WITH updated AS (
  UPDATE events
  SET title = 'Science x AI Breakfast (SF Tech Week)',
      speaker = NULL,
      yt_uuid = 'ZvplAOaPCrA',
      luma_url = 'https://partiful.com/e/NuJIL6o1KBCUnGaAOrLS',
      luma_id = 'partiful-NuJIL6o1KBCUnGaAOrLS',
      starts_at = '2026-10-05T14:00:00Z',
      active = false
  WHERE yt_uuid = 'ZvplAOaPCrA'
     OR luma_url = 'https://partiful.com/e/NuJIL6o1KBCUnGaAOrLS'
  RETURNING 1
)
INSERT INTO events (
  title, speaker, yt_uuid, luma_url, luma_id, starts_at, active, sort_order
)
SELECT
  'Science x AI Breakfast (SF Tech Week)',
  NULL,
  'ZvplAOaPCrA',
  'https://partiful.com/e/NuJIL6o1KBCUnGaAOrLS',
  'partiful-NuJIL6o1KBCUnGaAOrLS',
  '2026-10-05T14:00:00Z'::timestamptz,
  false,
  (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM events)
WHERE NOT EXISTS (SELECT 1 FROM updated)
  AND NOT EXISTS (
    SELECT 1 FROM events
    WHERE yt_uuid = 'ZvplAOaPCrA'
       OR luma_url = 'https://partiful.com/e/NuJIL6o1KBCUnGaAOrLS'
  );

WITH updated AS (
  UPDATE events
  SET title = 'Science x AI Breakfast (LA Tech Week)',
      speaker = NULL,
      yt_uuid = 'cGPjTMsFQOs',
      luma_url = 'https://partiful.com/e/3aQg9EqWLbdEaUMYrJRi',
      luma_id = 'partiful-3aQg9EqWLbdEaUMYrJRi',
      starts_at = '2026-10-13T15:00:00Z',
      active = false
  WHERE yt_uuid = 'cGPjTMsFQOs'
     OR luma_url = 'https://partiful.com/e/3aQg9EqWLbdEaUMYrJRi'
  RETURNING 1
)
INSERT INTO events (
  title, speaker, yt_uuid, luma_url, luma_id, starts_at, active, sort_order
)
SELECT
  'Science x AI Breakfast (LA Tech Week)',
  NULL,
  'cGPjTMsFQOs',
  'https://partiful.com/e/3aQg9EqWLbdEaUMYrJRi',
  'partiful-3aQg9EqWLbdEaUMYrJRi',
  '2026-10-13T15:00:00Z'::timestamptz,
  false,
  (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM events)
WHERE NOT EXISTS (SELECT 1 FROM updated)
  AND NOT EXISTS (
    SELECT 1 FROM events
    WHERE yt_uuid = 'cGPjTMsFQOs'
       OR luma_url = 'https://partiful.com/e/3aQg9EqWLbdEaUMYrJRi'
  );

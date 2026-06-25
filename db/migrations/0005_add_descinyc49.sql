WITH updated AS (
  UPDATE events
  SET title = 'Peptides 101',
      speaker = NULL,
      luma_url = 'https://luma.com/descinyc49',
      luma_id = 'evt-NyxpH2NdNO4DotF',
      active = true
  WHERE luma_id = 'evt-NyxpH2NdNO4DotF'
     OR luma_url IN ('https://luma.com/descinyc49', 'https://lu.ma/descinyc49')
  RETURNING 1
)
INSERT INTO events (
  title,
  speaker,
  yt_uuid,
  luma_url,
  luma_id,
  slides,
  active,
  sort_order
)
SELECT
  'Peptides 101',
  NULL,
  NULL,
  'https://luma.com/descinyc49',
  'evt-NyxpH2NdNO4DotF',
  NULL,
  true,
  (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM events)
WHERE NOT EXISTS (SELECT 1 FROM updated)
  AND NOT EXISTS (
    SELECT 1
    FROM events
    WHERE luma_id = 'evt-NyxpH2NdNO4DotF'
       OR luma_url IN ('https://luma.com/descinyc49', 'https://lu.ma/descinyc49')
  );

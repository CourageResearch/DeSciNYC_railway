WITH updated AS (
  UPDATE events
  SET title = 'DeSciNYC: Sleep',
      speaker = NULL,
      luma_url = 'https://luma.com/descinyc47',
      luma_id = 'evt-djJBa8vkjFuxb95',
      active = true
  WHERE luma_id = 'evt-djJBa8vkjFuxb95'
     OR luma_url IN ('https://luma.com/descinyc47', 'https://lu.ma/descinyc47')
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
  'DeSciNYC: Sleep',
  NULL,
  NULL,
  'https://luma.com/descinyc47',
  'evt-djJBa8vkjFuxb95',
  NULL,
  true,
  (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM events)
WHERE NOT EXISTS (SELECT 1 FROM updated)
  AND NOT EXISTS (
    SELECT 1
    FROM events
    WHERE luma_id = 'evt-djJBa8vkjFuxb95'
       OR luma_url IN ('https://luma.com/descinyc47', 'https://lu.ma/descinyc47')
  );

WITH updated AS (
  UPDATE events
  SET title = 'DeSciNYC: Robin Hanson and Prediction Markets',
      speaker = NULL,
      luma_url = 'https://luma.com/descinyc48',
      luma_id = 'evt-HaPgzOtDdoBxWST',
      active = true
  WHERE luma_id = 'evt-HaPgzOtDdoBxWST'
     OR luma_url IN ('https://luma.com/descinyc48', 'https://lu.ma/descinyc48')
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
  'DeSciNYC: Robin Hanson and Prediction Markets',
  NULL,
  NULL,
  'https://luma.com/descinyc48',
  'evt-HaPgzOtDdoBxWST',
  NULL,
  true,
  (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM events)
WHERE NOT EXISTS (SELECT 1 FROM updated)
  AND NOT EXISTS (
    SELECT 1
    FROM events
    WHERE luma_id = 'evt-HaPgzOtDdoBxWST'
       OR luma_url IN ('https://luma.com/descinyc48', 'https://lu.ma/descinyc48')
  );

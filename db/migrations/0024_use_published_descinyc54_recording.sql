-- Replace the superseded recording ID used by the Videos listing.
UPDATE events
SET yt_uuid = 'vOMeEN-qGh0'
WHERE (luma_id = 'evt-9OpRa1KTEFHva0s'
    OR luma_url IN ('https://luma.com/descinyc54', 'https://lu.ma/descinyc54'))
  AND yt_uuid = 'AQKJ3Hzw2H8';

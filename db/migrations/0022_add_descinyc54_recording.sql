-- Publish the recording and move the completed event into the Videos section.
UPDATE events
SET active = false,
    yt_uuid = 'AQKJ3Hzw2H8'
WHERE luma_id = 'evt-9OpRa1KTEFHva0s'
   OR luma_url IN ('https://luma.com/descinyc54', 'https://lu.ma/descinyc54');

-- The October 5 Robin Hanson event was canceled.
UPDATE events
SET active = false
WHERE luma_id = 'evt-HaPgzOtDdoBxWST'
   OR luma_url IN ('https://luma.com/descinyc48', 'https://lu.ma/descinyc48');

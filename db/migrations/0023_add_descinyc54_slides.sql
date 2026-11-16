-- Publish the reviewed reconstructed slide edition beside Marko's recording.
UPDATE events
SET slides = 'descinyc54-marko-jukic-recreated-slides.pdf'
WHERE luma_id = 'evt-9OpRa1KTEFHva0s'
   OR luma_url IN ('https://luma.com/descinyc54', 'https://lu.ma/descinyc54');

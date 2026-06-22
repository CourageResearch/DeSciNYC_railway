UPDATE events
SET title = CASE luma_id
  WHEN 'evt-Z5LdUYqkwziNMNV' THEN 'What Are We Breathing on the NYC Subway?'
  WHEN 'evt-djJBa8vkjFuxb95' THEN 'Sleep'
  WHEN 'evt-HaPgzOtDdoBxWST' THEN 'Robin Hanson and Prediction Markets'
  ELSE title
END
WHERE luma_id IN (
  'evt-Z5LdUYqkwziNMNV',
  'evt-djJBa8vkjFuxb95',
  'evt-HaPgzOtDdoBxWST'
);

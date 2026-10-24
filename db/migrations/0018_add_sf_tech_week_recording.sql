WITH updated AS (
  UPDATE events
  SET title = 'Quantifying Uncertainty in Clinical Trials (SF Tech Week)',
      speaker = 'Dr. Michael Fischer',
      yt_uuid = 'fmqS1DKiHf4',
      luma_url = 'https://partiful.com/e/cDUnl38iMfhuG9t4VgPH',
      luma_id = 'partiful-cDUnl38iMfhuG9t4VgPH',
      starts_at = '2026-10-07T02:30:00Z',
      active = false
  WHERE yt_uuid = 'fmqS1DKiHf4'
     OR luma_url = 'https://partiful.com/e/cDUnl38iMfhuG9t4VgPH'
  RETURNING 1
)
INSERT INTO events (
  title, speaker, yt_uuid, luma_url, luma_id, starts_at, active, sort_order
)
SELECT
  'Quantifying Uncertainty in Clinical Trials (SF Tech Week)',
  'Dr. Michael Fischer',
  'fmqS1DKiHf4',
  'https://partiful.com/e/cDUnl38iMfhuG9t4VgPH',
  'partiful-cDUnl38iMfhuG9t4VgPH',
  '2026-10-07T02:30:00Z'::timestamptz,
  false,
  (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM events)
WHERE NOT EXISTS (SELECT 1 FROM updated)
  AND NOT EXISTS (
    SELECT 1 FROM events
    WHERE yt_uuid = 'fmqS1DKiHf4'
       OR luma_url = 'https://partiful.com/e/cDUnl38iMfhuG9t4VgPH'
  );

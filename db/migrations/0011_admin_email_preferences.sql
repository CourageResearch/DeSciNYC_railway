CREATE TABLE IF NOT EXISTS admin_email_preferences (
  email_type text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO admin_email_preferences (email_type, enabled)
VALUES
  ('contact', true),
  ('subscribe', true),
  ('speaker_suggestion', true),
  ('ad_click', true),
  ('ad_registration', true)
ON CONFLICT (email_type) DO NOTHING;

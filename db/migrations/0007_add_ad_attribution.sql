CREATE TABLE IF NOT EXISTS attribution_clicks (
  click_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug text NOT NULL,
  luma_event_id text NOT NULL,
  luma_url text NOT NULL,
  landing_url text NOT NULL,
  landing_path text NOT NULL,
  twclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  utm_id text,
  referrer text,
  user_agent text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attribution_clicks_event_created_idx
  ON attribution_clicks (event_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS attribution_clicks_twclid_idx
  ON attribution_clicks (twclid)
  WHERE twclid IS NOT NULL;

CREATE INDEX IF NOT EXISTS attribution_clicks_utm_id_idx
  ON attribution_clicks (utm_id)
  WHERE utm_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS attribution_conversions (
  conversion_id text PRIMARY KEY,
  click_id uuid REFERENCES attribution_clicks(click_id) ON DELETE SET NULL,
  event_slug text NOT NULL,
  luma_event_id text,
  luma_guest_id text,
  luma_ticket_id text,
  hashed_email text,
  twclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  utm_id text,
  event_source_url text,
  conversion_value text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  x_sent_at timestamptz,
  x_status integer,
  x_response jsonb,
  x_error text,
  x_skipped_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS attribution_conversions_click_idx
  ON attribution_conversions (click_id);

CREATE INDEX IF NOT EXISTS attribution_conversions_event_created_idx
  ON attribution_conversions (event_slug, created_at DESC);

DROP TRIGGER IF EXISTS attribution_clicks_set_updated_at ON attribution_clicks;
CREATE TRIGGER attribution_clicks_set_updated_at
  BEFORE UPDATE ON attribution_clicks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS attribution_conversions_set_updated_at ON attribution_conversions;
CREATE TRIGGER attribution_conversions_set_updated_at
  BEFORE UPDATE ON attribution_conversions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

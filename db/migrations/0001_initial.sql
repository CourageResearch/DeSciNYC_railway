CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS events (
  event_uuid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id integer UNIQUE,
  title text NOT NULL,
  speaker text,
  yt_uuid text,
  luma_url text NOT NULL,
  luma_id text NOT NULL,
  slides text,
  active boolean NOT NULL DEFAULT false,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_active_sort_idx
  ON events (active, sort_order, id, created_at);

CREATE TABLE IF NOT EXISTS gallery_images (
  id bigserial PRIMARY KEY,
  object_key text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  content_type text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gallery_images_archived_created_idx
  ON gallery_images (archived, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_set_updated_at ON events;
CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS gallery_images_set_updated_at ON gallery_images;
CREATE TRIGGER gallery_images_set_updated_at
  BEFORE UPDATE ON gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

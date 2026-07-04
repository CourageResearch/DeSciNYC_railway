CREATE TABLE IF NOT EXISTS ad_platform_accounts (
  platform text NOT NULL,
  account_id text NOT NULL,
  account_name text,
  currency text,
  timezone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, account_id)
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  platform text NOT NULL,
  platform_campaign_id text NOT NULL,
  account_id text,
  campaign_name text NOT NULL,
  objective text,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, platform_campaign_id)
);

CREATE TABLE IF NOT EXISTS ad_ad_groups (
  platform text NOT NULL,
  platform_ad_group_id text NOT NULL,
  platform_campaign_id text,
  account_id text,
  ad_group_name text NOT NULL,
  status text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, platform_ad_group_id)
);

CREATE TABLE IF NOT EXISTS ad_ads (
  platform text NOT NULL,
  platform_ad_id text NOT NULL,
  platform_campaign_id text,
  platform_ad_group_id text,
  account_id text,
  ad_name text NOT NULL,
  status text,
  destination_url text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  event_slug text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (platform, platform_ad_id)
);

CREATE TABLE IF NOT EXISTS ad_utm_mappings (
  mapping_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  platform_campaign_id text,
  platform_ad_group_id text,
  platform_ad_id text,
  event_slug text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ad_utm_mappings_scope_idx
  ON ad_utm_mappings (
    platform,
    COALESCE(platform_campaign_id, ''),
    COALESCE(platform_ad_group_id, ''),
    COALESCE(platform_ad_id, '')
  );

CREATE TABLE IF NOT EXISTS ad_daily_metrics (
  metric_id text PRIMARY KEY,
  platform text NOT NULL,
  metric_date date NOT NULL,
  account_id text,
  account_name text,
  currency text,
  platform_campaign_id text,
  campaign_name text,
  platform_ad_group_id text,
  ad_group_name text,
  platform_ad_id text,
  ad_name text,
  placement text,
  event_slug text,
  utm_source text,
  utm_campaign text,
  utm_content text,
  spend_micros bigint NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  reach integer,
  clicks integer NOT NULL DEFAULT 0,
  cpc_micros bigint,
  cpm_micros bigint,
  ctr numeric,
  provisional boolean NOT NULL DEFAULT false,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_daily_metrics_date_platform_idx
  ON ad_daily_metrics (metric_date DESC, platform);

CREATE INDEX IF NOT EXISTS ad_daily_metrics_campaign_idx
  ON ad_daily_metrics (platform, platform_campaign_id, metric_date DESC);

CREATE INDEX IF NOT EXISTS ad_daily_metrics_utm_idx
  ON ad_daily_metrics (utm_source, utm_campaign, utm_content, metric_date DESC);

CREATE TABLE IF NOT EXISTS ad_sync_runs (
  sync_run_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  status text NOT NULL,
  range_start date NOT NULL,
  range_end date NOT NULL,
  rows_synced integer NOT NULL DEFAULT 0,
  error text,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ad_sync_runs_platform_started_idx
  ON ad_sync_runs (platform, started_at DESC);

DROP TRIGGER IF EXISTS ad_platform_accounts_set_updated_at ON ad_platform_accounts;
CREATE TRIGGER ad_platform_accounts_set_updated_at
  BEFORE UPDATE ON ad_platform_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS ad_campaigns_set_updated_at ON ad_campaigns;
CREATE TRIGGER ad_campaigns_set_updated_at
  BEFORE UPDATE ON ad_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS ad_ad_groups_set_updated_at ON ad_ad_groups;
CREATE TRIGGER ad_ad_groups_set_updated_at
  BEFORE UPDATE ON ad_ad_groups
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS ad_ads_set_updated_at ON ad_ads;
CREATE TRIGGER ad_ads_set_updated_at
  BEFORE UPDATE ON ad_ads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS ad_utm_mappings_set_updated_at ON ad_utm_mappings;
CREATE TRIGGER ad_utm_mappings_set_updated_at
  BEFORE UPDATE ON ad_utm_mappings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS ad_daily_metrics_set_updated_at ON ad_daily_metrics;
CREATE TRIGGER ad_daily_metrics_set_updated_at
  BEFORE UPDATE ON ad_daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS ad_sync_runs_set_updated_at ON ad_sync_runs;
CREATE TRIGGER ad_sync_runs_set_updated_at
  BEFORE UPDATE ON ad_sync_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

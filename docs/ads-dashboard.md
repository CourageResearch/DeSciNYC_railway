# Ads Dashboard

The protected ads dashboard lives at `/ads` and reuses the existing admin
password session. It reads platform delivery data from the local Postgres ads
tables and joins that with `attribution_clicks` and `attribution_conversions`.

## Required env

Meta:

```text
META_AD_ACCOUNT_ID=
META_ACCESS_TOKEN=
META_API_VERSION=v23.0
```

X:

```text
X_ADS_ACCOUNT_ID=
X_ADS_API_KEY=
X_ADS_API_SECRET=
X_ADS_ACCESS_TOKEN=
X_ADS_ACCESS_TOKEN_SECRET=
X_ADS_API_VERSION=12
```

The X reporting connector also accepts the common `X_*` / `TWITTER_*`
equivalents for the API key, API secret, access token, and access token secret.
The account id may be provided as `X_ACCOUNT_ID` or `TWITTER_ADS_ACCOUNT_ID`,
but the canonical `X_ADS_*` names are preferred for Railway.

For local testing without X Ads API analytics credentials, `/ads` can import the
existing X bulk export:

```text
X_ADS_BULK_EXPORT_PATH=/Users/mint/Documents/ads/endpointarena-2026_06_04-2026_07_04-replace-descinyc-posts.xlsx
```

This local fallback uses campaign/ad-group budget as a spend proxy and allocates
it across tracked DeSciNYC UTM creatives. It is useful for local review, but API
sync remains the source for actual delivered spend.

Creative performance is keyed from platform creative metadata when available.
When the local X export is used, the dashboard derives the style/image label
from `utm_content` because the export includes promoted tweet IDs but not tweet
copy or media. Use distinct `utm_content` values for each headline/image combo
to make click and registration comparisons clean.

## Sync

Open `/ads` as an admin and click **Sync now**. The sync route stores one
`ad_sync_runs` row per platform and then upserts daily metrics into
`ad_daily_metrics`.

Meta sync uses ad-level Insights with a `publisher_platform` breakdown, so
Facebook and Instagram spend can be separated. X sync uses line-item stats; X
billing metrics for the latest three days are marked provisional.

The dashboard includes a Creative lab section for headline/image/style combos,
including best CPA, most-clicked, and click-to-registration rankings. For
DeSciNYC events, registrations from Luma are the conversion outcome. If Luma
sends a paid ticket value, the dashboard also shows revenue and ROAS by
platform, campaign, and creative style combo.

For manual or scheduled server-side syncs, run:

```bash
npm run ads:sync
```

Useful environment overrides:

```text
ADS_SYNC_BASE_URL=https://desci.nyc
ADS_SYNC_PLATFORM=all
ADS_REPORTING_START_DATE=2026-07-08
ADS_SYNC_START_DATE=2026-07-08
ADS_SYNC_END_DATE=2026-07-08
ADS_EXCLUDED_PLATFORM_CAMPAIGN_IDS=old-campaign-id-1,old-campaign-id-2
ADS_EXCLUDED_PLATFORM_AD_GROUP_IDS=old-ad-group-id-1,old-ad-group-id-2
ADS_EXCLUDED_PLATFORM_AD_IDS=old-ad-id-1,old-ad-id-2
```

The script signs in through the existing admin login using `ADMIN_PASSWORD`,
then calls `/api/ads/sync`. It is safe for Railway cron/Functions because it
exits after the sync response.

`ADS_REPORTING_START_DATE` clamps dashboard reads and sync requests so older
test data cannot re-enter date ranges. The excluded ID lists are useful after a
campaign reset: matching platform campaign, ad-group, or ad IDs are skipped
before metrics are persisted.

Production scheduled syncs are handled by
`.github/workflows/ads-sync.yml`, which runs every 6 hours and calls the
protected `/api/ads/sync` route. The workflow needs the GitHub secret
`DESCINYC_ADMIN_PASSWORD`.

There is also a single-file Railway Function source at `functions/ads-sync.ts`
if the schedule is later moved from GitHub Actions to Railway Functions. It
should be deployed as a cron function and given `ADMIN_PASSWORD` plus
`ADS_SYNC_BASE_URL=https://desci.nyc`.

If existing Luma conversions were recorded before a click id was available, run
the conservative backfill:

```bash
npm run ads:backfill-conversions
```

It only attaches an unmatched conversion to a click when exactly one paid-social
click matches the same event, source, campaign/content, and time window.

## Mapping

The dashboard automatically uses UTM values when a platform row exposes a
destination URL or when an event can be inferred from names. If spend appears as
unmapped, use **Resolve mappings** to attach platform campaign/ad-group/ad IDs
to the event and UTM values used in the DeSciNYC redirect URLs.

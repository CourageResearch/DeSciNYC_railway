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
DeSciNYC events, registrations from Luma are the conversion outcome.

## Mapping

The dashboard automatically uses UTM values when a platform row exposes a
destination URL or when an event can be inferred from names. If spend appears as
unmapped, use **Resolve mappings** to attach platform campaign/ad-group/ad IDs
to the event and UTM values used in the DeSciNYC redirect URLs.

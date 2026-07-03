# X Ads Attribution for DeSciNYC Events

## Ad URLs

Use these as X ad destinations:

```text
https://desci.nyc/descinyc46?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=poster_jack_klein
```

```text
https://desci.nyc/descinyc49?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc49_peptides&utm_content=peptides_101
```

X should append `twclid` automatically when click tracking is enabled. The landing page stores the click, generates an internal `utm_id`, and passes that into Luma checkout with the rest of the UTM parameters.

Supported event attribution configs live in `lib/attribution.ts`. Add future events there with the DeSciNYC slug, Luma URL, Luma event ID, landing-page copy, and default UTMs.

## Required Setup

1. Run the database migration so `attribution_clicks` and `attribution_conversions` exist.
2. Set `NEXT_PUBLIC_URL=https://desci.nyc`.
3. Set `LUMA_WEBHOOK_SECRET` to the native Luma webhook secret, which starts with `whsec_`.
4. In Luma, open the DeSciNYC calendar, then go to `Settings -> Developer -> Webhooks -> Create`.
5. Subscribe the webhook to Luma's `Ticket Registered` action type and point it at:

```text
https://desci.nyc/api/attribution/luma-ticket
```

Luma sends `Webhook-Signature`, `Webhook-Id`, and `Webhook-Timestamp` headers with each request. The endpoint verifies the HMAC signature before processing the ticket registration.

## X Conversion API Variables

Set these after the X Event Source / Pixel and conversion event exist in X Events Manager:

```text
X_ADS_API_KEY=
X_ADS_API_SECRET=
X_ADS_ACCESS_TOKEN=
X_ADS_ACCESS_TOKEN_SECRET=
X_ADS_PIXEL_ID=
X_ADS_EVENT_ID=
X_ADS_API_VERSION=12
X_ADS_DRY_RUN=false
```

Until those are configured, conversions are still stored in `attribution_conversions` with `x_skipped_reason` showing the missing config. Set `X_ADS_DRY_RUN=true` to verify payload construction without sending events to X.

## Verification

- Open the ad URL with a fake `twclid`, then confirm `POST /api/attribution/click` writes an `attribution_clicks` row.
- Send a Luma webhook test payload to `/api/attribution/luma-ticket` and confirm `attribution_conversions` gets a row.
- Confirm the row has the expected `event_slug`, such as `descinyc46` or `descinyc49`.
- With X credentials configured, confirm the endpoint response returns `x.sent=true`.
- Check X Events Manager for the conversion event, and check Luma Insights for `utm_source=twitter_ads`.

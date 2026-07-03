# Paid Social Attribution for DeSciNYC Events

## Ad URLs

Use these as X ad destinations:

```text
https://desci.nyc/descinyc46?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=poster_jack_klein
```

```text
https://desci.nyc/descinyc49?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc49_peptides&utm_content=peptides_101
```

X should append `twclid` automatically when click tracking is enabled. These DeSciNYC URLs are tracking redirects: they store the click, generate an internal `utm_id` when needed, then immediately send the visitor to Luma with the rest of the UTM parameters.

Use these as Instagram / Meta ad destinations:

```text
https://desci.nyc/descinyc46?utm_source=instagram_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=poster_jack_klein
```

```text
https://desci.nyc/descinyc49?utm_source=instagram_ads&utm_medium=paid_social&utm_campaign=descinyc49_peptides&utm_content=peptides_101
```

Meta may append `fbclid` on ad clicks. The DeSciNYC redirect preserves it, stores it, forwards it to Luma, and uses it as a fallback match key for Luma ticket webhooks.

To inspect the DeSciNYC event creative without redirecting to Luma, append `preview=1`:

```text
https://desci.nyc/descinyc46?preview=1&utm_source=instagram_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=poster_jack_klein
```

Supported event attribution configs live in `lib/attribution.ts`. Add future events there with the DeSciNYC slug, Luma URL, Luma event ID, preview-page copy, and default UTMs.

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

Luma may only include `utm_source` / `custom_source` in webhook payloads even when the registration URL includes the full `utm_campaign`, `utm_content`, and `utm_id`. The webhook handler treats known paid-social sources such as `twitter_ads` as ad conversions for admin notifications, even when the exact click row cannot be matched back to the Luma ticket.

## Luma Meta Pixel Setup

For Instagram ad optimization and Meta Ads Manager reporting, open the DeSciNYC calendar in Luma and go to `Settings -> Options -> Tracking -> Meta Pixel -> Configure`.

Paste the Pixel ID from Meta Events Manager and save. Luma sends:

- `PageView`
- `CompleteRegistration` for free events
- `Purchase` for paid events

The DeSciNYC redirect URLs should still be used as the ad destinations so the local click/conversion database and notification emails retain the same UTM trail.

## X Conversion API Variables

Set these after the X Event Source / Pixel and conversion event exist in X Events Manager:

```text
X_ADS_PIXEL_TOKEN=
X_ADS_PIXEL_ID=r65z0
X_ADS_EVENT_ID=
X_ADS_API_VERSION=12
X_ADS_DRY_RUN=false
```

`X_ADS_PIXEL_TOKEN` comes from X Events Manager -> Install Pixel -> Manual -> Web Pixel + Conversion API -> Generate access token. The backend sends conversions to `https://ads-api.x.com/12/measurement/conversions/{X_ADS_PIXEL_ID}` with that value in the `X-Pixel-Token` header.

Until those are configured, conversions are still stored in `attribution_conversions` with `x_skipped_reason` showing the missing config. Set `X_ADS_DRY_RUN=true` to verify payload construction without sending events to X.

## Verification

- Open the ad URL with a fake `twclid` or `fbclid`, confirm it redirects to Luma, then confirm `attribution_clicks` gets a row.
- Send a Luma webhook test payload to `/api/attribution/luma-ticket` and confirm `attribution_conversions` gets a row.
- Confirm the row has the expected `event_slug`, such as `descinyc46` or `descinyc49`.
- With X credentials configured, confirm the endpoint response returns `x.sent=true`.
- Check X Events Manager or Meta Events Manager for the conversion event, and check Luma Insights for the expected `utm_source`.

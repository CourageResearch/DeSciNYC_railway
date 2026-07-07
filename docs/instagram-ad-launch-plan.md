# Instagram Ad Launch Plan

## Current State

- Event: `DeSciNYC: What Are We Breathing on the NYC Subway?`
- Luma event: `https://luma.com/descinyc46`
- Tracking redirect: `https://desci.nyc/descinyc46`
- Meta Pixel in Luma: open `Settings -> Options -> Tracking -> Meta Pixel -> Configure` and paste the Pixel ID from Meta Events Manager.
- Do not use direct Luma links as ad destinations if you want DeSciNYC click records, `utm_id` matching, and email notifications.

## Air Quality Event URLs

Primary poster variant:

```text
https://desci.nyc/descinyc46?utm_source=instagram_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=poster_jack_klein
```

Question hook variant:

```text
https://desci.nyc/descinyc46?utm_source=instagram_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=subway_air_question
```

Infrastructure/data variant:

```text
https://desci.nyc/descinyc46?utm_source=instagram_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=mta_sensor_data
```

## Copy Variants

### Variant A: Direct Curiosity

```text
What are we breathing on the NYC subway?

Join DeSciNYC Tue Jul 7 for a science-first look at subway air quality, MTA infrastructure, sensors, heat, and public health.

Tickets:
https://desci.nyc/descinyc46?utm_source=instagram_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=subway_air_question
```

### Variant B: MTA / Infrastructure

```text
NYC subway air is infrastructure you can inhale.

On Tue Jul 7, Jack Klein joins DeSciNYC to unpack subway air quality, sensors, ventilation, heat, and what better measurement could reveal.

https://desci.nyc/descinyc46?utm_source=instagram_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=mta_sensor_data
```

### Variant C: Builder / Science Audience

```text
For NYC builders, scientists, transit people, and data people:

What can subway air quality teach us about measurement, public health, and city infrastructure?

DeSciNYC, Tue Jul 7.

https://desci.nyc/descinyc46?utm_source=instagram_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=builder_science_angle
```

## Meta Ads Setup

- Objective before purchase volume is stable: traffic or sales optimized toward the Luma `Purchase` event if Meta Pixel is active.
- Placement: Instagram feed, stories, and reels.
- Location: NYC area.
- Age: 18-34 baseline, matching the X campaign unless Meta audience estimates are too narrow.
- Budget: start with the same baseline as X, `$10/day`, unless you intentionally want to scale.
- Destination URL: use the DeSciNYC redirect URLs above, not direct Luma.
- URL parameters: keep `utm_source=instagram_ads`, `utm_medium=paid_social`, `utm_campaign=descinyc46_air_quality`, and unique `utm_content` values.

## Verification

- Luma Options shows a saved Meta Pixel ID.
- Opening the Instagram ad URL redirects to Luma with `utm_source=instagram_ads`, `utm_campaign`, `utm_content`, and a generated `utm_id`.
- `attribution_clicks` stores the click, including `fbclid` if Meta appends one.
- A Luma ticket webhook stores a row in `attribution_conversions` with `utm_source=instagram_ads`.
- Luma Insights shows registrations under `utm_source=instagram_ads`.
- Meta Events Manager shows Luma `Purchase` events after a paid registration.

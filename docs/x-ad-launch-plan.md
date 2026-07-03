# X Ad Launch Plan

## Current State

- Existing active campaign: `DeSciNYC Subway Tickets - Jul 7`
- Active ad group: `NYC 18-34 transit science`
- Objective: website traffic / link clicks
- Budget: `$10/day`, `$50 total`
- Audience: NYC area, ages 18-34, all genders
- Current issue: the active promoted post appears to use the Luma card/direct Luma destination, so it will not reliably capture `twclid` in the DeSciNYC attribution bridge.

Use new promoted posts or replacement ads that point at the `desci.nyc` redirect URLs below.

## Air Quality Event URLs

Primary poster variant:

```text
https://desci.nyc/descinyc46?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=poster_jack_klein
```

Question hook variant:

```text
https://desci.nyc/descinyc46?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=subway_air_question
```

Infrastructure/data variant:

```text
https://desci.nyc/descinyc46?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=mta_sensor_data
```

## Air Quality Copy Variants

### Variant A: Direct Curiosity

```text
What are we breathing on the NYC subway?

Join DeSciNYC Tue Jul 7 for a science-first look at subway air quality, MTA infrastructure, sensors, heat, and public health.

Tickets:
https://desci.nyc/descinyc46?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=subway_air_question
```

### Variant B: MTA / Infrastructure

```text
NYC subway air is infrastructure you can inhale.

On Tue Jul 7, Jack Klein joins DeSciNYC to unpack subway air quality, sensors, ventilation, heat, and what better measurement could reveal.

https://desci.nyc/descinyc46?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=mta_sensor_data
```

### Variant C: Builder / Science Audience

```text
For NYC builders, scientists, transit nerds, and data people:

What can subway air quality teach us about measurement, public health, and city infrastructure?

DeSciNYC, Tue Jul 7.

https://desci.nyc/descinyc46?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc46_air_quality&utm_content=builder_science_angle
```

## Peptides Event URL

```text
https://desci.nyc/descinyc49?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc49_peptides&utm_content=peptides_101
```

## Peptides Copy Variants

### Variant A: Beginner Friendly

```text
Peptides are everywhere in biohacking, longevity, and biotech conversations.

Join DeSciNYC for Peptides 101: what they are, why people care, and how to think about the science.

https://desci.nyc/descinyc49?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc49_peptides&utm_content=peptides_101
```

### Variant B: Evidence Angle

```text
Peptides 101 at DeSciNYC.

A grounded intro to mechanisms, claims, evidence, risks, and where peptide science overlaps with health, longevity, and biotech.

https://desci.nyc/descinyc49?utm_source=twitter_ads&utm_medium=paid_social&utm_campaign=descinyc49_peptides&utm_content=evidence_angle
```

## Targeting

Use the existing audience baseline:

- Location: NYC area
- Age: 18-34
- Gender: all
- Objective until purchase events are stable: website traffic / link clicks
- Budget: `$10/day`

Air quality interests / keywords:

- NYC subway
- MTA
- public transit
- subway
- air quality
- indoor air quality
- PM2.5
- ventilation
- sensors
- environmental monitoring
- public health
- urban planning
- infrastructure
- climate tech
- citizen science
- data science
- open science
- DeSci
- New York tech
- transportation

Peptides interests / keywords:

- peptides
- biotech
- longevity
- biohacking
- healthspan
- drug discovery
- clinical research
- synthetic biology
- biology
- medicine
- nutrition science
- fitness science
- health tech
- DeSci
- New York tech
- startups

## Launch Checklist

- Use `desci.nyc` redirect URL, not direct Luma.
- Keep `utm_source=twitter_ads` on every URL.
- Give each variant a unique `utm_content`.
- Keep the current campaign at link-click optimization until X shows several real purchase events.
- After a real registration from a tracked URL, confirm:
  - `attribution_conversions.x_status = 200`
  - X Events Manager shows recent Purchase/CAPI activity
  - Luma Event Insights shows `utm_source=twitter_ads`

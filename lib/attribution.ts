export const ATTRIBUTION_COOKIE_NAME = "descinyc_click_id";
export const ATTRIBUTION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AttributionEventConfig = {
  slug: string;
  title: string;
  speaker?: string | null;
  startsAt: string;
  lumaUrl: string;
  lumaEventId: string;
  description: string;
  focus: string;
  posterImage: string;
  imageAlt: string;
  audienceCards: Array<{
    title: string;
    body: string;
  }>;
  defaultUtm: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_content: string;
  };
};

export const ATTRIBUTION_EVENTS = {
  descinyc46: {
    slug: "descinyc46",
    title: "What Are We Breathing in the NYC Subway?",
    speaker: "Jack Klein",
    startsAt: "2026-07-07T19:30:00-04:00",
    lumaUrl: "https://luma.com/descinyc46",
    lumaEventId: "evt-Z5LdUYqkwziNMNV",
    description:
      "Jack Klein of NewYorkLab is unpacking subway air quality: what is in the air, where it comes from, how MTA systems shape exposure, and what better measurement could reveal.",
    focus: "Subway air quality",
    posterImage: "/images/ads/descinyc46-air-quality.png",
    imageAlt:
      "DeSciNYC event poster for What Are We Breathing in the NYC Subway?",
    audienceCards: [
      {
        title: "For riders",
        body: "What daily subway exposure means and what measurements matter.",
      },
      {
        title: "For builders",
        body: "How sensors, data, ventilation, and public infrastructure intersect.",
      },
      {
        title: "For scientists",
        body: "Where open measurement can make urban health questions sharper.",
      },
    ],
    defaultUtm: {
      utm_source: "twitter_ads",
      utm_medium: "paid_social",
      utm_campaign: "descinyc46_air_quality",
      utm_content: "poster_jack_klein",
    },
  },
  descinyc49: {
    slug: "descinyc49",
    title: "Peptides 101",
    speaker: null,
    startsAt: "2026-07-14T19:30:00-04:00",
    lumaUrl: "https://luma.com/descinyc49",
    lumaEventId: "evt-NyxpH2NdNO4DotF",
    description:
      "A practical DeSciNYC introduction to peptides: what they are, why people are paying attention, and where science, health, and experimentation meet.",
    focus: "Peptides",
    posterImage: "/images/eventimage.png",
    imageAlt: "DeSciNYC event image",
    audienceCards: [
      {
        title: "For beginners",
        body: "A clear entry point into peptide science without needing a specialist background.",
      },
      {
        title: "For biohackers",
        body: "A grounded conversation about claims, mechanisms, risks, and evidence.",
      },
      {
        title: "For builders",
        body: "Where peptides overlap with longevity, biotech, diagnostics, and health communities.",
      },
    ],
    defaultUtm: {
      utm_source: "twitter_ads",
      utm_medium: "paid_social",
      utm_campaign: "descinyc49_peptides",
      utm_content: "peptides_101",
    },
  },
} satisfies Record<string, AttributionEventConfig>;

export const DEFAULT_ATTRIBUTION_EVENT_SLUG = "descinyc46";

export type TrackingParams = {
  twclid?: string | null;
  fbclid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  utm_id?: string | null;
};

export const TRACKING_PARAM_KEYS = [
  "twclid",
  "fbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
] as const;

export function attributionCookieName(eventSlug: string) {
  return `${ATTRIBUTION_COOKIE_NAME}_${eventSlug.replace(/[^a-z0-9_-]/gi, "_")}`;
}

export function getAttributionEvent(slug: string | null | undefined) {
  if (!slug) {
    return null;
  }

  return ATTRIBUTION_EVENTS[slug as keyof typeof ATTRIBUTION_EVENTS] || null;
}

export function getDefaultAttributionEvent() {
  return ATTRIBUTION_EVENTS[DEFAULT_ATTRIBUTION_EVENT_SLUG];
}

export function findAttributionEventByLumaId(
  lumaEventId: string | null | undefined
) {
  if (!lumaEventId) {
    return null;
  }

  return (
    Object.values(ATTRIBUTION_EVENTS).find(
      (event) => event.lumaEventId === lumaEventId
    ) || null
  );
}

export function findAttributionEventByUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return (
    Object.values(ATTRIBUTION_EVENTS).find((event) => {
      return value.includes(`/${event.slug}`) || value.includes(event.lumaUrl);
    }) || null
  );
}

export function findAttributionEventByTracking(params: TrackingParams) {
  const campaign = params.utm_campaign || "";
  const content = params.utm_content || "";

  return (
    Object.values(ATTRIBUTION_EVENTS).find((event) => {
      return campaign.includes(event.slug) || content.includes(event.slug);
    }) || null
  );
}

export function resolveAttributionEvent(input: {
  slug?: string | null;
  lumaEventId?: string | null;
  url?: string | null;
  tracking?: TrackingParams;
}) {
  return (
    getAttributionEvent(input.slug) ||
    findAttributionEventByLumaId(input.lumaEventId) ||
    findAttributionEventByUrl(input.url) ||
    (input.tracking ? findAttributionEventByTracking(input.tracking) : null) ||
    getDefaultAttributionEvent()
  );
}

export function cleanTrackingValue(value: unknown) {
  if (Array.isArray(value)) {
    return cleanTrackingValue(value[0]);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

export function extractTrackingParams(
  searchParams: URLSearchParams | Record<string, unknown>
): TrackingParams {
  const getValue = (key: string) => {
    if (searchParams instanceof URLSearchParams) {
      return cleanTrackingValue(searchParams.get(key));
    }

    return cleanTrackingValue(searchParams[key]);
  };

  return TRACKING_PARAM_KEYS.reduce<TrackingParams>((params, key) => {
    params[key] = getValue(key);
    return params;
  }, {});
}

export function withTrackingDefaults(
  params: TrackingParams,
  event: AttributionEventConfig = getDefaultAttributionEvent()
): TrackingParams {
  return {
    ...event.defaultUtm,
    ...params,
    utm_source: params.utm_source || event.defaultUtm.utm_source,
    utm_medium: params.utm_medium || event.defaultUtm.utm_medium,
    utm_campaign: params.utm_campaign || event.defaultUtm.utm_campaign,
    utm_content: params.utm_content || event.defaultUtm.utm_content,
  };
}

export function buildLumaUrl(
  clickId: string | null | undefined,
  params: TrackingParams,
  event: AttributionEventConfig = getDefaultAttributionEvent()
) {
  const url = new URL(event.lumaUrl);
  const merged = withTrackingDefaults(
    {
      ...params,
      utm_id: params.utm_id || clickId || null,
    },
    event
  );

  for (const key of TRACKING_PARAM_KEYS) {
    const value = merged[key];
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export function buildLandingUrl(
  params: TrackingParams = {},
  event: AttributionEventConfig = getDefaultAttributionEvent()
) {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://desci.nyc";
  const url = new URL(`/${event.slug}`, baseUrl);
  const merged = withTrackingDefaults(params, event);

  for (const key of TRACKING_PARAM_KEYS) {
    const value = merged[key];
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
  );
}

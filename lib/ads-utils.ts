import crypto from "crypto";
import {
  ATTRIBUTION_EVENTS,
  findAttributionEventByTracking,
  type TrackingParams,
} from "@/lib/attribution";
import type { AdMetricInput, AdPlatform } from "@/lib/ads-types";

export const PAID_SOCIAL_SOURCES = [
  "twitter_ads",
  "x_ads",
  "instagram_ads",
  "facebook_ads",
  "meta_ads",
];

export const PLATFORM_LABELS: Record<AdPlatform, string> = {
  meta: "Meta",
  x: "X",
};

export function nullIfBlank(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function toInt(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
  }

  return fallback;
}

export function toFloat(value: unknown, fallback: number | null = null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

export function currencyToMicros(value: unknown) {
  const parsed = toFloat(value, 0) || 0;
  return Math.round(parsed * 1_000_000);
}

export function microsToCurrency(value: number | null | undefined) {
  if (!value) {
    return 0;
  }

  return value / 1_000_000;
}

export function percentToRatio(value: unknown) {
  const parsed = toFloat(value);
  return parsed === null ? null : parsed / 100;
}

export function ratioFrom(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

export function microsPer(numeratorMicros: number, denominator: number) {
  return denominator > 0 ? Math.round(numeratorMicros / denominator) : null;
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function defaultAdsDateRange() {
  const endDate = todayIsoDate();
  const reportingStartDate = normalizeDate(
    process.env.ADS_REPORTING_START_DATE,
    addDays(endDate, -30)
  );

  return {
    startDate: reportingStartDate > endDate ? endDate : reportingStartDate,
    endDate,
  };
}

export function clampAdsDateRange(input: {
  startDate: string;
  endDate: string;
}) {
  const defaults = defaultAdsDateRange();
  let startDate = input.startDate;
  let endDate = input.endDate;

  if (startDate < defaults.startDate) {
    startDate = defaults.startDate;
  }

  if (endDate < startDate) {
    endDate = startDate;
  }

  return { startDate, endDate };
}

export function normalizeDate(value: unknown, fallback: string) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : value;
}

export function normalizePlatform(value: unknown): AdPlatform | "all" {
  return value === "meta" || value === "x" ? value : "all";
}

export function metricIdentity(input: Omit<AdMetricInput, "metricId">) {
  const source = [
    input.platform,
    input.metricDate,
    input.accountId || "",
    input.platformCampaignId || "",
    input.platformAdGroupId || "",
    input.platformAdId || "",
    input.placement || "",
    input.utmSource || "",
    input.utmCampaign || "",
    input.utmContent || "",
    input.creativeHeadline || "",
    input.creativeImageLabel || "",
    input.creativeTheme || "",
  ].join("|");

  return crypto.createHash("sha256").update(source).digest("base64url");
}

function titleFromSnake(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function inferCreativeTheme(value: string) {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("subway") ||
    normalized.includes("transit") ||
    normalized.includes("commute") ||
    normalized.includes("mta") ||
    normalized.includes("air_quality") ||
    normalized.includes("air quality")
  ) {
    return "Subway air quality";
  }

  if (
    normalized.includes("peptide") ||
    normalized.includes("molecule") ||
    normalized.includes("chain")
  ) {
    return "Peptides primer";
  }

  if (normalized.includes("hype") || normalized.includes("real_vs")) {
    return "Evidence vs hype";
  }

  if (normalized.includes("calendar") || normalized.includes("date")) {
    return "Event logistics";
  }

  if (normalized.includes("question")) {
    return "Question hook";
  }

  if (normalized.includes("lab") || normalized.includes("rooftop")) {
    return "Lab/community";
  }

  if (normalized.includes("poster")) {
    return "Speaker poster";
  }

  return null;
}

function inferCreativeFormat(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("video")) {
    return "Video";
  }

  if (normalized.includes("carousel")) {
    return "Carousel";
  }

  if (normalized.includes("poster")) {
    return "Poster";
  }

  if (normalized.includes("card") || normalized.includes("calendar")) {
    return "Static card";
  }

  return "Static creative";
}

export function inferCreativeProfile(input: {
  headline?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  imageLabel?: string | null;
  format?: string | null;
  theme?: string | null;
  destinationUrl?: string | null;
  eventSlug?: string | null;
  utmContent?: string | null;
  campaignName?: string | null;
  adGroupName?: string | null;
  adName?: string | null;
}) {
  const content = nullIfBlank(input.utmContent);
  const knownByContent: Record<
    string,
    {
      headline: string;
      imageUrl: string;
      imageLabel: string;
      format: string;
      theme: string;
    }
  > = {
    poster_jack_klein: {
      headline: "What Are We Breathing in the NYC Subway?",
      imageUrl: "/images/ads/descinyc46-air-quality.png",
      imageLabel: "Subway air quality poster",
      format: "Poster",
      theme: "Subway air quality",
    },
    commute_atmosphere: {
      headline: "Commute Atmosphere",
      imageUrl: "/images/ads/descinyc46-air-quality.png",
      imageLabel: "Subway air quality poster",
      format: "Static creative",
      theme: "Subway air quality",
    },
    peptides_101: {
      headline: "Peptides 101",
      imageUrl: "/images/eventimage.png",
      imageLabel: "Peptides 101 event card",
      format: "Static card",
      theme: "Peptides primer",
    },
    luma_no_sales_pitch: {
      headline: "Luma No Sales Pitch",
      imageUrl: "/images/ads/descinyc49-luma-social-card.jpg",
      imageLabel: "Peptides 101 Luma social card",
      format: "Static creative",
      theme: "Peptides primer",
    },
    real_vs_hype: {
      headline: "Real vs Hype",
      imageUrl: "/images/ads/descinyc49-real-vs-hype.png",
      imageLabel: "Peptides 101 real vs hype creative",
      format: "AI-generated static creative",
      theme: "Peptides evidence check",
    },
    julius_ritter_1am: {
      headline: "Julius Ritter 1am",
      imageUrl: "/images/ads/descinyc49-julius-ritter.jpg",
      imageLabel: "Julius Ritter poster",
      format: "Poster",
      theme: "Peptides primer",
    },
    storefront_hype: {
      headline: "Storefront Hype",
      imageUrl: "/images/ads/descinyc49-storefront-hype.jpg",
      imageLabel: "Storefront peptide poster",
      format: "Photo",
      theme: "Peptides hype check",
    },
  };
  const known = content ? knownByContent[content] : null;
  const fallbackText = [
    content,
    input.adName,
    input.adGroupName,
    input.campaignName,
    input.eventSlug,
  ]
    .filter(Boolean)
    .join(" ");
  const readableContent = content ? titleFromSnake(content) : null;
  const inferredTheme = inferCreativeTheme(fallbackText);

  return {
    creativeHeadline:
      nullIfBlank(input.headline) || known?.headline || readableContent || null,
    creativeBody: nullIfBlank(input.body),
    creativeImageUrl: nullIfBlank(input.imageUrl) || known?.imageUrl || null,
    creativeImageLabel:
      nullIfBlank(input.imageLabel) ||
      known?.imageLabel ||
      readableContent ||
      null,
    creativeFormat:
      nullIfBlank(input.format) ||
      known?.format ||
      (fallbackText ? inferCreativeFormat(fallbackText) : null),
    creativeTheme:
      nullIfBlank(input.theme) || known?.theme || inferredTheme || readableContent,
    destinationUrl: nullIfBlank(input.destinationUrl),
  };
}

export function inferEventSlugFromText(...values: Array<string | null | undefined>) {
  const combined = values.filter(Boolean).join(" ").toLowerCase();
  const explicit = combined.match(/descinyc\d+/)?.[0];

  if (explicit && explicit in ATTRIBUTION_EVENTS) {
    return explicit;
  }

  return (
    Object.values(ATTRIBUTION_EVENTS).find((event) => {
      return (
        combined.includes(event.title.toLowerCase()) ||
        combined.includes(event.focus.toLowerCase()) ||
        (event.speaker ? combined.includes(event.speaker.toLowerCase()) : false)
      );
    })?.slug || null
  );
}

export function platformSource(platform: AdPlatform, placement?: string | null) {
  if (platform === "x") {
    return "twitter_ads";
  }

  const normalized = (placement || "").toLowerCase();
  if (normalized.includes("instagram")) {
    return "instagram_ads";
  }

  if (normalized.includes("facebook")) {
    return "facebook_ads";
  }

  return "meta_ads";
}

export function trackingFromDestinationUrl(url: string | null | undefined) {
  if (!url) {
    return {};
  }

  try {
    const parsed = new URL(url);
    return {
      utm_source: nullIfBlank(parsed.searchParams.get("utm_source")),
      utm_campaign: nullIfBlank(parsed.searchParams.get("utm_campaign")),
      utm_content: nullIfBlank(parsed.searchParams.get("utm_content")),
      utm_term: nullIfBlank(parsed.searchParams.get("utm_term")),
    } satisfies TrackingParams;
  } catch {
    return {};
  }
}

export function inferTracking(input: {
  platform: AdPlatform;
  placement?: string | null;
  destinationUrl?: string | null;
  campaignName?: string | null;
  adGroupName?: string | null;
  adName?: string | null;
}) {
  const urlTracking = trackingFromDestinationUrl(input.destinationUrl);
  const eventSlug =
    inferEventSlugFromText(
      input.destinationUrl,
      input.campaignName,
      input.adGroupName,
      input.adName
    ) ||
    findAttributionEventByTracking(urlTracking)?.slug ||
    null;

  return {
    eventSlug,
    utmSource:
      nullIfBlank(urlTracking.utm_source) ||
      (eventSlug ? platformSource(input.platform, input.placement) : null),
    utmCampaign: nullIfBlank(urlTracking.utm_campaign),
    utmContent: nullIfBlank(urlTracking.utm_content),
  };
}

export function sourceToPlatform(source: string | null | undefined) {
  const normalized = (source || "").toLowerCase();
  if (
    normalized === "instagram_ads" ||
    normalized === "facebook_ads" ||
    normalized === "meta_ads"
  ) {
    return "meta";
  }

  if (normalized === "twitter_ads" || normalized === "x_ads") {
    return "x";
  }

  return null;
}

export function trackingKey(input: {
  eventSlug?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
}) {
  return [
    input.eventSlug || "",
    input.utmSource || "",
    input.utmCampaign || "",
    input.utmContent || "",
  ].join("|");
}

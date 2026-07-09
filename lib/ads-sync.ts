import "server-only";

import crypto from "crypto";
import fs from "fs";
import OAuth from "oauth-1.0a";
import type {
  AdMetricInput,
  AdPlatform,
  AdsDateRange,
  SyncPlatformResult,
} from "@/lib/ads-types";
import { ATTRIBUTION_EVENTS } from "@/lib/attribution";
import {
  finishAdSyncRun,
  getConnectorConfigStatus,
  startAdSyncRun,
  deleteAdMetricsForPlatformRange,
  upsertAdMetrics,
} from "@/lib/ads-db";
import {
  addDays,
  currencyToMicros,
  inferCreativeProfile,
  inferTracking,
  metricIdentity,
  percentToRatio,
  toFloat,
  toInt,
  todayIsoDate,
} from "@/lib/ads-utils";
import { query } from "@/lib/db";
import { getXAdsConfig } from "@/lib/x-ads-config";

type JsonObject = Record<string, unknown>;
type TrackingResolution = {
  eventSlug: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
};
type XAttributionGroup = { utmContent: string | null; trackedClicks: number };

const META_DEFAULT_API_VERSION = "v23.0";
const DEFAULT_X_BULK_EXPORT_PATH =
  "/Users/mint/Documents/ads/endpointarena-2026_06_04-2026_07_04-replace-descinyc-posts.xlsx";

type AdEntityIds = {
  campaignId?: unknown;
  adGroupId?: unknown;
  adId?: unknown;
};

function parseExcludedIds(name: string) {
  return new Set(
    (process.env[name] || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function getExcludedAdEntityIds() {
  return {
    campaignIds: parseExcludedIds("ADS_EXCLUDED_PLATFORM_CAMPAIGN_IDS"),
    adGroupIds: parseExcludedIds("ADS_EXCLUDED_PLATFORM_AD_GROUP_IDS"),
    adIds: parseExcludedIds("ADS_EXCLUDED_PLATFORM_AD_IDS"),
  };
}

function entityId(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function isExcludedAdEntity(input: AdEntityIds) {
  const exclusions = getExcludedAdEntityIds();
  const campaignId = entityId(input.campaignId);
  const adGroupId = entityId(input.adGroupId);
  const adId = entityId(input.adId);

  return (
    (campaignId && exclusions.campaignIds.has(campaignId)) ||
    (adGroupId && exclusions.adGroupIds.has(adGroupId)) ||
    (adId && exclusions.adIds.has(adId))
  );
}

function parseJsonResponse(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = parseJsonResponse(text);

  if (!response.ok) {
    const detail =
      typeof body === "string"
        ? body
        : JSON.stringify(body || { status: response.status });
    throw new Error(`HTTP ${response.status}: ${detail}`);
  }

  return body;
}

function getMetaAccountPath() {
  const raw = process.env.META_AD_ACCOUNT_ID || "";
  if (!raw) {
    return "";
  }

  return raw.startsWith("act_") ? raw : `act_${raw}`;
}

type MetaInsightRow = {
  account_id?: string;
  account_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  objective?: string;
  publisher_platform?: string;
};

type MetaCreativeDetails = {
  headline: string | null;
  body: string | null;
  imageUrl: string | null;
  imageLabel: string | null;
  format: string | null;
  destinationUrl: string | null;
  raw: unknown;
};

function jsonString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function jsonRecord(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function nestedString(source: unknown, path: string[]) {
  let current: unknown = source;

  for (const key of path) {
    const record = jsonRecord(current);
    if (!record) {
      return null;
    }

    current = record[key];
  }

  return jsonString(current);
}

function firstAssetText(source: unknown, key: string) {
  const record = jsonRecord(source);
  const values = record?.[key];

  if (!Array.isArray(values)) {
    return null;
  }

  for (const value of values) {
    const text = nestedString(value, ["text"]) || jsonString(value);
    if (text) {
      return text;
    }
  }

  return null;
}

function firstAssetUrl(source: unknown, key: string) {
  const record = jsonRecord(source);
  const values = record?.[key];

  if (!Array.isArray(values)) {
    return null;
  }

  for (const value of values) {
    const url =
      nestedString(value, ["url"]) ||
      nestedString(value, ["website_url"]) ||
      nestedString(value, ["link"]);
    if (url) {
      return url;
    }
  }

  return null;
}

function metaCreativeDetails(raw: unknown): MetaCreativeDetails | null {
  const creative = jsonRecord(raw);
  if (!creative) {
    return null;
  }

  const objectStorySpec = jsonRecord(creative.object_story_spec);
  const assetFeedSpec = jsonRecord(creative.asset_feed_spec);
  const headline =
    jsonString(creative.title) ||
    nestedString(objectStorySpec, ["link_data", "name"]) ||
    nestedString(objectStorySpec, ["video_data", "title"]) ||
    firstAssetText(assetFeedSpec, "titles");
  const body =
    jsonString(creative.body) ||
    nestedString(objectStorySpec, ["link_data", "message"]) ||
    nestedString(objectStorySpec, ["video_data", "message"]) ||
    firstAssetText(assetFeedSpec, "bodies");
  const imageUrl =
    jsonString(creative.image_url) ||
    jsonString(creative.thumbnail_url) ||
    nestedString(objectStorySpec, ["link_data", "picture"]) ||
    firstAssetUrl(assetFeedSpec, "images");
  const destinationUrl =
    nestedString(objectStorySpec, ["link_data", "link"]) ||
    nestedString(objectStorySpec, [
      "video_data",
      "call_to_action",
      "value",
      "link",
    ]) ||
    firstAssetUrl(assetFeedSpec, "link_urls");
  const objectType = jsonString(creative.object_type);

  return {
    headline,
    body,
    imageUrl,
    imageLabel: jsonString(creative.name) || headline,
    format: objectType
      ? objectType.replace(/_/g, " ").toLowerCase()
      : imageUrl
        ? "Static creative"
        : null,
    destinationUrl,
    raw: creative,
  };
}

async function fetchMetaCreativeDetails(adIds: string[]) {
  const version = process.env.META_API_VERSION || META_DEFAULT_API_VERSION;
  const accessToken = process.env.META_ACCESS_TOKEN || "";
  const details = new Map<string, MetaCreativeDetails>();
  const uniqueIds = Array.from(new Set(adIds.filter(Boolean)));

  for (const idChunk of chunk(uniqueIds, 40)) {
    const url = new URL(`https://graph.facebook.com/${version}/`);
    url.searchParams.set("ids", idChunk.join(","));
    url.searchParams.set(
      "fields",
      [
        "id",
        "name",
        "creative{id,name,title,body,image_url,thumbnail_url,object_story_spec,asset_feed_spec,object_type,url_tags}",
      ].join(",")
    );
    url.searchParams.set("access_token", accessToken);

    const body = (await fetchJson(url.toString(), { cache: "no-store" })) as Record<
      string,
      { creative?: unknown }
    >;

    for (const [adId, ad] of Object.entries(body)) {
      const detail = metaCreativeDetails(ad.creative);
      if (detail) {
        details.set(adId, detail);
      }
    }
  }

  return details;
}

async function fetchMetaInsights(range: AdsDateRange) {
  const accountPath = getMetaAccountPath();
  const version = process.env.META_API_VERSION || META_DEFAULT_API_VERSION;
  const accessToken = process.env.META_ACCESS_TOKEN || "";
  const fields = [
    "account_id",
    "account_name",
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "ad_id",
    "ad_name",
    "date_start",
    "spend",
    "impressions",
    "reach",
    "clicks",
    "cpc",
    "cpm",
    "ctr",
    "objective",
  ].join(",");
  const rows: MetaInsightRow[] = [];
  const baseUrl = new URL(
    `https://graph.facebook.com/${version}/${accountPath}/insights`
  );

  baseUrl.searchParams.set("level", "ad");
  baseUrl.searchParams.set("time_increment", "1");
  baseUrl.searchParams.set(
    "time_range",
    JSON.stringify({ since: range.startDate, until: range.endDate })
  );
  baseUrl.searchParams.set("fields", fields);
  baseUrl.searchParams.set("breakdowns", "publisher_platform");
  baseUrl.searchParams.set("limit", "500");
  baseUrl.searchParams.set("access_token", accessToken);

  let nextUrl: string | null = baseUrl.toString();

  while (nextUrl) {
    const body = (await fetchJson(nextUrl, { cache: "no-store" })) as {
      data?: MetaInsightRow[];
      paging?: { next?: string };
    };
    rows.push(...(body.data || []));
    nextUrl = body.paging?.next || null;
  }

  return rows;
}

async function getMetaMetrics(range: AdsDateRange): Promise<AdMetricInput[]> {
  const rows = await fetchMetaInsights(range);
  let creativeByAdId = new Map<string, MetaCreativeDetails>();

  try {
    creativeByAdId = await fetchMetaCreativeDetails(
      rows.map((row) => row.ad_id || "").filter(Boolean)
    );
  } catch (error) {
    console.warn("Meta creative metadata sync failed", error);
  }

  return rows
    .filter(
      (row) =>
        row.date_start &&
        !isExcludedAdEntity({
          campaignId: row.campaign_id,
          adGroupId: row.adset_id,
          adId: row.ad_id,
        })
    )
    .map((row) => {
      const creativeDetails = row.ad_id ? creativeByAdId.get(row.ad_id) : null;
      const tracking = inferTracking({
        platform: "meta",
        placement: row.publisher_platform || null,
        destinationUrl: creativeDetails?.destinationUrl || null,
        campaignName: row.campaign_name || null,
        adGroupName: row.adset_name || null,
        adName: row.ad_name || null,
      });
      const creative = inferCreativeProfile({
        headline: creativeDetails?.headline || null,
        body: creativeDetails?.body || null,
        imageUrl: creativeDetails?.imageUrl || null,
        imageLabel: creativeDetails?.imageLabel || row.ad_name || null,
        format: creativeDetails?.format || null,
        destinationUrl: creativeDetails?.destinationUrl || null,
        eventSlug: tracking.eventSlug,
        utmContent: tracking.utmContent,
        campaignName: row.campaign_name || null,
        adGroupName: row.adset_name || null,
        adName: row.ad_name || null,
      });
      const metricBase = {
        platform: "meta" as const,
        metricDate: row.date_start as string,
        accountId: row.account_id || process.env.META_AD_ACCOUNT_ID || null,
        accountName: row.account_name || null,
        currency: null,
        platformCampaignId: row.campaign_id || null,
        campaignName: row.campaign_name || null,
        platformAdGroupId: row.adset_id || null,
        adGroupName: row.adset_name || null,
        platformAdId: row.ad_id || null,
        adName: row.ad_name || null,
        ...creative,
        placement: row.publisher_platform || null,
        eventSlug: tracking.eventSlug,
        utmSource: tracking.utmSource,
        utmCampaign: tracking.utmCampaign,
        utmContent: tracking.utmContent,
        spendMicros: currencyToMicros(row.spend),
        impressions: toInt(row.impressions),
        reach: toInt(row.reach),
        clicks: toInt(row.clicks),
        cpcMicros: currencyToMicros(row.cpc),
        cpmMicros: currencyToMicros(row.cpm),
        ctr: percentToRatio(row.ctr),
        provisional: false,
        raw: { insight: row, creative: creativeDetails?.raw || null },
      };

      return {
        ...metricBase,
        metricId: metricIdentity(metricBase),
      };
    });
}

function getXApiVersion() {
  return getXAdsConfig().apiVersion;
}

function xApiMissingConfig() {
  return getXAdsConfig().missing;
}

function getLocalXBulkExportPath() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const configured = process.env.X_ADS_BULK_EXPORT_PATH;
  if (configured && fs.existsSync(configured)) {
    return configured;
  }

  if (fs.existsSync(DEFAULT_X_BULK_EXPORT_PATH)) {
    return DEFAULT_X_BULK_EXPORT_PATH;
  }

  return null;
}

function xBaseUrl() {
  return `https://ads-api.x.com/${getXApiVersion()}`;
}

function xOAuth() {
  const config = getXAdsConfig();

  return new OAuth({
    consumer: {
      key: config.apiKey,
      secret: config.apiSecret,
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });
}

async function xGet(path: string, params: Record<string, string> = {}) {
  const config = getXAdsConfig();
  const baseUrl = `${xBaseUrl()}${path}`;
  const url = new URL(baseUrl);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const token = {
    key: config.accessToken,
    secret: config.accessTokenSecret,
  };
  const request = {
    url: baseUrl,
    method: "GET",
    data: params,
  };
  const authHeader = xOAuth().toHeader(xOAuth().authorize(request, token));

  return fetchJson(url.toString(), {
    cache: "no-store",
    headers: {
      ...authHeader,
      Accept: "application/json",
    },
  });
}

async function xPaged(path: string, params: Record<string, string> = {}) {
  const data: JsonObject[] = [];
  let cursor: string | null = null;
  let isFirstPage = true;

  while (isFirstPage || cursor) {
    const pageParams = cursor ? { ...params, cursor } : params;
    const body = (await xGet(path, pageParams)) as {
      data?: JsonObject[];
      next_cursor?: string | null;
    };
    data.push(...(body.data || []));
    isFirstPage = false;
    cursor = body.next_cursor && body.next_cursor !== "0" ? body.next_cursor : null;
  }

  return data;
}

async function getXAccountTimezone(accountId: string) {
  try {
    const body = (await xGet(`/accounts/${accountId}`)) as { data?: unknown };
    const account = jsonRecord(body.data);
    return jsonString(account?.timezone) || "UTC";
  } catch (error) {
    console.warn("X account timezone lookup failed", error);
    return "UTC";
  }
}

const timeZoneFormatters = new Map<string, Intl.DateTimeFormat>();

function getTimeZoneFormatter(timeZone: string) {
  const cached = timeZoneFormatters.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  timeZoneFormatters.set(timeZone, formatter);
  return formatter;
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneFormatter(timeZone).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return asUtc - date.getTime();
}

function localMidnightIso(date: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const localMidnightUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let utcMs = localMidnightUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const nextUtcMs =
      localMidnightUtc - timeZoneOffsetMs(new Date(utcMs), timeZone);
    if (nextUtcMs === utcMs) {
      break;
    }
    utcMs = nextUtcMs;
  }

  return new Date(utcMs).toISOString().replace(".000Z", "Z");
}

function xStatsWindows(range: AdsDateRange, timeZone: string) {
  const windows: Array<{
    dates: string[];
    startTime: string;
    endTime: string;
  }> = [];
  let cursor = range.startDate;

  while (cursor <= range.endDate && windows.length < 60) {
    const dates: string[] = [];

    while (cursor <= range.endDate && dates.length < 7) {
      dates.push(cursor);
      cursor = addDays(cursor, 1);
    }

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    if (!startDate || !endDate) {
      break;
    }

    windows.push({
      dates,
      startTime: localMidnightIso(startDate, timeZone),
      endTime: localMidnightIso(addDays(endDate, 1), timeZone),
    });
  }

  return windows;
}

function xArrayMetric(
  metrics: JsonObject,
  keys: string[],
  index: number,
  fallback = 0
) {
  for (const key of keys) {
    const values = metrics[key];
    if (Array.isArray(values)) {
      return toInt(values[index], fallback);
    }
  }

  return fallback;
}

function xFloatArrayMetric(
  metrics: JsonObject,
  keys: string[],
  index: number,
  fallback: number | null = null
) {
  for (const key of keys) {
    const values = metrics[key];
    if (Array.isArray(values)) {
      return toFloat(values[index], fallback);
    }
  }

  return fallback;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function getMappedTracking(input: {
  platform: AdPlatform;
  campaignId?: string | null;
  adGroupId?: string | null;
  adId?: string | null;
}): Promise<TrackingResolution | null> {
  const { rows } = await query<{
    event_slug: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
  }>(
    `
      SELECT event_slug, utm_source, utm_campaign, utm_content
      FROM ad_utm_mappings
      WHERE platform = $1
        AND (platform_campaign_id IS NULL OR platform_campaign_id = $2)
        AND (platform_ad_group_id IS NULL OR platform_ad_group_id = $3)
        AND (platform_ad_id IS NULL OR platform_ad_id = $4)
      ORDER BY
        (CASE WHEN platform_ad_id IS NOT NULL THEN 4 ELSE 0 END) +
        (CASE WHEN platform_ad_group_id IS NOT NULL THEN 2 ELSE 0 END) +
        (CASE WHEN platform_campaign_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
        updated_at DESC
      LIMIT 1
    `,
    [
      input.platform,
      input.campaignId || null,
      input.adGroupId || null,
      input.adId || null,
    ]
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    eventSlug: row.event_slug,
    utmSource: row.utm_source,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
  };
}

function buildOverallAttributionGroups(
  distribution: Map<string, XAttributionGroup[]>
) {
  const overall = new Map<string, number>();

  for (const dateGroups of distribution.values()) {
    for (const item of dateGroups) {
      const key = item.utmContent || "";
      overall.set(key, (overall.get(key) || 0) + item.trackedClicks);
    }
  }

  return Array.from(overall.entries()).map(([utmContent, trackedClicks]) => ({
    utmContent: utmContent || null,
    trackedClicks,
  }));
}

function allocateTotal(
  total: number,
  share: number,
  index: number,
  count: number,
  allocatedSoFar: number
) {
  return index === count - 1
    ? total - allocatedSoFar
    : Math.round(total * share);
}

async function getXMetrics(range: AdsDateRange): Promise<AdMetricInput[]> {
  const accountId = getXAdsConfig().accountId;
  const [campaigns, lineItems] = await Promise.all([
    xPaged(`/accounts/${accountId}/campaigns`, {
      count: "1000",
      with_deleted: "true",
    }),
    xPaged(`/accounts/${accountId}/line_items`, {
      count: "1000",
      with_deleted: "true",
    }),
  ]);
  const campaignById = new Map(
    campaigns.map((campaign) => [String(campaign.id || ""), campaign])
  );
  const activeLineItems = lineItems.filter(
    (item) =>
      item.id &&
      !isExcludedAdEntity({
        campaignId: item.campaign_id,
        adGroupId: item.id,
      })
  );

  if (activeLineItems.length === 0) {
    return [];
  }

  const metrics: AdMetricInput[] = [];
  const accountTimezone = await getXAccountTimezone(accountId);
  const statWindows = xStatsWindows(range, accountTimezone);
  const provisionalBoundary = addDays(todayIsoDate(), -3);

  for (const lineItemChunk of chunk(activeLineItems, 20)) {
    const ids = lineItemChunk.map((item) => String(item.id)).join(",");
    const lineById = new Map(lineItemChunk.map((item) => [String(item.id), item]));

    for (const statWindow of statWindows) {
      const stats = (await xGet(`/stats/accounts/${accountId}`, {
        entity: "LINE_ITEM",
        entity_ids: ids,
        start_time: statWindow.startTime,
        end_time: statWindow.endTime,
        granularity: "DAY",
        placement: "ALL_ON_TWITTER",
        metric_groups: "ENGAGEMENT,BILLING",
      })) as { data?: Array<{ id?: string; id_data?: JsonObject[] }> };

      for (const stat of stats.data || []) {
        const lineItem = lineById.get(String(stat.id || ""));
        if (!lineItem) {
          continue;
        }

        const campaign = campaignById.get(String(lineItem.campaign_id || ""));
        const campaignName = String(campaign?.name || lineItem.campaign_id || "");
        const lineItemName = String(lineItem.name || stat.id || "");
        const inferredTracking = inferTracking({
          platform: "x",
          campaignName,
          adGroupName: lineItemName,
        });
        const mappedTracking = await getMappedTracking({
          platform: "x",
          campaignId: String(lineItem.campaign_id || "") || null,
          adGroupId: String(lineItem.id || "") || null,
          adId: null,
        });
        const tracking = {
          eventSlug: mappedTracking?.eventSlug || inferredTracking.eventSlug,
          utmSource: mappedTracking?.utmSource || inferredTracking.utmSource,
          utmCampaign: mappedTracking?.utmCampaign || inferredTracking.utmCampaign,
          utmContent: mappedTracking?.utmContent || inferredTracking.utmContent,
        };
        const distribution =
          tracking.eventSlug && tracking.utmCampaign && !tracking.utmContent
            ? await getXAttributionDistribution({
                range,
                eventSlug: tracking.eventSlug,
                utmCampaign: tracking.utmCampaign,
              })
            : new Map<string, XAttributionGroup[]>();
        const fallbackGroups = buildOverallAttributionGroups(distribution);

        for (const idData of stat.id_data || []) {
          const statMetrics = (idData.metrics || {}) as JsonObject;

          for (let index = 0; index < statWindow.dates.length; index += 1) {
            const metricDate = statWindow.dates[index];
            const spendMicros = xArrayMetric(
              statMetrics,
              ["billed_charge_local_micro"],
              index
            );
            const impressions = xArrayMetric(statMetrics, ["impressions"], index);
            const clicks = xArrayMetric(
              statMetrics,
              ["url_clicks", "link_clicks", "clicks", "app_clicks"],
              index
            );

            if (spendMicros === 0 && impressions === 0 && clicks === 0) {
              continue;
            }

            const contentGroups = tracking.utmContent
              ? [{ utmContent: tracking.utmContent, trackedClicks: clicks }]
              : distribution.get(metricDate) ||
                fallbackGroups ||
                [{ utmContent: null, trackedClicks: 0 }];
            const allocationGroups =
              contentGroups.length > 0
                ? contentGroups
                : [{ utmContent: null, trackedClicks: 0 }];
            const totalAllocationClicks = allocationGroups.reduce(
              (sum, item) => sum + item.trackedClicks,
              0
            );
            let allocatedSpendMicros = 0;
            let allocatedImpressions = 0;
            let allocatedClicks = 0;

            const cpcLocalMicro = xFloatArrayMetric(
              statMetrics,
              ["cost_per_url_click_local_micro", "cost_per_click_local_micro"],
              index
            );
            const cpmLocalMicro = xFloatArrayMetric(
              statMetrics,
              ["cost_per_1000_impressions_local_micro", "cpm_local_micro"],
              index
            );

            for (let groupIndex = 0; groupIndex < allocationGroups.length; groupIndex += 1) {
              const item = allocationGroups[groupIndex];
              const share =
                totalAllocationClicks > 0
                  ? item.trackedClicks / totalAllocationClicks
                  : 1 / allocationGroups.length;
              const groupSpendMicros = allocateTotal(
                spendMicros,
                share,
                groupIndex,
                allocationGroups.length,
                allocatedSpendMicros
              );
              const groupImpressions = allocateTotal(
                impressions,
                share,
                groupIndex,
                allocationGroups.length,
                allocatedImpressions
              );
              const groupClicks = allocateTotal(
                clicks,
                share,
                groupIndex,
                allocationGroups.length,
                allocatedClicks
              );
              allocatedSpendMicros += groupSpendMicros;
              allocatedImpressions += groupImpressions;
              allocatedClicks += groupClicks;
              const creative = inferCreativeProfile({
                eventSlug: tracking.eventSlug,
                utmContent: item.utmContent,
                campaignName,
                adGroupName: lineItemName,
              });
              const metricBase = {
                platform: "x" as const,
                metricDate,
                accountId,
                accountName: null,
                currency:
                  typeof campaign?.currency === "string"
                    ? campaign.currency
                    : typeof lineItem.currency === "string"
                      ? lineItem.currency
                      : null,
                platformCampaignId: String(lineItem.campaign_id || "") || null,
                campaignName: campaignName || null,
                platformAdGroupId: String(lineItem.id || "") || null,
                adGroupName: lineItemName,
                platformAdId: null,
                adName: null,
                ...creative,
                placement: "ALL_ON_TWITTER",
                eventSlug: tracking.eventSlug,
                utmSource: tracking.utmSource,
                utmCampaign: tracking.utmCampaign,
                utmContent: item.utmContent,
                spendMicros: groupSpendMicros,
                impressions: groupImpressions,
                reach: null,
                clicks: groupClicks,
                cpcMicros:
                  cpcLocalMicro === null
                    ? groupClicks > 0
                      ? Math.round(groupSpendMicros / groupClicks)
                      : null
                    : Math.round(cpcLocalMicro),
                cpmMicros:
                  cpmLocalMicro === null
                    ? groupImpressions > 0
                      ? Math.round((groupSpendMicros * 1000) / groupImpressions)
                      : null
                    : Math.round(cpmLocalMicro),
                ctr: groupImpressions > 0 ? groupClicks / groupImpressions : null,
                provisional: metricDate >= provisionalBoundary,
                raw: {
                  source: "x_ads_api_line_item",
                  stat,
                  campaign,
                  lineItem,
                  accountTimezone,
                  allocation: {
                    method:
                      tracking.utmContent || allocationGroups.length === 1
                        ? "explicit_utm_content"
                        : "same_day_tracked_click_share",
                    share,
                    trackedClicks: item.trackedClicks,
                  },
                },
              };

              metrics.push({
                ...metricBase,
                metricId: metricIdentity(metricBase),
              });
            }
          }
        }
      }
    }
  }

  return metrics;
}

function excelString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const stringValue = String(value).trim();
  return stringValue || null;
}

function excelNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const cleaned = value.replace(/[$,]/g, "").trim();
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function parseBulkExportDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const stringValue = excelString(value);
  if (!stringValue) {
    return null;
  }

  const parsed = new Date(stringValue.replace(/^(\d{2})-([A-Za-z]{3})-(\d{4})/, "$1 $2 $3"));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function inferBulkExportEventSlug(campaignName: string | null, adGroupName: string | null) {
  const text = `${campaignName || ""} ${adGroupName || ""}`.toLowerCase();

  if (text.includes("peptide")) {
    return "descinyc49";
  }

  if (text.includes("subway") || text.includes("air quality") || text.includes("transit")) {
    return "descinyc46";
  }

  return inferTracking({
    platform: "x",
    campaignName,
    adGroupName,
  }).eventSlug;
}

async function getXAttributionDistribution(input: {
  range: AdsDateRange;
  eventSlug: string;
  utmCampaign: string;
}) {
  const { rows } = await query<{
    metric_date: string | Date;
    utm_content: string | null;
    tracked_clicks: string | number;
  }>(
    `
      SELECT
        created_at::date AS metric_date,
        utm_content,
        COUNT(*)::int AS tracked_clicks
      FROM attribution_clicks
      WHERE created_at >= $1::date
        AND created_at < ($2::date + INTERVAL '1 day')
        AND event_slug = $3
        AND LOWER(COALESCE(utm_source, '')) IN ('twitter_ads', 'x_ads')
        AND COALESCE(utm_campaign, '') = $4
      GROUP BY created_at::date, utm_content
      ORDER BY created_at::date ASC, tracked_clicks DESC
    `,
    [input.range.startDate, input.range.endDate, input.eventSlug, input.utmCampaign]
  );
  const byDate = new Map<
    string,
    Array<{ utmContent: string | null; trackedClicks: number }>
  >();

  for (const row of rows) {
    const date = row.metric_date instanceof Date ? row.metric_date.toISOString().slice(0, 10) : row.metric_date.slice(0, 10);
    const items = byDate.get(date) || [];
    items.push({
      utmContent: row.utm_content,
      trackedClicks: toInt(row.tracked_clicks),
    });
    byDate.set(date, items);
  }

  return byDate;
}

async function getXBulkExportMetrics(range: AdsDateRange): Promise<AdMetricInput[]> {
  const exportPath = getLocalXBulkExportPath();
  if (!exportPath) {
    return [];
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.read(fs.readFileSync(exportPath), {
    cellDates: true,
    type: "buffer",
  });
  const worksheet = workbook.Sheets.Campaigns || workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: "",
  });
  const metrics: AdMetricInput[] = [];

  for (const row of rows) {
    const campaignId = excelString(row["Campaign ID"]);
    const adGroupId = excelString(row["Ad Group ID"]);
    const campaignName = excelString(row["Campaign Name"]);
    const adGroupName = excelString(row["Ad Group Name"]);
    const destinationUrl = excelString(row["TAP Media Creative Landing URL"]);
    const tweetIds = excelString(row["Tweet IDs"]);
    const tweetLabel = tweetIds
      ? `Promoted post ${tweetIds.split(";")[0]?.replace(/^i/, "")}`
      : null;
    const eventSlug = inferBulkExportEventSlug(campaignName, adGroupName);

    if (
      !campaignId ||
      !eventSlug ||
      isExcludedAdEntity({
        campaignId,
        adGroupId,
      })
    ) {
      continue;
    }

    const eventConfig =
      ATTRIBUTION_EVENTS[eventSlug as keyof typeof ATTRIBUTION_EVENTS];
    const utmCampaign = eventConfig?.defaultUtm.utm_campaign || null;
    if (!utmCampaign) {
      continue;
    }

    const startDate = parseBulkExportDate(row["Campaign Start Date"]) || range.startDate;
    const endDate = parseBulkExportDate(row["Campaign End Date"]) || range.endDate;
    const campaignDailyBudget = excelNumber(row["Campaign Daily Budget"]);
    const adGroupDailyBudget = excelNumber(row["Ad Group Daily Budget"]);
    const campaignTotalBudget = excelNumber(row["Campaign Total Budget"]);
    const effectiveStart = startDate > range.startDate ? startDate : range.startDate;
    const effectiveEnd = endDate < range.endDate ? endDate : range.endDate;

    if (effectiveStart > effectiveEnd) {
      continue;
    }

    const days: string[] = [];
    let cursor = effectiveStart;
    while (cursor <= effectiveEnd && days.length < 370) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    const dailyBudget =
      adGroupDailyBudget ||
      campaignDailyBudget ||
      (campaignTotalBudget && days.length > 0 ? campaignTotalBudget / days.length : 0);
    const distribution = await getXAttributionDistribution({
      range: { startDate: effectiveStart, endDate: effectiveEnd },
      eventSlug,
      utmCampaign,
    });
    const overallDistribution = new Map<string, number>();

    for (const dateGroups of distribution.values()) {
      for (const item of dateGroups) {
        const key = item.utmContent || "";
        overallDistribution.set(
          key,
          (overallDistribution.get(key) || 0) + item.trackedClicks
        );
      }
    }
    const fallbackGroups =
      overallDistribution.size > 0
        ? Array.from(overallDistribution.entries()).map(
            ([utmContent, trackedClicks]) => ({
              utmContent: utmContent || null,
              trackedClicks,
            })
          )
        : [{ utmContent: null, trackedClicks: 0 }];

    for (const metricDate of days) {
      const dateGroups = distribution.get(metricDate);
      const contentGroups = dateGroups || fallbackGroups;
      const totalAllocationClicks = contentGroups.reduce(
        (sum, item) => sum + item.trackedClicks,
        0
      );

      for (const item of contentGroups) {
        const share =
          totalAllocationClicks > 0
            ? item.trackedClicks / totalAllocationClicks
            : 1 / contentGroups.length;
        const metricClicks = dateGroups ? item.trackedClicks : 0;
        const spendMicros = Math.round(dailyBudget * share * 1_000_000);
        const creative = inferCreativeProfile({
          format: "Promoted post",
          destinationUrl,
          eventSlug,
          utmContent: item.utmContent,
          campaignName,
          adGroupName,
          adName: tweetLabel,
        });
        const metricBase = {
          platform: "x" as const,
          metricDate,
          accountId: "local-x-bulk-export",
          accountName: "Local X bulk export",
          currency: "USD",
          platformCampaignId: campaignId,
          campaignName,
          platformAdGroupId: adGroupId,
          adGroupName,
          platformAdId: null,
          adName: tweetLabel,
          ...creative,
          placement: null,
          eventSlug,
          utmSource: "twitter_ads",
          utmCampaign,
          utmContent: item.utmContent,
          spendMicros,
          impressions: 0,
          reach: null,
          clicks: metricClicks,
          cpcMicros:
            metricClicks > 0 ? Math.round(spendMicros / metricClicks) : null,
          cpmMicros: null,
          ctr: null,
          provisional: true,
          raw: {
            source: "x_bulk_export_budget_proxy",
            exportPath,
            trackedClicks: metricClicks,
            allocationClicks: item.trackedClicks,
            campaignDailyBudget,
            adGroupDailyBudget,
            campaignTotalBudget,
            tweetIds,
            row,
          },
        };

        metrics.push({
          ...metricBase,
          metricId: metricIdentity(metricBase),
        });
      }
    }
  }

  return metrics;
}

async function syncPlatform(
  platform: AdPlatform,
  range: AdsDateRange
): Promise<SyncPlatformResult> {
  const status = getConnectorConfigStatus().find((item) => item.platform === platform);
  const syncRunId = await startAdSyncRun(platform, range, {
    source: "manual_dashboard_sync",
  });

  if (!status || !status.configured) {
    const missingConfig = status?.missingConfig || [];
    const warnings = [`Missing ${missingConfig.join(", ")}`];
    await finishAdSyncRun({
      syncRunId,
      status: "skipped",
      rowsSynced: 0,
      warnings,
      metadata: { missingConfig },
    });

    return {
      platform,
      configured: false,
      status: "skipped",
      rowsSynced: 0,
      warnings,
      error: null,
      missingConfig,
    };
  }

  try {
    const metrics =
      platform === "meta"
        ? await getMetaMetrics(range)
        : xApiMissingConfig().length === 0
          ? await getXMetrics(range)
          : await getXBulkExportMetrics(range);
    if (platform === "x") {
      await deleteAdMetricsForPlatformRange(
        xApiMissingConfig().length === 0
          ? {
              platform: "x",
              range,
            }
          : {
              platform: "x",
              range,
              rawSource: "x_bulk_export_budget_proxy",
            }
      );
    }

    const rowsSynced = await upsertAdMetrics(metrics);
    const warnings =
      platform === "x"
        ? xApiMissingConfig().length === 0
          ? ["X billing metrics for the latest 3 days are marked provisional."]
          : [
              "Imported local X bulk export. Spend uses campaign/ad-group budget as a proxy until X Ads API credentials are configured.",
            ]
        : [];

    await finishAdSyncRun({
      syncRunId,
      status: "success",
      rowsSynced,
      warnings,
    });

    return {
      platform,
      configured: true,
      status: "success",
      rowsSynced,
      warnings,
      error: null,
      missingConfig: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await finishAdSyncRun({
      syncRunId,
      status: "error",
      rowsSynced: 0,
      error: message,
    });

    return {
      platform,
      configured: true,
      status: "error",
      rowsSynced: 0,
      warnings: [],
      error: message,
      missingConfig: [],
    };
  }
}

export async function syncAds(input: {
  platforms: Array<AdPlatform>;
  range: AdsDateRange;
}) {
  const results: SyncPlatformResult[] = [];

  for (const platform of input.platforms) {
    results.push(await syncPlatform(platform, input.range));
  }

  return results;
}

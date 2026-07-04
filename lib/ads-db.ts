import "server-only";

import fs from "fs";
import { ATTRIBUTION_EVENTS } from "@/lib/attribution";
import { getPool, hasDatabaseConfig, query } from "@/lib/db";
import type {
  AdMetricInput,
  AdPlatform,
  AdsBreakdownRow,
  AdsFilters,
  AdsMapping,
  AdsQualityIssue,
  AdsSummaryResponse,
  ConnectorStatus,
} from "@/lib/ads-types";
import {
  PAID_SOCIAL_SOURCES,
  PLATFORM_LABELS,
  addDays,
  inferCreativeProfile,
  microsPer,
  normalizePlatform,
  ratioFrom,
  sourceToPlatform,
  toInt,
  trackingKey,
} from "@/lib/ads-utils";

type MetricRow = {
  metric_id: string;
  platform: AdPlatform;
  metric_date: string | Date;
  account_id: string | null;
  account_name: string | null;
  currency: string | null;
  platform_campaign_id: string | null;
  campaign_name: string | null;
  platform_ad_group_id: string | null;
  ad_group_name: string | null;
  platform_ad_id: string | null;
  ad_name: string | null;
  creative_headline: string | null;
  creative_body: string | null;
  creative_image_url: string | null;
  creative_image_label: string | null;
  creative_format: string | null;
  creative_theme: string | null;
  destination_url: string | null;
  placement: string | null;
  resolved_event_slug: string | null;
  resolved_utm_source: string | null;
  resolved_utm_campaign: string | null;
  resolved_utm_content: string | null;
  spend_micros: string | number;
  impressions: string | number;
  reach: string | number | null;
  clicks: string | number;
  provisional: boolean;
  updated_at: string | Date;
};

type AttributionGroupRow = {
  date: string | Date;
  event_slug: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  count: string | number;
  unmatched?: string | number;
};

type SyncRunRow = {
  platform: AdPlatform;
  status: string;
  rows_synced: string | number;
  error: string | null;
  started_at: string | Date;
  finished_at: string | Date | null;
};

type MappingRow = {
  mapping_id: string;
  platform: AdPlatform;
  platform_campaign_id: string | null;
  platform_ad_group_id: string | null;
  platform_ad_id: string | null;
  event_slug: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

const PLATFORM_SOURCES: Record<AdPlatform, string[]> = {
  meta: ["meta_ads", "facebook_ads", "instagram_ads"],
  x: ["twitter_ads", "x_ads"],
};

const DEFAULT_X_BULK_EXPORT_PATH =
  "/Users/mint/Documents/ads/endpointarena-2026_06_04-2026_07_04-replace-descinyc-posts.xlsx";

function numberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function dateOnly(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value.slice(0, 10);
}

function isoDateTime(value: string | Date | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function connectorMissingConfig(platform: AdPlatform) {
  if (platform === "meta") {
    const required: Array<[string, string | undefined]> = [
      ["META_AD_ACCOUNT_ID", process.env.META_AD_ACCOUNT_ID],
      ["META_ACCESS_TOKEN", process.env.META_ACCESS_TOKEN],
    ];

    return required.filter(([, value]) => !value).map(([key]) => key);
  }

  const required: Array<[string, string | undefined]> = [
    ["X_ADS_ACCOUNT_ID", process.env.X_ADS_ACCOUNT_ID],
    ["X_ADS_API_KEY", process.env.X_ADS_API_KEY],
    ["X_ADS_API_SECRET", process.env.X_ADS_API_SECRET],
    ["X_ADS_ACCESS_TOKEN", process.env.X_ADS_ACCESS_TOKEN],
    ["X_ADS_ACCESS_TOKEN_SECRET", process.env.X_ADS_ACCESS_TOKEN_SECRET],
  ];

  return required.filter(([, value]) => !value).map(([key]) => key);
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

export function getConnectorConfigStatus(): ConnectorStatus[] {
  return (["meta", "x"] as AdPlatform[]).map((platform) => {
    const missingConfig = connectorMissingConfig(platform);
    const localXExport = platform === "x" ? getLocalXBulkExportPath() : null;

    return {
      platform,
      configured: missingConfig.length === 0 || Boolean(localXExport),
      label: localXExport ? "X local export" : PLATFORM_LABELS[platform],
      lastSyncAt: null,
      lastStatus: null,
      lastError: null,
      rowsSynced: 0,
      missingConfig: localXExport ? [] : missingConfig,
    };
  });
}

function emptySummary(filters: AdsFilters, issue?: AdsQualityIssue): AdsSummaryResponse {
  return {
    filters,
    connectorStatus: getConnectorConfigStatus(),
    totals: {
      spendMicros: 0,
      impressions: 0,
      reach: 0,
      platformClicks: 0,
      trackedClicks: 0,
      registrations: 0,
      cpcMicros: null,
      cpmMicros: null,
      ctr: null,
      conversionRate: null,
      costPerRegistrationMicros: null,
      unmappedSpendMicros: 0,
      provisionalSpendMicros: 0,
      unmatchedConversions: 0,
    },
    timeSeries: [],
    platformBreakdown: [],
      campaignRows: [],
      creativeRows: [],
      unmappedRows: [],
    options: {
      platforms: [
        { value: "all", label: "All platforms" },
        { value: "meta", label: "Meta" },
        { value: "x", label: "X" },
      ],
      events: Object.values(ATTRIBUTION_EVENTS).map((event) => ({
        value: event.slug,
        label: event.title,
      })),
      campaigns: [],
      creatives: [],
    },
    qualityIssues: issue ? [issue] : [],
  };
}

function buildMetricsWhere(filters: AdsFilters) {
  const params: unknown[] = [filters.startDate, filters.endDate];
  const where = ["m.metric_date BETWEEN $1::date AND $2::date"];

  if (filters.platform && filters.platform !== "all") {
    params.push(filters.platform);
    where.push(`m.platform = $${params.length}`);
  }

  if (filters.campaignId) {
    params.push(filters.campaignId);
    where.push(`m.platform_campaign_id = $${params.length}`);
  }

  if (filters.adId) {
    params.push(filters.adId);
    where.push(`m.platform_ad_id = $${params.length}`);
  }

  return { params, where: where.join(" AND ") };
}

async function getMetricRows(filters: AdsFilters) {
  const { params, where } = buildMetricsWhere(filters);
  const { rows } = await query<MetricRow>(
    `
      SELECT
        m.*,
        COALESCE(mapping.event_slug, m.event_slug) AS resolved_event_slug,
        COALESCE(mapping.utm_source, m.utm_source) AS resolved_utm_source,
        COALESCE(mapping.utm_campaign, m.utm_campaign) AS resolved_utm_campaign,
        COALESCE(mapping.utm_content, m.utm_content) AS resolved_utm_content
      FROM ad_daily_metrics m
      LEFT JOIN LATERAL (
        SELECT map.*
        FROM ad_utm_mappings map
        WHERE map.platform = m.platform
          AND (map.platform_campaign_id IS NULL OR map.platform_campaign_id = m.platform_campaign_id)
          AND (map.platform_ad_group_id IS NULL OR map.platform_ad_group_id = m.platform_ad_group_id)
          AND (map.platform_ad_id IS NULL OR map.platform_ad_id = m.platform_ad_id)
        ORDER BY
          (CASE WHEN map.platform_ad_id IS NOT NULL THEN 4 ELSE 0 END) +
          (CASE WHEN map.platform_ad_group_id IS NOT NULL THEN 2 ELSE 0 END) +
          (CASE WHEN map.platform_campaign_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
          map.updated_at DESC
        LIMIT 1
      ) mapping ON TRUE
      WHERE ${where}
      ORDER BY m.metric_date ASC, m.platform ASC, m.campaign_name ASC, m.ad_name ASC
    `,
    params
  );

  return filters.eventSlug
    ? rows.filter((row) => row.resolved_event_slug === filters.eventSlug)
    : rows;
}

function attributionSourceFilter(filters: AdsFilters) {
  const platform = normalizePlatform(filters.platform);
  return platform === "all" ? PAID_SOCIAL_SOURCES : PLATFORM_SOURCES[platform];
}

async function getClickGroups(filters: AdsFilters) {
  const sources = attributionSourceFilter(filters);
  const params: unknown[] = [filters.startDate, filters.endDate, sources];
  const where = [
    "created_at >= $1::date",
    "created_at < ($2::date + INTERVAL '1 day')",
    "LOWER(COALESCE(utm_source, '')) = ANY($3::text[])",
  ];

  if (filters.eventSlug) {
    params.push(filters.eventSlug);
    where.push(`event_slug = $${params.length}`);
  }

  const { rows } = await query<AttributionGroupRow>(
    `
      SELECT
        created_at::date AS date,
        event_slug,
        utm_source,
        utm_campaign,
        utm_content,
        COUNT(*)::int AS count
      FROM attribution_clicks
      WHERE ${where.join(" AND ")}
      GROUP BY created_at::date, event_slug, utm_source, utm_campaign, utm_content
      ORDER BY created_at::date ASC
    `,
    params
  );

  return rows;
}

async function getConversionGroups(filters: AdsFilters) {
  const sources = attributionSourceFilter(filters);
  const params: unknown[] = [filters.startDate, filters.endDate, sources];
  const where = [
    "created_at >= $1::date",
    "created_at < ($2::date + INTERVAL '1 day')",
    "LOWER(COALESCE(utm_source, '')) = ANY($3::text[])",
  ];

  if (filters.eventSlug) {
    params.push(filters.eventSlug);
    where.push(`event_slug = $${params.length}`);
  }

  const { rows } = await query<AttributionGroupRow>(
    `
      SELECT
        created_at::date AS date,
        event_slug,
        utm_source,
        utm_campaign,
        utm_content,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE click_id IS NULL)::int AS unmatched
      FROM attribution_conversions
      WHERE ${where.join(" AND ")}
      GROUP BY created_at::date, event_slug, utm_source, utm_campaign, utm_content
      ORDER BY created_at::date ASC
    `,
    params
  );

  return rows;
}

async function getLatestSyncRuns() {
  const { rows } = await query<SyncRunRow>(
    `
      SELECT DISTINCT ON (platform)
        platform,
        status,
        rows_synced,
        error,
        started_at,
        finished_at
      FROM ad_sync_runs
      ORDER BY platform, started_at DESC
    `
  );

  return rows;
}

function withLatestSync(connectorStatus: ConnectorStatus[], rows: SyncRunRow[]) {
  const latest = new Map(rows.map((row) => [row.platform, row]));

  return connectorStatus.map((status) => {
    const run = latest.get(status.platform);
    if (!run) {
      return status;
    }

    return {
      ...status,
      lastSyncAt: isoDateTime(run.finished_at || run.started_at),
      lastStatus: run.status,
      lastError: run.error,
      rowsSynced: toInt(run.rows_synced),
    };
  });
}

function emptyBreakdownRow(input: {
  key: string;
  platform: string;
  campaignId?: string | null;
  campaignName?: string | null;
  adGroupId?: string | null;
  adGroupName?: string | null;
  adId?: string | null;
  adName?: string | null;
  creativeHeadline?: string | null;
  creativeBody?: string | null;
  creativeImageUrl?: string | null;
  creativeImageLabel?: string | null;
  creativeFormat?: string | null;
  creativeTheme?: string | null;
  destinationUrl?: string | null;
  eventSlug?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  campaignCount?: number;
}): AdsBreakdownRow {
  return {
    key: input.key,
    platform: input.platform,
    eventSlug: input.eventSlug || null,
    campaignId: input.campaignId || null,
    campaignName: input.campaignName || "Unlabeled campaign",
    adGroupId: input.adGroupId || null,
    adGroupName: input.adGroupName || null,
    adId: input.adId || null,
    adName: input.adName || null,
    creativeHeadline: input.creativeHeadline || null,
    creativeBody: input.creativeBody || null,
    creativeImageUrl: input.creativeImageUrl || null,
    creativeImageLabel: input.creativeImageLabel || null,
    creativeFormat: input.creativeFormat || null,
    creativeTheme: input.creativeTheme || null,
    destinationUrl: input.destinationUrl || null,
    utmSource: input.utmSource || null,
    utmCampaign: input.utmCampaign || null,
    utmContent: input.utmContent || null,
    campaignCount: input.campaignCount || 0,
    spendMicros: 0,
    impressions: 0,
    reach: 0,
    platformClicks: 0,
    trackedClicks: 0,
    registrations: 0,
    cpcMicros: null,
    cpmMicros: null,
    ctr: null,
    conversionRate: null,
    costPerRegistrationMicros: null,
    provisional: false,
    lastMetricDate: null,
  };
}

function finalizeBreakdown(row: AdsBreakdownRow) {
  row.cpcMicros = microsPer(row.spendMicros, row.platformClicks);
  row.cpmMicros =
    row.impressions > 0 ? Math.round((row.spendMicros * 1000) / row.impressions) : null;
  row.ctr = ratioFrom(row.platformClicks, row.impressions);
  row.conversionRate = ratioFrom(row.registrations, row.trackedClicks);
  row.costPerRegistrationMicros = microsPer(row.spendMicros, row.registrations);
  return row;
}

function addMetricToBreakdown(row: AdsBreakdownRow, metric: MetricRow) {
  row.spendMicros += numberValue(metric.spend_micros);
  row.impressions += numberValue(metric.impressions);
  row.reach += numberValue(metric.reach);
  row.platformClicks += numberValue(metric.clicks);
  row.provisional = row.provisional || Boolean(metric.provisional);
  row.lastMetricDate = dateOnly(metric.metric_date);
}

function groupAttribution(rows: AttributionGroupRow[]) {
  const byTracking = new Map<string, number>();
  const byDate = new Map<string, number>();
  const byPlatform = new Map<string, number>();
  let total = 0;
  let unmatched = 0;

  for (const row of rows) {
    const count = numberValue(row.count);
    const date = dateOnly(row.date);
    const platform = sourceToPlatform(row.utm_source);
    const key = trackingKey({
      eventSlug: row.event_slug,
      utmSource: row.utm_source,
      utmCampaign: row.utm_campaign,
      utmContent: row.utm_content,
    });

    total += count;
    byTracking.set(key, (byTracking.get(key) || 0) + count);
    byDate.set(date, (byDate.get(date) || 0) + count);

    if (platform) {
      byPlatform.set(platform, (byPlatform.get(platform) || 0) + count);
    }

    unmatched += numberValue(row.unmatched);
  }

  return { byTracking, byDate, byPlatform, total, unmatched };
}

function dateRange(startDate: string, endDate: string) {
  const dates: string[] = [];
  let cursor = startDate;
  let guard = 0;

  while (cursor <= endDate && guard < 370) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
    guard += 1;
  }

  return dates;
}

export async function getAdsSummary(filters: AdsFilters): Promise<AdsSummaryResponse> {
  if (!hasDatabaseConfig()) {
    return emptySummary(filters, {
      level: "error",
      title: "Database is not configured",
      body: "Set DATABASE_URL before the ads dashboard can read spend and attribution data.",
    });
  }

  const [metrics, clickRows, conversionRows, syncRows] = await Promise.all([
    getMetricRows(filters),
    getClickGroups(filters),
    getConversionGroups(filters),
    getLatestSyncRuns(),
  ]);
  const clicks = groupAttribution(clickRows);
  const conversions = groupAttribution(conversionRows);
  const connectorStatus = withLatestSync(getConnectorConfigStatus(), syncRows);
  const campaignMap = new Map<string, AdsBreakdownRow>();
  const creativeMap = new Map<string, AdsBreakdownRow>();
  const creativeCampaigns = new Map<string, Set<string>>();
  const platformMap = new Map<string, AdsBreakdownRow>();
  const spendByDate = new Map<string, number>();
  const clickByDate = new Map<string, number>();
  const impressionByDate = new Map<string, number>();
  const unmappedRowsMap = new Map<string, AdsBreakdownRow>();
  const optionsCampaigns = new Map<string, string>();
  const optionsCreatives = new Map<string, string>();
  const optionEvents = new Map(
    Object.values(ATTRIBUTION_EVENTS).map((event) => [event.slug, event.title])
  );
  let unmappedSpendMicros = 0;
  let provisionalSpendMicros = 0;
  const now = Date.now();

  for (const metric of metrics) {
    const date = dateOnly(metric.metric_date);
    const metricSpend = numberValue(metric.spend_micros);
    const metricImpressions = numberValue(metric.impressions);
    const metricClicks = numberValue(metric.clicks);
    const tracking = {
      eventSlug: metric.resolved_event_slug,
      utmSource: metric.resolved_utm_source,
      utmCampaign: metric.resolved_utm_campaign,
      utmContent: metric.resolved_utm_content,
    };
    const creative = inferCreativeProfile({
      headline: metric.creative_headline,
      body: metric.creative_body,
      imageUrl: metric.creative_image_url,
      imageLabel: metric.creative_image_label,
      format: metric.creative_format,
      theme: metric.creative_theme,
      destinationUrl: metric.destination_url,
      eventSlug: tracking.eventSlug,
      utmContent: tracking.utmContent,
      campaignName: metric.campaign_name,
      adGroupName: metric.ad_group_name,
      adName: metric.ad_name,
    });
    const keyParts = [
      metric.platform,
      metric.platform_campaign_id || "",
      metric.platform_ad_group_id || "",
      metric.platform_ad_id || "",
      trackingKey(tracking),
    ];
    const key = keyParts.join("::");
    const creativeKey = [
      metric.platform,
      trackingKey(tracking),
      creative.creativeHeadline || "",
      creative.creativeImageLabel || "",
      creative.creativeTheme || "",
    ].join("::");
    const platformKey = metric.platform;

    if (metric.platform_campaign_id && metric.campaign_name) {
      optionsCampaigns.set(metric.platform_campaign_id, metric.campaign_name);
    }

    if (metric.platform_ad_id && metric.ad_name) {
      optionsCreatives.set(metric.platform_ad_id, metric.ad_name);
    }

    if (tracking.eventSlug) {
      optionEvents.set(
        tracking.eventSlug,
        ATTRIBUTION_EVENTS[tracking.eventSlug as keyof typeof ATTRIBUTION_EVENTS]
          ?.title || tracking.eventSlug
      );
    }

    if (!tracking.utmSource || !tracking.utmCampaign || !tracking.utmContent) {
      unmappedSpendMicros += metricSpend;
      const unmappedKey = [
        metric.platform,
        metric.platform_campaign_id || "",
        metric.platform_ad_group_id || "",
        metric.platform_ad_id || "",
      ].join("::");
      const row =
        unmappedRowsMap.get(unmappedKey) ||
        emptyBreakdownRow({
          key: unmappedKey,
          platform: metric.platform,
          campaignId: metric.platform_campaign_id,
          campaignName: metric.campaign_name,
          adGroupId: metric.platform_ad_group_id,
          adGroupName: metric.ad_group_name,
          adId: metric.platform_ad_id,
          adName: metric.ad_name,
          ...creative,
          eventSlug: tracking.eventSlug,
          utmSource: tracking.utmSource,
          utmCampaign: tracking.utmCampaign,
          utmContent: tracking.utmContent,
        });
      addMetricToBreakdown(row, metric);
      unmappedRowsMap.set(unmappedKey, row);
    }

    if (metric.provisional) {
      provisionalSpendMicros += metricSpend;
    }

    spendByDate.set(date, (spendByDate.get(date) || 0) + metricSpend);
    clickByDate.set(date, (clickByDate.get(date) || 0) + metricClicks);
    impressionByDate.set(date, (impressionByDate.get(date) || 0) + metricImpressions);

    const campaignRow =
      campaignMap.get(key) ||
      emptyBreakdownRow({
        key,
        platform: metric.platform,
        campaignId: metric.platform_campaign_id,
        campaignName: metric.campaign_name,
        adGroupId: metric.platform_ad_group_id,
        adGroupName: metric.ad_group_name,
        adId: metric.platform_ad_id,
        adName: metric.ad_name,
        ...creative,
        eventSlug: tracking.eventSlug,
        utmSource: tracking.utmSource,
        utmCampaign: tracking.utmCampaign,
        utmContent: tracking.utmContent,
      });
    addMetricToBreakdown(campaignRow, metric);
    campaignMap.set(key, campaignRow);

    const creativeRow =
      creativeMap.get(creativeKey) ||
      emptyBreakdownRow({
        key: creativeKey,
        platform: metric.platform,
        campaignId: metric.platform_campaign_id,
        campaignName: metric.campaign_name,
        adGroupId: metric.platform_ad_group_id,
        adGroupName: metric.ad_group_name,
        adId: metric.platform_ad_id,
        adName: metric.ad_name,
        ...creative,
        eventSlug: tracking.eventSlug,
        utmSource: tracking.utmSource,
        utmCampaign: tracking.utmCampaign,
        utmContent: tracking.utmContent,
      });
    addMetricToBreakdown(creativeRow, metric);
    creativeMap.set(creativeKey, creativeRow);

    const campaigns = creativeCampaigns.get(creativeKey) || new Set<string>();
    campaigns.add(metric.platform_campaign_id || metric.campaign_name || "unknown");
    creativeCampaigns.set(creativeKey, campaigns);

    const platformRow =
      platformMap.get(platformKey) ||
      emptyBreakdownRow({
        key: platformKey,
        platform: metric.platform,
        campaignName: PLATFORM_LABELS[metric.platform],
      });
    addMetricToBreakdown(platformRow, metric);
    platformMap.set(platformKey, platformRow);
  }

  for (const row of campaignMap.values()) {
    const key = trackingKey(row);
    if (key !== "|||") {
      row.trackedClicks = clicks.byTracking.get(key) || 0;
      row.registrations = conversions.byTracking.get(key) || 0;
    }
    finalizeBreakdown(row);
  }

  for (const row of creativeMap.values()) {
    const key = trackingKey(row);
    if (key !== "|||") {
      row.trackedClicks = clicks.byTracking.get(key) || 0;
      row.registrations = conversions.byTracking.get(key) || 0;
    }

    const campaigns = creativeCampaigns.get(row.key);
    row.campaignCount = campaigns?.size || 1;
    if (row.campaignCount > 1) {
      row.campaignName = `${row.campaignCount} campaigns`;
    }

    finalizeBreakdown(row);
  }

  for (const [platform, trackedClicks] of clicks.byPlatform.entries()) {
    const row =
      platformMap.get(platform) ||
      emptyBreakdownRow({
        key: platform,
        platform,
        campaignName: platform === "meta" ? "Meta" : "X",
      });
    row.trackedClicks = trackedClicks;
    row.registrations = conversions.byPlatform.get(platform) || 0;
    platformMap.set(platform, row);
  }

  for (const [platform, registrations] of conversions.byPlatform.entries()) {
    const row =
      platformMap.get(platform) ||
      emptyBreakdownRow({
        key: platform,
        platform,
        campaignName: platform === "meta" ? "Meta" : "X",
      });
    row.registrations = registrations;
    if (!row.trackedClicks) {
      row.trackedClicks = clicks.byPlatform.get(platform) || 0;
    }
    platformMap.set(platform, row);
  }

  const campaignRows = Array.from(campaignMap.values())
    .map(finalizeBreakdown)
    .sort((a, b) => b.spendMicros - a.spendMicros);
  const creativeRows = Array.from(creativeMap.values())
    .map(finalizeBreakdown)
    .sort((a, b) => {
      const aHasRegistrations = a.registrations > 0 ? 1 : 0;
      const bHasRegistrations = b.registrations > 0 ? 1 : 0;

      if (aHasRegistrations !== bHasRegistrations) {
        return bHasRegistrations - aHasRegistrations;
      }

      if (a.registrations > 0 && b.registrations > 0) {
        return (
          (a.costPerRegistrationMicros || Number.MAX_SAFE_INTEGER) -
          (b.costPerRegistrationMicros || Number.MAX_SAFE_INTEGER)
        );
      }

      return b.trackedClicks + b.platformClicks - (a.trackedClicks + a.platformClicks);
    });
  const platformBreakdown = Array.from(platformMap.values())
    .map(finalizeBreakdown)
    .sort((a, b) => b.spendMicros - a.spendMicros);
  const unmappedRows = Array.from(unmappedRowsMap.values())
    .map(finalizeBreakdown)
    .sort((a, b) => b.spendMicros - a.spendMicros);
  const spendMicros = metrics.reduce(
    (sum, metric) => sum + numberValue(metric.spend_micros),
    0
  );
  const impressions = metrics.reduce(
    (sum, metric) => sum + numberValue(metric.impressions),
    0
  );
  const platformClicks = metrics.reduce(
    (sum, metric) => sum + numberValue(metric.clicks),
    0
  );
  const reach = metrics.reduce((sum, metric) => sum + numberValue(metric.reach), 0);
  const timeSeries = dateRange(filters.startDate, filters.endDate).map((date) => ({
    date,
    spendMicros: spendByDate.get(date) || 0,
    registrations: conversions.byDate.get(date) || 0,
    platformClicks: clickByDate.get(date) || 0,
    trackedClicks: clicks.byDate.get(date) || 0,
    impressions: impressionByDate.get(date) || 0,
  }));
  const qualityIssues: AdsQualityIssue[] = [];

  for (const connector of connectorStatus) {
    if (!connector.configured) {
      qualityIssues.push({
        level: "warning",
        title: `${connector.label} is not connected`,
        body: `Missing ${connector.missingConfig.join(", ")}.`,
      });
      continue;
    }

    if (connector.platform === "x" && connector.label.includes("local export")) {
      qualityIssues.push({
        level: "info",
        title: "X is using the local bulk export",
        body: "Sync uses the exported campaign budget as a spend proxy until X Ads API credentials are configured.",
      });
    }

    if (!connector.lastSyncAt) {
      qualityIssues.push({
        level: "info",
        title: `${connector.label} has not synced yet`,
        body: "Run Sync now after credentials are configured.",
      });
      continue;
    }

    if (connector.lastStatus === "error") {
      qualityIssues.push({
        level: "error",
        title: `${connector.label} sync failed`,
        body: connector.lastError || "The latest sync ended with an error.",
      });
    } else if (now - new Date(connector.lastSyncAt).getTime() > 24 * 60 * 60 * 1000) {
      qualityIssues.push({
        level: "warning",
        title: `${connector.label} data is stale`,
        body: "The latest sync is more than 24 hours old.",
      });
    }
  }

  if (unmappedSpendMicros > 0) {
    qualityIssues.push({
      level: "warning",
      title: "Some spend is unmapped",
      body: "Add UTM mappings for rows with spend but missing event, campaign, or creative tracking.",
    });
  }

  if (conversions.unmatched > 0) {
    qualityIssues.push({
      level: "warning",
      title: "Some registrations did not match a click",
      body: `${conversions.unmatched} paid-social registration${
        conversions.unmatched === 1 ? "" : "s"
      } had no stored click id.`,
    });
  }

  if (provisionalSpendMicros > 0) {
    qualityIssues.push({
      level: "info",
      title: "Recent X spend is provisional",
      body: "X billing metrics can settle for up to three days after delivery.",
    });
  }

  return {
    filters,
    connectorStatus,
    totals: {
      spendMicros,
      impressions,
      reach,
      platformClicks,
      trackedClicks: clicks.total,
      registrations: conversions.total,
      cpcMicros: microsPer(spendMicros, platformClicks),
      cpmMicros:
        impressions > 0 ? Math.round((spendMicros * 1000) / impressions) : null,
      ctr: ratioFrom(platformClicks, impressions),
      conversionRate: ratioFrom(conversions.total, clicks.total),
      costPerRegistrationMicros: microsPer(spendMicros, conversions.total),
      unmappedSpendMicros,
      provisionalSpendMicros,
      unmatchedConversions: conversions.unmatched,
    },
    timeSeries,
    platformBreakdown,
    creativeRows,
    campaignRows,
    unmappedRows,
    options: {
      platforms: [
        { value: "all", label: "All platforms" },
        { value: "meta", label: "Meta" },
        { value: "x", label: "X" },
      ],
      events: Array.from(optionEvents.entries()).map(([value, label]) => ({
        value,
        label,
      })),
      campaigns: Array.from(optionsCampaigns.entries()).map(([value, label]) => ({
        value,
        label,
      })),
      creatives: Array.from(optionsCreatives.entries()).map(([value, label]) => ({
        value,
        label,
      })),
    },
    qualityIssues,
  };
}

export async function startAdSyncRun(
  platform: AdPlatform,
  range: { startDate: string; endDate: string },
  metadata: unknown = {}
) {
  const { rows } = await query<{ sync_run_id: string }>(
    `
      INSERT INTO ad_sync_runs (platform, status, range_start, range_end, metadata)
      VALUES ($1, 'running', $2::date, $3::date, $4::jsonb)
      RETURNING sync_run_id
    `,
    [platform, range.startDate, range.endDate, JSON.stringify(metadata)]
  );

  return rows[0].sync_run_id;
}

export async function finishAdSyncRun(input: {
  syncRunId: string;
  status: "success" | "skipped" | "error";
  rowsSynced: number;
  error?: string | null;
  warnings?: string[];
  metadata?: unknown;
}) {
  await query(
    `
      UPDATE ad_sync_runs
      SET status = $2,
          rows_synced = $3,
          error = $4,
          warnings = $5::jsonb,
          metadata = COALESCE($6::jsonb, metadata),
          finished_at = now()
      WHERE sync_run_id = $1
    `,
    [
      input.syncRunId,
      input.status,
      input.rowsSynced,
      input.error || null,
      JSON.stringify(input.warnings || []),
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
}

export async function upsertAdMetrics(metrics: AdMetricInput[]) {
  if (metrics.length === 0) {
    return 0;
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    for (const metric of metrics) {
      if (metric.accountId) {
        await client.query(
          `
            INSERT INTO ad_platform_accounts (
              platform, account_id, account_name, currency, metadata
            )
            VALUES ($1, $2, $3, $4, '{}'::jsonb)
            ON CONFLICT (platform, account_id) DO UPDATE
            SET account_name = COALESCE(EXCLUDED.account_name, ad_platform_accounts.account_name),
                currency = COALESCE(EXCLUDED.currency, ad_platform_accounts.currency)
          `,
          [metric.platform, metric.accountId, metric.accountName || null, metric.currency || null]
        );
      }

      if (metric.platformCampaignId && metric.campaignName) {
        await client.query(
          `
            INSERT INTO ad_campaigns (
              platform, platform_campaign_id, account_id, campaign_name, metadata
            )
            VALUES ($1, $2, $3, $4, '{}'::jsonb)
            ON CONFLICT (platform, platform_campaign_id) DO UPDATE
            SET account_id = COALESCE(EXCLUDED.account_id, ad_campaigns.account_id),
                campaign_name = EXCLUDED.campaign_name
          `,
          [
            metric.platform,
            metric.platformCampaignId,
            metric.accountId || null,
            metric.campaignName,
          ]
        );
      }

      if (metric.platformAdGroupId && metric.adGroupName) {
        await client.query(
          `
            INSERT INTO ad_ad_groups (
              platform, platform_ad_group_id, platform_campaign_id, account_id, ad_group_name, metadata
            )
            VALUES ($1, $2, $3, $4, $5, '{}'::jsonb)
            ON CONFLICT (platform, platform_ad_group_id) DO UPDATE
            SET platform_campaign_id = COALESCE(EXCLUDED.platform_campaign_id, ad_ad_groups.platform_campaign_id),
                account_id = COALESCE(EXCLUDED.account_id, ad_ad_groups.account_id),
                ad_group_name = EXCLUDED.ad_group_name
          `,
          [
            metric.platform,
            metric.platformAdGroupId,
            metric.platformCampaignId || null,
            metric.accountId || null,
            metric.adGroupName,
          ]
        );
      }

      if (metric.platformAdId && metric.adName) {
        await client.query(
          `
            INSERT INTO ad_ads (
              platform, platform_ad_id, platform_campaign_id, platform_ad_group_id,
              account_id, ad_name, event_slug, utm_source, utm_campaign, utm_content,
              creative_headline, creative_body, creative_image_url, creative_image_label,
              creative_format, creative_theme, destination_url, metadata
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, '{}'::jsonb
            )
            ON CONFLICT (platform, platform_ad_id) DO UPDATE
            SET platform_campaign_id = COALESCE(EXCLUDED.platform_campaign_id, ad_ads.platform_campaign_id),
                platform_ad_group_id = COALESCE(EXCLUDED.platform_ad_group_id, ad_ads.platform_ad_group_id),
                account_id = COALESCE(EXCLUDED.account_id, ad_ads.account_id),
                ad_name = EXCLUDED.ad_name,
                event_slug = COALESCE(EXCLUDED.event_slug, ad_ads.event_slug),
                utm_source = COALESCE(EXCLUDED.utm_source, ad_ads.utm_source),
                utm_campaign = COALESCE(EXCLUDED.utm_campaign, ad_ads.utm_campaign),
                utm_content = COALESCE(EXCLUDED.utm_content, ad_ads.utm_content),
                creative_headline = COALESCE(EXCLUDED.creative_headline, ad_ads.creative_headline),
                creative_body = COALESCE(EXCLUDED.creative_body, ad_ads.creative_body),
                creative_image_url = COALESCE(EXCLUDED.creative_image_url, ad_ads.creative_image_url),
                creative_image_label = COALESCE(EXCLUDED.creative_image_label, ad_ads.creative_image_label),
                creative_format = COALESCE(EXCLUDED.creative_format, ad_ads.creative_format),
                creative_theme = COALESCE(EXCLUDED.creative_theme, ad_ads.creative_theme),
                destination_url = COALESCE(EXCLUDED.destination_url, ad_ads.destination_url)
          `,
          [
            metric.platform,
            metric.platformAdId,
            metric.platformCampaignId || null,
            metric.platformAdGroupId || null,
            metric.accountId || null,
            metric.adName,
            metric.eventSlug || null,
            metric.utmSource || null,
            metric.utmCampaign || null,
            metric.utmContent || null,
            metric.creativeHeadline || null,
            metric.creativeBody || null,
            metric.creativeImageUrl || null,
            metric.creativeImageLabel || null,
            metric.creativeFormat || null,
            metric.creativeTheme || null,
            metric.destinationUrl || null,
          ]
        );
      }

      await client.query(
        `
          INSERT INTO ad_daily_metrics (
            metric_id,
            platform,
            metric_date,
            account_id,
            account_name,
            currency,
            platform_campaign_id,
            campaign_name,
            platform_ad_group_id,
            ad_group_name,
            platform_ad_id,
            ad_name,
            creative_headline,
            creative_body,
            creative_image_url,
            creative_image_label,
            creative_format,
            creative_theme,
            destination_url,
            placement,
            event_slug,
            utm_source,
            utm_campaign,
            utm_content,
            spend_micros,
            impressions,
            reach,
            clicks,
            cpc_micros,
            cpm_micros,
            ctr,
            provisional,
            raw
          )
          VALUES (
            $1, $2, $3::date, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24,
            $25, $26, $27, $28, $29, $30, $31, $32,
            $33::jsonb
          )
          ON CONFLICT (metric_id) DO UPDATE
          SET account_name = EXCLUDED.account_name,
              currency = EXCLUDED.currency,
              campaign_name = EXCLUDED.campaign_name,
              ad_group_name = EXCLUDED.ad_group_name,
              ad_name = EXCLUDED.ad_name,
              creative_headline = EXCLUDED.creative_headline,
              creative_body = EXCLUDED.creative_body,
              creative_image_url = EXCLUDED.creative_image_url,
              creative_image_label = EXCLUDED.creative_image_label,
              creative_format = EXCLUDED.creative_format,
              creative_theme = EXCLUDED.creative_theme,
              destination_url = EXCLUDED.destination_url,
              placement = EXCLUDED.placement,
              event_slug = EXCLUDED.event_slug,
              utm_source = EXCLUDED.utm_source,
              utm_campaign = EXCLUDED.utm_campaign,
              utm_content = EXCLUDED.utm_content,
              spend_micros = EXCLUDED.spend_micros,
              impressions = EXCLUDED.impressions,
              reach = EXCLUDED.reach,
              clicks = EXCLUDED.clicks,
              cpc_micros = EXCLUDED.cpc_micros,
              cpm_micros = EXCLUDED.cpm_micros,
              ctr = EXCLUDED.ctr,
              provisional = EXCLUDED.provisional,
              raw = EXCLUDED.raw
        `,
        [
          metric.metricId,
          metric.platform,
          metric.metricDate,
          metric.accountId || null,
          metric.accountName || null,
          metric.currency || null,
          metric.platformCampaignId || null,
          metric.campaignName || null,
          metric.platformAdGroupId || null,
          metric.adGroupName || null,
          metric.platformAdId || null,
          metric.adName || null,
          metric.creativeHeadline || null,
          metric.creativeBody || null,
          metric.creativeImageUrl || null,
          metric.creativeImageLabel || null,
          metric.creativeFormat || null,
          metric.creativeTheme || null,
          metric.destinationUrl || null,
          metric.placement || null,
          metric.eventSlug || null,
          metric.utmSource || null,
          metric.utmCampaign || null,
          metric.utmContent || null,
          metric.spendMicros,
          metric.impressions,
          metric.reach ?? null,
          metric.clicks,
          metric.cpcMicros ?? null,
          metric.cpmMicros ?? null,
          metric.ctr ?? null,
          Boolean(metric.provisional),
          JSON.stringify(metric.raw || {}),
        ]
      );
    }

    await client.query("COMMIT");
    return metrics.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteAdMetricsForPlatformRange(input: {
  platform: AdPlatform;
  range: { startDate: string; endDate: string };
  rawSource?: string;
}) {
  const params: unknown[] = [
    input.platform,
    input.range.startDate,
    input.range.endDate,
  ];
  const sourceFilter = input.rawSource
    ? (() => {
        params.push(input.rawSource);
        return `AND raw->>'source' = $${params.length}`;
      })()
    : "";

  await query(
    `
      DELETE FROM ad_daily_metrics
      WHERE platform = $1
        AND metric_date BETWEEN $2::date AND $3::date
        ${sourceFilter}
    `,
    params
  );
}

function mapMapping(row: MappingRow): AdsMapping {
  return {
    mappingId: row.mapping_id,
    platform: row.platform,
    platformCampaignId: row.platform_campaign_id,
    platformAdGroupId: row.platform_ad_group_id,
    platformAdId: row.platform_ad_id,
    eventSlug: row.event_slug,
    utmSource: row.utm_source,
    utmCampaign: row.utm_campaign,
    utmContent: row.utm_content,
    notes: row.notes,
    createdAt: isoDateTime(row.created_at) as string,
    updatedAt: isoDateTime(row.updated_at) as string,
  };
}

export async function getAdMappings() {
  if (!hasDatabaseConfig()) {
    return [];
  }

  const { rows } = await query<MappingRow>(
    `
      SELECT *
      FROM ad_utm_mappings
      ORDER BY updated_at DESC
    `
  );

  return rows.map(mapMapping);
}

export async function upsertAdMapping(input: {
  mappingId?: string | null;
  platform: AdPlatform;
  platformCampaignId?: string | null;
  platformAdGroupId?: string | null;
  platformAdId?: string | null;
  eventSlug?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  notes?: string | null;
}) {
  const params = [
    input.platform,
    input.platformCampaignId || null,
    input.platformAdGroupId || null,
    input.platformAdId || null,
    input.eventSlug || null,
    input.utmSource || null,
    input.utmCampaign || null,
    input.utmContent || null,
    input.notes || null,
  ];

  if (input.mappingId) {
    const { rows } = await query<MappingRow>(
      `
        UPDATE ad_utm_mappings
        SET platform = $2,
            platform_campaign_id = $3,
            platform_ad_group_id = $4,
            platform_ad_id = $5,
            event_slug = $6,
            utm_source = $7,
            utm_campaign = $8,
            utm_content = $9,
            notes = $10
        WHERE mapping_id = $1
        RETURNING *
      `,
      [input.mappingId, ...params]
    );

    if (rows[0]) {
      return mapMapping(rows[0]);
    }
  }

  const existing = await query<MappingRow>(
    `
      SELECT *
      FROM ad_utm_mappings
      WHERE platform = $1
        AND COALESCE(platform_campaign_id, '') = COALESCE($2, '')
        AND COALESCE(platform_ad_group_id, '') = COALESCE($3, '')
        AND COALESCE(platform_ad_id, '') = COALESCE($4, '')
      LIMIT 1
    `,
    params.slice(0, 4)
  );

  if (existing.rows[0]) {
    const { rows } = await query<MappingRow>(
      `
        UPDATE ad_utm_mappings
        SET event_slug = $5,
            utm_source = $6,
            utm_campaign = $7,
            utm_content = $8,
            notes = $9
        WHERE mapping_id = $10
        RETURNING *
      `,
      [...params, existing.rows[0].mapping_id]
    );

    return mapMapping(rows[0]);
  }

  const { rows } = await query<MappingRow>(
    `
      INSERT INTO ad_utm_mappings (
        platform,
        platform_campaign_id,
        platform_ad_group_id,
        platform_ad_id,
        event_slug,
        utm_source,
        utm_campaign,
        utm_content,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    params
  );

  return mapMapping(rows[0]);
}

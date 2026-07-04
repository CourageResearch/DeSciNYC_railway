export type AdPlatform = "meta" | "x";

export type AdsDateRange = {
  startDate: string;
  endDate: string;
};

export type AdsFilters = AdsDateRange & {
  platform?: AdPlatform | "all";
  eventSlug?: string;
  campaignId?: string;
  adId?: string;
};

export type ConnectorStatus = {
  platform: AdPlatform;
  configured: boolean;
  label: string;
  lastSyncAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  rowsSynced: number;
  missingConfig: string[];
};

export type AdsTotals = {
  spendMicros: number;
  impressions: number;
  reach: number;
  platformClicks: number;
  trackedClicks: number;
  registrations: number;
  cpcMicros: number | null;
  cpmMicros: number | null;
  ctr: number | null;
  conversionRate: number | null;
  costPerRegistrationMicros: number | null;
  unmappedSpendMicros: number;
  provisionalSpendMicros: number;
  unmatchedConversions: number;
};

export type AdsTimePoint = {
  date: string;
  spendMicros: number;
  registrations: number;
  platformClicks: number;
  trackedClicks: number;
  impressions: number;
};

export type AdsBreakdownRow = {
  key: string;
  platform: string;
  eventSlug: string | null;
  campaignId: string | null;
  campaignName: string;
  adGroupId: string | null;
  adGroupName: string | null;
  adId: string | null;
  adName: string | null;
  creativeHeadline: string | null;
  creativeBody: string | null;
  creativeImageUrl: string | null;
  creativeImageLabel: string | null;
  creativeFormat: string | null;
  creativeTheme: string | null;
  destinationUrl: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  campaignCount: number;
  spendMicros: number;
  impressions: number;
  reach: number;
  platformClicks: number;
  trackedClicks: number;
  registrations: number;
  cpcMicros: number | null;
  cpmMicros: number | null;
  ctr: number | null;
  conversionRate: number | null;
  costPerRegistrationMicros: number | null;
  provisional: boolean;
  lastMetricDate: string | null;
};

export type AdsOption = {
  value: string;
  label: string;
};

export type AdsQualityIssue = {
  level: "info" | "warning" | "error";
  title: string;
  body: string;
};

export type AdsMapping = {
  mappingId: string;
  platform: AdPlatform;
  platformCampaignId: string | null;
  platformAdGroupId: string | null;
  platformAdId: string | null;
  eventSlug: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdsSummaryResponse = {
  filters: AdsFilters;
  connectorStatus: ConnectorStatus[];
  totals: AdsTotals;
  timeSeries: AdsTimePoint[];
  platformBreakdown: AdsBreakdownRow[];
  creativeRows: AdsBreakdownRow[];
  campaignRows: AdsBreakdownRow[];
  unmappedRows: AdsBreakdownRow[];
  options: {
    platforms: AdsOption[];
    events: AdsOption[];
    campaigns: AdsOption[];
    creatives: AdsOption[];
  };
  qualityIssues: AdsQualityIssue[];
};

export type SyncPlatformResult = {
  platform: AdPlatform;
  configured: boolean;
  status: "success" | "skipped" | "error";
  rowsSynced: number;
  warnings: string[];
  error: string | null;
  missingConfig: string[];
};

export type AdsSyncResponse = {
  ok: boolean;
  range: AdsDateRange;
  results: SyncPlatformResult[];
};

export type AdMetricInput = {
  metricId: string;
  platform: AdPlatform;
  metricDate: string;
  accountId?: string | null;
  accountName?: string | null;
  currency?: string | null;
  platformCampaignId?: string | null;
  campaignName?: string | null;
  platformAdGroupId?: string | null;
  adGroupName?: string | null;
  platformAdId?: string | null;
  adName?: string | null;
  creativeHeadline?: string | null;
  creativeBody?: string | null;
  creativeImageUrl?: string | null;
  creativeImageLabel?: string | null;
  creativeFormat?: string | null;
  creativeTheme?: string | null;
  destinationUrl?: string | null;
  placement?: string | null;
  eventSlug?: string | null;
  utmSource?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  spendMicros: number;
  impressions: number;
  reach?: number | null;
  clicks: number;
  cpcMicros?: number | null;
  cpmMicros?: number | null;
  ctr?: number | null;
  provisional?: boolean;
  raw: unknown;
};

import type { AdsDateRange, AdsEventReport, AdsFilters, AdsTotals } from "./ads-types";

type EventInfo = { slug: string; title: string; startsAt: string };
type EventMetric = {
  eventSlug: string | null;
  date: string;
  spendMicros: number;
  impressions: number;
  clicks: number;
  reach: number;
  provisional: boolean;
  unmapped: boolean;
};
type EventAttribution = {
  eventSlug: string | null;
  date: string;
  count: number;
  revenueMicros?: number;
  unmatched?: number;
};

export function adsReportingToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

function emptyTotals(): AdsTotals {
  return {
    spendMicros: 0, revenueMicros: 0, impressions: 0, reach: 0,
    platformClicks: 0, trackedClicks: 0, registrations: 0,
    cpcMicros: null, cpmMicros: null, ctr: null, conversionRate: null,
    costPerRegistrationMicros: null, roas: null, unmappedSpendMicros: 0,
    provisionalSpendMicros: 0, unmatchedConversions: 0,
  };
}

export function buildAdsEventReports(input: {
  events: EventInfo[];
  range: AdsDateRange;
  metrics: EventMetric[];
  clicks: EventAttribution[];
  conversions: EventAttribution[];
  now?: Date;
}): AdsEventReport[] {
  const today = adsReportingToday(input.now);
  const reports = new Map<string, AdsEventReport>();
  const firstActivity = new Map<string, string>();
  for (const event of input.events) {
    reports.set(event.slug, {
      eventSlug: event.slug, title: event.title, startsAt: event.startsAt,
      status: adsReportingToday(new Date(event.startsAt)) >= today ? "upcoming" : "past",
      range: { ...input.range }, totals: emptyTotals(),
    });
  }
  const getReport = (slug: string | null, date: string) => {
    const key = slug || "";
    if (!reports.has(key)) {
      reports.set(key, {
        eventSlug: key, title: slug || "Unassigned event", startsAt: null,
        status: "unassigned", range: { ...input.range }, totals: emptyTotals(),
      });
    }
    const first = firstActivity.get(key);
    if (!first || date < first) firstActivity.set(key, date);
    return reports.get(key)!;
  };
  for (const metric of input.metrics) {
    const totals = getReport(metric.eventSlug, metric.date).totals;
    totals.spendMicros += metric.spendMicros;
    totals.impressions += metric.impressions;
    totals.platformClicks += metric.clicks;
    totals.reach += metric.reach;
    if (metric.provisional) totals.provisionalSpendMicros += metric.spendMicros;
    if (metric.unmapped) totals.unmappedSpendMicros += metric.spendMicros;
  }
  for (const click of input.clicks) {
    getReport(click.eventSlug, click.date).totals.trackedClicks += click.count;
  }
  for (const conversion of input.conversions) {
    const totals = getReport(conversion.eventSlug, conversion.date).totals;
    totals.registrations += conversion.count;
    totals.revenueMicros += conversion.revenueMicros || 0;
    totals.unmatchedConversions += conversion.unmatched || 0;
  }
  const ratio = (a: number, b: number) => b > 0 ? a / b : null;
  const cost = (a: number, b: number) => b > 0 ? Math.round(a / b) : null;
  for (const report of reports.values()) {
    const t = report.totals;
    t.cpcMicros = cost(t.spendMicros, t.platformClicks);
    t.cpmMicros = cost(t.spendMicros * 1000, t.impressions);
    t.ctr = ratio(t.platformClicks, t.impressions);
    t.conversionRate = ratio(t.registrations, t.trackedClicks);
    t.costPerRegistrationMicros = cost(t.spendMicros, t.registrations);
    t.roas = ratio(t.revenueMicros, t.spendMicros);
    const first = firstActivity.get(report.eventSlug) || input.range.endDate;
    report.range.startDate = first < input.range.startDate ? input.range.startDate : first;
  }
  return Array.from(reports.values()).sort((a, b) =>
    (b.startsAt || "").localeCompare(a.startsAt || "") || a.title.localeCompare(b.title)
  );
}

export function defaultAdsEventSlug(reports: AdsEventReport[]) {
  const upcoming = reports.filter(r => r.status === "upcoming")
    .sort((a, b) => (a.startsAt || "").localeCompare(b.startsAt || ""));
  const latest = reports.filter(r => r.startsAt)
    .sort((a, b) => b.startsAt!.localeCompare(a.startsAt!));
  return (upcoming[0] || latest[0])?.eventSlug;
}

export function filtersForAdsEvent(
  reports: AdsEventReport[], eventSlug: string | undefined,
  allRange: AdsDateRange, platform: AdsFilters["platform"] = "all"
): AdsFilters {
  const report = reports.find(r => r.eventSlug === eventSlug);
  return { ...(report?.range || allRange), platform, eventSlug: report?.eventSlug || undefined };
}

export function resolveAdsPageFilters(
  reports: AdsEventReport[], allRange: AdsDateRange,
  params: Record<string, string | string[] | undefined>
): AdsFilters {
  const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key];
  const requested = first("eventSlug");
  const eventSlug = requested === "all" ? undefined
    : reports.find(r => r.eventSlug && r.eventSlug === requested)?.eventSlug || defaultAdsEventSlug(reports);
  const platform = first("platform");
  const defaults = filtersForAdsEvent(reports, eventSlug, allRange,
    platform === "meta" || platform === "x" ? platform : "all");
  const date = (key: string, fallback: string) => {
    const value = first(key);
    return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && !Number.isNaN(Date.parse(value)) ? value : fallback;
  };
  const start = date("startDate", defaults.startDate);
  const startDate = start < allRange.startDate ? allRange.startDate : start;
  const endDate = date("endDate", defaults.endDate);
  return {
    ...defaults, ...(startDate <= endDate ? {startDate, endDate} : {}),
    campaignId: first("campaignId") || undefined, adId: first("adId") || undefined,
  };
}

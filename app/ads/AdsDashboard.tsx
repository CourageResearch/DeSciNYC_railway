"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  ImageIcon,
  MousePointerClick,
  RefreshCw,
  Save,
  Shield,
  TicketCheck,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import type {
  AdsBreakdownRow,
  AdsSummaryResponse,
  AdsSyncResponse,
} from "@/lib/ads-types";

type AdsDashboardProps = {
  initialSummary: AdsSummaryResponse;
};

type MappingDraft = {
  eventSlug: string;
  utmSource: string;
  utmCampaign: string;
  utmContent: string;
};

const PLATFORM_COLORS: Record<string, string> = {
  meta: "#46C2FF",
  x: "#D7F171",
};

const MONEY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const MONEY_FORMAT_PRECISE = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

function money(micros: number | null | undefined, precise = false) {
  if (micros === null || micros === undefined) {
    return "n/a";
  }

  const value = micros / 1_000_000;
  return (precise || Math.abs(value) < 100
    ? MONEY_FORMAT_PRECISE
    : MONEY_FORMAT
  ).format(value);
}

function percent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `${(value * 100).toFixed(value < 0.01 ? 2 : 1)}%`;
}

function multiplier(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "n/a";
  }

  return `${value.toFixed(value < 10 ? 2 : 1)}x`;
}

function compact(value: number | null | undefined) {
  return NUMBER_FORMAT.format(value || 0);
}

function buildQuery(summary: AdsSummaryResponse) {
  const params = new URLSearchParams();
  params.set("startDate", summary.filters.startDate);
  params.set("endDate", summary.filters.endDate);

  if (summary.filters.platform && summary.filters.platform !== "all") {
    params.set("platform", summary.filters.platform);
  }

  if (summary.filters.eventSlug) {
    params.set("eventSlug", summary.filters.eventSlug);
  }

  if (summary.filters.campaignId) {
    params.set("campaignId", summary.filters.campaignId);
  }

  if (summary.filters.adId) {
    params.set("adId", summary.filters.adId);
  }

  return params;
}

function platformLabel(platform: string) {
  if (platform === "meta") {
    return "Meta";
  }

  if (platform === "x") {
    return "X";
  }

  return platform;
}

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function creativeTitle(row: AdsBreakdownRow) {
  return (
    row.creativeHeadline ||
    row.creativeTheme ||
    row.creativeImageLabel ||
    row.utmContent ||
    row.adName ||
    row.adGroupName ||
    row.campaignName
  );
}

function creativeDetail(row: AdsBreakdownRow) {
  return [
    row.creativeTheme,
    row.creativeImageLabel,
    row.creativeFormat,
    row.utmContent,
  ]
    .filter(Boolean)
    .join(" / ");
}

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-h-28 border border-[#2A3B34] bg-[#0B100E] p-4">
      <div className="text-xs uppercase text-[#8BA59B]">{label}</div>
      <div className="mt-3 font-Jersey25 text-4xl leading-none text-white">
        {value}
      </div>
      {detail ? <div className="mt-2 text-xs text-[#B8C7C0]">{detail}</div> : null}
    </div>
  );
}

function CreativeInsightCard({
  icon,
  label,
  row,
  value,
}: {
  icon: ReactNode;
  label: string;
  row: AdsBreakdownRow | null;
  value: string;
}) {
  return (
    <div className="grid min-h-28 grid-cols-[auto_1fr] gap-3 border border-[#263932] bg-[#0C1310] p-4">
      <div className="flex h-10 w-10 items-center justify-center border border-[#345143] text-[#D7F171]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs uppercase text-[#8BA59B]">{label}</div>
        <div className="mt-2 font-Jersey10 text-3xl leading-none text-white">
          {value}
        </div>
        <div className="mt-2 truncate text-xs text-[#B8C7C0]">
          {row ? creativeTitle(row) : "No result yet"}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border border-[#22362F] bg-[#090D0B]">
      <div className="flex min-h-12 items-center justify-between border-b border-[#22362F] px-4">
        <h2 className="font-Jersey10 text-3xl text-[#D7F171]">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatusPill({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 border px-2 py-1 text-xs ${
        configured
          ? "border-[#335F42] text-[#D7F171]"
          : "border-[#775B20] text-[#F7C85C]"
      }`}
    >
      {configured ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      {configured ? "Connected" : "Setup needed"}
    </span>
  );
}

function MappingEditor({
  row,
  summary,
  onSaved,
}: {
  row: AdsBreakdownRow;
  summary: AdsSummaryResponse;
  onSaved: () => void;
}) {
  const firstEvent = summary.options.events[0]?.value || "";
  const [draft, setDraft] = useState<MappingDraft>({
    eventSlug: row.eventSlug || firstEvent,
    utmSource:
      row.utmSource ||
      (row.platform === "x" ? "twitter_ads" : "instagram_ads"),
    utmCampaign: row.utmCampaign || "",
    utmContent: row.utmContent || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof MappingDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/ads/mappings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: row.platform,
          platformCampaignId: row.campaignId,
          platformAdGroupId: row.adGroupId,
          platformAdId: row.adId,
          eventSlug: draft.eventSlug,
          utmSource: draft.utmSource,
          utmCampaign: draft.utmCampaign,
          utmContent: draft.utmContent,
          notes: `Mapped from /ads for ${row.campaignName}`,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Mapping failed");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mapping failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-3 border border-[#263932] bg-[#0C1310] p-3 lg:grid-cols-[1.1fr_1fr_1fr_1fr_auto]">
      <div>
        <div className="text-sm text-white">{row.campaignName}</div>
        <div className="text-xs text-[#8BA59B]">
          {platformLabel(row.platform)} / {row.adGroupName || "No ad group"} /{" "}
          {row.adName || "No ad"}
        </div>
      </div>
      <select
        value={draft.eventSlug}
        onChange={(event) => update("eventSlug", event.target.value)}
        className="h-10 border border-[#2A3B34] bg-[#060807] px-2 text-sm text-white"
      >
        {summary.options.events.map((event) => (
          <option key={event.value} value={event.value}>
            {event.label}
          </option>
        ))}
      </select>
      <input
        value={draft.utmCampaign}
        onChange={(event) => update("utmCampaign", event.target.value)}
        placeholder="utm_campaign"
        className="h-10 border border-[#2A3B34] bg-[#060807] px-2 text-sm text-white"
      />
      <input
        value={draft.utmContent}
        onChange={(event) => update("utmContent", event.target.value)}
        placeholder="utm_content"
        className="h-10 border border-[#2A3B34] bg-[#060807] px-2 text-sm text-white"
      />
      <Button
        type="button"
        onClick={save}
        disabled={saving}
        className="h-10 rounded-none bg-[#D7F171] px-3 text-black hover:bg-[#C5E35F]"
      >
        <Save size={16} />
        {saving ? "Saving" : "Save"}
      </Button>
      {error ? <div className="text-sm text-[#FF9B73] lg:col-span-5">{error}</div> : null}
    </div>
  );
}

export default function AdsDashboard({ initialSummary }: AdsDashboardProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const trendData = useMemo(
    () =>
      summary.timeSeries.map((point) => ({
        ...point,
        dateLabel: shortDate(point.date),
        spend: point.spendMicros / 1_000_000,
        revenue: point.revenueMicros / 1_000_000,
      })),
    [summary.timeSeries]
  );
  const platformData = useMemo(
    () =>
      summary.platformBreakdown.map((row) => ({
        name: platformLabel(row.platform),
        platform: row.platform,
        spend: row.spendMicros / 1_000_000,
        registrations: row.registrations,
      })),
    [summary.platformBreakdown]
  );
  const creativeRows = useMemo(
    () => summary.creativeRows.slice(0, 12),
    [summary.creativeRows]
  );
  const bestCpaCreative = useMemo(
    () =>
      summary.creativeRows
        .filter((row) => row.registrations > 0 && row.costPerRegistrationMicros)
        .sort(
          (a, b) =>
            (a.costPerRegistrationMicros || Number.MAX_SAFE_INTEGER) -
            (b.costPerRegistrationMicros || Number.MAX_SAFE_INTEGER)
        )[0] || null,
    [summary.creativeRows]
  );
  const mostClickedCreative = useMemo(
    () =>
      summary.creativeRows
        .slice()
        .sort(
          (a, b) =>
            b.trackedClicks +
            b.platformClicks -
            (a.trackedClicks + a.platformClicks)
        )[0] || null,
    [summary.creativeRows]
  );
  const bestConversionCreative = useMemo(
    () =>
      summary.creativeRows
        .filter((row) => row.trackedClicks > 0 && row.conversionRate !== null)
        .sort((a, b) => (b.conversionRate || 0) - (a.conversionRate || 0))[0] ||
      null,
    [summary.creativeRows]
  );

  const refresh = async (nextSummary = summary) => {
    setLoading(true);
    setError("");

    try {
      const query = buildQuery(nextSummary);
      const response = await fetch(`/api/ads/summary?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load ads dashboard");
      }

      setSummary(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ads dashboard");
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key: keyof AdsSummaryResponse["filters"], value: string) => {
    setSummary((current) => ({
      ...current,
      filters: {
        ...current.filters,
        [key]: value || undefined,
      },
    }));
  };

  const applyFilters = () => refresh();

  const syncNow = async () => {
    setSyncing(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch("/api/ads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: summary.filters.startDate,
          endDate: summary.filters.endDate,
          platform: summary.filters.platform || "all",
        }),
      });
      const body = (await response.json()) as AdsSyncResponse & { error?: string };

      if (!response.ok) {
        throw new Error(body.error || "Sync failed");
      }

      const rows = body.results.reduce((sum, result) => sum + result.rowsSynced, 0);
      const skipped = body.results
        .filter((result) => result.status === "skipped")
        .map((result) => platformLabel(result.platform));
      setNotice(
        skipped.length > 0
          ? `Synced ${compact(rows)} rows. ${skipped.join(", ")} still needs setup.`
          : `Synced ${compact(rows)} rows.`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#060807] text-white">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-6 md:px-6">
        <section className="border border-[#22362F] bg-[#0A0F0C]">
          <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase text-[#8BA59B]">
                <span className="inline-flex items-center gap-2">
                  <Shield size={16} />
                  Admin
                </span>
                <span>Paid social</span>
              </div>
              <h1 className="mt-3 font-Jersey25 text-6xl leading-none text-[#D7F171] md:text-7xl">
                Ads dashboard
              </h1>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {summary.connectorStatus.map((connector) => (
                <div
                  key={connector.platform}
                  className="min-w-56 border border-[#24382F] bg-[#070B09] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-white">{connector.label}</div>
                    <StatusPill configured={connector.configured} />
                  </div>
                  <div className="mt-2 text-xs text-[#8BA59B]">
                    {connector.lastSyncAt
                      ? `Last sync ${new Date(connector.lastSyncAt).toLocaleString()}`
                      : "No sync yet"}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 border-t border-[#22362F] p-4 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto_auto]">
            <label className="grid gap-1 text-xs uppercase text-[#8BA59B]">
              Start
              <input
                type="date"
                value={summary.filters.startDate}
                onChange={(event) => updateFilter("startDate", event.target.value)}
                className="h-10 border border-[#2A3B34] bg-[#060807] px-2 text-sm text-white"
              />
            </label>
            <label className="grid gap-1 text-xs uppercase text-[#8BA59B]">
              End
              <input
                type="date"
                value={summary.filters.endDate}
                onChange={(event) => updateFilter("endDate", event.target.value)}
                className="h-10 border border-[#2A3B34] bg-[#060807] px-2 text-sm text-white"
              />
            </label>
            <label className="grid gap-1 text-xs uppercase text-[#8BA59B]">
              Platform
              <select
                value={summary.filters.platform || "all"}
                onChange={(event) => updateFilter("platform", event.target.value)}
                className="h-10 border border-[#2A3B34] bg-[#060807] px-2 text-sm text-white"
              >
                {summary.options.platforms.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs uppercase text-[#8BA59B]">
              Event
              <select
                value={summary.filters.eventSlug || ""}
                onChange={(event) => updateFilter("eventSlug", event.target.value)}
                className="h-10 border border-[#2A3B34] bg-[#060807] px-2 text-sm text-white"
              >
                <option value="">All events</option>
                {summary.options.events.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs uppercase text-[#8BA59B]">
              Campaign
              <select
                value={summary.filters.campaignId || ""}
                onChange={(event) => updateFilter("campaignId", event.target.value)}
                className="h-10 border border-[#2A3B34] bg-[#060807] px-2 text-sm text-white"
              >
                <option value="">All campaigns</option>
                {summary.options.campaigns.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              onClick={applyFilters}
              disabled={loading}
              className="h-10 self-end rounded-none border border-[#2A3B34] bg-[#121B16] text-white hover:bg-[#1A281F]"
            >
              <Filter size={16} />
              {loading ? "Loading" : "Apply"}
            </Button>
            <Button
              type="button"
              onClick={syncNow}
              disabled={syncing}
              className="h-10 self-end rounded-none bg-[#D7F171] text-black hover:bg-[#C5E35F]"
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing" : "Sync now"}
            </Button>
          </div>
        </section>

        {notice ? (
          <div className="border border-[#335F42] bg-[#0D1711] px-4 py-3 text-sm text-[#D7F171]">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="border border-[#724333] bg-[#190D0A] px-4 py-3 text-sm text-[#FFB199]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            label="Cost per registration"
            value={money(summary.totals.costPerRegistrationMicros, true)}
            detail={`${compact(summary.totals.registrations)} registrations`}
          />
          <KpiCard
            label="Spend"
            value={money(summary.totals.spendMicros)}
            detail={`${compact(summary.totals.impressions)} impressions`}
          />
          <KpiCard
            label="Revenue"
            value={money(summary.totals.revenueMicros)}
            detail={`ROAS ${multiplier(summary.totals.roas)}`}
          />
          <KpiCard
            label="ROAS"
            value={multiplier(summary.totals.roas)}
            detail={`${money(summary.totals.revenueMicros)} revenue`}
          />
          <KpiCard
            label="Tracked conversion"
            value={percent(summary.totals.conversionRate)}
            detail={`${compact(summary.totals.trackedClicks)} tracked clicks`}
          />
          <KpiCard
            label="Platform clicks"
            value={compact(summary.totals.platformClicks)}
            detail={`CPC ${money(summary.totals.cpcMicros, true)} / CTR ${percent(
              summary.totals.ctr
            )}`}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
          <Panel title="Daily movement">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid stroke="#1D3028" vertical={false} />
                  <XAxis dataKey="dateLabel" stroke="#8BA59B" tickLine={false} />
                  <YAxis yAxisId="left" stroke="#8BA59B" tickLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#8BA59B"
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#080D0B",
                      border: "1px solid #2A3B34",
                      color: "#fff",
                    }}
                    formatter={(value, name) =>
                      name === "spend" || name === "revenue"
                        ? [
                            MONEY_FORMAT_PRECISE.format(Number(value)),
                            name === "spend" ? "Spend" : "Revenue",
                          ]
                        : [compact(Number(value)), String(name)]
                    }
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="spend"
                    stroke="#D7F171"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#FFB199"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="registrations"
                    stroke="#46C2FF"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel title="Platform mix">
            <div className="grid gap-4 md:grid-cols-[220px_1fr] xl:grid-cols-1">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData}
                      dataKey="spend"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={4}
                    >
                      {platformData.map((entry) => (
                        <Cell
                          key={entry.platform}
                          fill={PLATFORM_COLORS[entry.platform] || "#9AA8FF"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#080D0B",
                        border: "1px solid #2A3B34",
                        color: "#fff",
                      }}
                      formatter={(value) => [
                        MONEY_FORMAT_PRECISE.format(Number(value)),
                        "Spend",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2">
                {summary.platformBreakdown.map((row) => (
                  <div
                    key={row.platform}
                    className="grid grid-cols-[1fr_auto] gap-3 border border-[#263932] bg-[#0C1310] p-3 text-sm"
                  >
                    <div>
                      <div className="text-white">{platformLabel(row.platform)}</div>
                      <div className="text-xs text-[#8BA59B]">
                        {compact(row.registrations)} registrations
                      </div>
                    </div>
                    <div className="text-right">
                      <div>{money(row.spendMicros)}</div>
                      <div className="text-xs text-[#8BA59B]">
                        CPA {money(row.costPerRegistrationMicros, true)}
                      </div>
                      <div className="text-xs text-[#8BA59B]">
                        ROAS {multiplier(row.roas)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </section>

        <Panel title="Creative lab">
          {summary.creativeRows.length === 0 ? (
            <div className="border border-dashed border-[#2A3B34] p-8 text-center text-sm text-[#8BA59B]">
              No creative-level metrics in this range.
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <CreativeInsightCard
                  icon={<TicketCheck size={18} />}
                  label="Best CPA"
                  row={bestCpaCreative}
                  value={money(
                    bestCpaCreative?.costPerRegistrationMicros ?? null,
                    true
                  )}
                />
                <CreativeInsightCard
                  icon={<MousePointerClick size={18} />}
                  label="Most clicked"
                  row={mostClickedCreative}
                  value={compact(
                    (mostClickedCreative?.trackedClicks || 0) +
                      (mostClickedCreative?.platformClicks || 0)
                  )}
                />
                <CreativeInsightCard
                  icon={<RefreshCw size={18} />}
                  label="Best click to reg"
                  row={bestConversionCreative}
                  value={percent(bestConversionCreative?.conversionRate ?? null)}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1320px] border-collapse text-sm">
                  <thead className="text-left text-xs uppercase text-[#8BA59B]">
                    <tr className="border-b border-[#22362F]">
                      <th className="px-3 py-2">Style combo</th>
                      <th className="px-3 py-2">Platform</th>
                      <th className="px-3 py-2 text-right">Spend</th>
                      <th className="px-3 py-2 text-right">Tracked clicks</th>
                      <th className="px-3 py-2 text-right">Platform clicks</th>
                      <th className="px-3 py-2 text-right">Regs</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                      <th className="px-3 py-2 text-right">CPA</th>
                      <th className="px-3 py-2 text-right">ROAS</th>
                      <th className="px-3 py-2 text-right">CVR</th>
                      <th className="px-3 py-2 text-right">CTR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creativeRows.map((row) => (
                      <tr key={row.key} className="border-b border-[#17251F]">
                        <td className="px-3 py-3">
                          <div className="grid grid-cols-[44px_1fr] gap-3">
                            {row.creativeImageUrl ? (
                              <div
                                aria-label={row.creativeImageLabel || "Creative image"}
                                className="h-11 w-11 border border-[#2A3B34] bg-cover bg-center"
                                role="img"
                                style={{
                                  backgroundImage: `url("${row.creativeImageUrl}")`,
                                }}
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center border border-[#2A3B34] text-[#8BA59B]">
                                <ImageIcon size={18} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate text-white">
                                {creativeTitle(row)}
                              </div>
                              <div className="mt-1 truncate text-xs text-[#8BA59B]">
                                {creativeDetail(row) || "Unlabeled creative"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[#D7F171]">
                          {platformLabel(row.platform)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {money(row.spendMicros)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {compact(row.trackedClicks)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {compact(row.platformClicks)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {compact(row.registrations)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {money(row.revenueMicros)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {money(row.costPerRegistrationMicros, true)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {multiplier(row.roas)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {percent(row.conversionRate)}
                        </td>
                        <td className="px-3 py-3 text-right">{percent(row.ctr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Campaign performance">
          {summary.campaignRows.length === 0 ? (
            <div className="border border-dashed border-[#2A3B34] p-8 text-center text-sm text-[#8BA59B]">
              No synced ad metrics in this range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1260px] border-collapse text-sm">
                <thead className="text-left text-xs uppercase text-[#8BA59B]">
                  <tr className="border-b border-[#22362F]">
                    <th className="px-3 py-2">Platform</th>
                    <th className="px-3 py-2">Campaign / creative</th>
                    <th className="px-3 py-2 text-right">Spend</th>
                    <th className="px-3 py-2 text-right">Regs</th>
                    <th className="px-3 py-2 text-right">Revenue</th>
                    <th className="px-3 py-2 text-right">CPA</th>
                    <th className="px-3 py-2 text-right">ROAS</th>
                    <th className="px-3 py-2 text-right">Clicks</th>
                    <th className="px-3 py-2 text-right">CPC</th>
                    <th className="px-3 py-2 text-right">CTR</th>
                    <th className="px-3 py-2">Tracking</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.campaignRows.map((row) => (
                    <tr key={row.key} className="border-b border-[#17251F]">
                      <td className="px-3 py-3 text-[#D7F171]">
                        {platformLabel(row.platform)}
                        {row.provisional ? (
                          <span className="ml-2 text-xs text-[#F7C85C]">provisional</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-white">{row.campaignName}</div>
                        <div className="text-xs text-[#8BA59B]">
                          {[row.adGroupName, row.adName].filter(Boolean).join(" / ") ||
                            "Campaign total"}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">{money(row.spendMicros)}</td>
                      <td className="px-3 py-3 text-right">
                        {compact(row.registrations)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {money(row.revenueMicros)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {money(row.costPerRegistrationMicros, true)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {multiplier(row.roas)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {compact(row.platformClicks)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {money(row.cpcMicros, true)}
                      </td>
                      <td className="px-3 py-3 text-right">{percent(row.ctr)}</td>
                      <td className="px-3 py-3 text-xs text-[#8BA59B]">
                        {row.utmCampaign || "unmapped"}
                        {row.utmContent ? ` / ${row.utmContent}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <Panel title="Top spend">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={summary.campaignRows.slice(0, 8).map((row) => ({
                    name:
                      row.adName ||
                      row.adGroupName ||
                      row.campaignName.slice(0, 24),
                    spend: row.spendMicros / 1_000_000,
                  }))}
                  layout="vertical"
                  margin={{ left: 24, right: 20 }}
                >
                  <CartesianGrid stroke="#1D3028" horizontal={false} />
                  <XAxis type="number" stroke="#8BA59B" tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#8BA59B"
                    tickLine={false}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#080D0B",
                      border: "1px solid #2A3B34",
                      color: "#fff",
                    }}
                    formatter={(value) => [
                      MONEY_FORMAT_PRECISE.format(Number(value)),
                      "Spend",
                    ]}
                  />
                  <Bar dataKey="spend" fill="#D7F171" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel title="Data quality">
            <div className="grid gap-3">
              {summary.qualityIssues.length === 0 ? (
                <div className="flex items-center gap-2 border border-[#335F42] bg-[#0D1711] p-3 text-sm text-[#D7F171]">
                  <CheckCircle2 size={18} />
                  Metrics are synced and mapped for this range.
                </div>
              ) : (
                summary.qualityIssues.map((issue) => (
                  <div
                    key={`${issue.title}-${issue.body}`}
                    className={`border p-3 text-sm ${
                      issue.level === "error"
                        ? "border-[#724333] bg-[#190D0A] text-[#FFB199]"
                        : issue.level === "warning"
                          ? "border-[#775B20] bg-[#171207] text-[#F7C85C]"
                          : "border-[#263B54] bg-[#08111A] text-[#9FD5FF]"
                    }`}
                  >
                    <div className="font-bold">{issue.title}</div>
                    <div className="mt-1 opacity-90">{issue.body}</div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </section>

        {summary.unmappedRows.length > 0 ? (
          <Panel title="Resolve mappings">
            <div className="grid gap-3">
              {summary.unmappedRows.slice(0, 12).map((row) => (
                <MappingEditor
                  key={row.key}
                  row={row}
                  summary={summary}
                  onSaved={() => refresh()}
                />
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </main>
  );
}

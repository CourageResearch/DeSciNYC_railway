import "server-only";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import {
  buildLumaUrl,
  cleanTrackingValue,
  extractTrackingParams,
  isUuid,
  withTrackingDefaults,
  type AttributionEventConfig,
} from "@/lib/attribution";
import { recordAttributionClick } from "@/lib/attribution-db";
import { sendAttributionClickNotification } from "@/lib/attribution-notifications";

export type AttributionSearchParams = Record<
  string,
  string | string[] | undefined
>;

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function appendSearchParams(url: URL, params: AttributionSearchParams) {
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, item));
      continue;
    }

    if (typeof value === "string") {
      url.searchParams.set(key, value);
    }
  }
}

export function shouldShowAttributionPreview(params: AttributionSearchParams) {
  const preview = cleanTrackingValue(params.preview)?.toLowerCase();
  return preview === "1" || preview === "true" || preview === "yes";
}

export async function captureAttributionAndBuildRedirectUrl({
  event,
  params,
}: {
  event: AttributionEventConfig;
  params: AttributionSearchParams;
}) {
  const requestHeaders = await headers();
  const tracking = withTrackingDefaults(extractTrackingParams(params), event);
  const clickId = isUuid(tracking.utm_id) ? tracking.utm_id! : randomUUID();
  const trackingWithClickId = {
    ...tracking,
    utm_id: tracking.utm_id || clickId,
  };
  const host =
    getFirstHeaderValue(requestHeaders.get("x-forwarded-host")) ||
    requestHeaders.get("host") ||
    "desci.nyc";
  const proto =
    getFirstHeaderValue(requestHeaders.get("x-forwarded-proto")) || "https";
  const landingUrl = new URL(`/${event.slug}`, `${proto}://${host}`);
  appendSearchParams(landingUrl, params);

  if (!landingUrl.searchParams.get("utm_id")) {
    landingUrl.searchParams.set("utm_id", trackingWithClickId.utm_id);
  }

  try {
    const result = await recordAttributionClick({
      clickId,
      event,
      landingUrl: landingUrl.toString(),
      landingPath: `${landingUrl.pathname}${landingUrl.search}`,
      tracking: trackingWithClickId,
      referrer: requestHeaders.get("referer"),
      userAgent: requestHeaders.get("user-agent"),
      ipAddress:
        getFirstHeaderValue(requestHeaders.get("x-forwarded-for")) ||
        requestHeaders.get("x-real-ip"),
    });

    if (result.stored && result.inserted) {
      await sendAttributionClickNotification({
        event,
        clickId,
        landingUrl: landingUrl.toString(),
        tracking: trackingWithClickId,
        referrer: requestHeaders.get("referer"),
      });
    }
  } catch (error) {
    console.error("Failed to capture attribution redirect:", error);
  }

  return buildLumaUrl(clickId, trackingWithClickId, event);
}

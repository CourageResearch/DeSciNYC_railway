import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getAdsSummary } from "@/lib/ads-db";
import {
  clampAdsDateRange,
  defaultAdsDateRange,
  normalizeDate,
  normalizePlatform,
  nullIfBlank,
} from "@/lib/ads-utils";
import type { AdsFilters } from "@/lib/ads-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseFilters(req: NextRequest): AdsFilters {
  const defaults = defaultAdsDateRange();
  const searchParams = req.nextUrl.searchParams;
  let startDate = normalizeDate(searchParams.get("startDate"), defaults.startDate);
  let endDate = normalizeDate(searchParams.get("endDate"), defaults.endDate);

  if (startDate > endDate) {
    startDate = defaults.startDate;
    endDate = defaults.endDate;
  }
  const range = clampAdsDateRange({ startDate, endDate });

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    platform: normalizePlatform(searchParams.get("platform")),
    eventSlug: nullIfBlank(searchParams.get("eventSlug")) || undefined,
    campaignId: nullIfBlank(searchParams.get("campaignId")) || undefined,
    adId: nullIfBlank(searchParams.get("adId")) || undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await getAdsSummary(parseFilters(req));
    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load ads dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

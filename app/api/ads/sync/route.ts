import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { hasDatabaseConfig } from "@/lib/db";
import { syncAds } from "@/lib/ads-sync";
import {
  defaultAdsDateRange,
  normalizeDate,
  normalizePlatform,
} from "@/lib/ads-utils";
import type { AdPlatform, AdsDateRange } from "@/lib/ads-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseRange(body: Record<string, unknown>): AdsDateRange {
  const defaults = defaultAdsDateRange();
  let startDate = normalizeDate(body.startDate, defaults.startDate);
  let endDate = normalizeDate(body.endDate, defaults.endDate);

  if (startDate > endDate) {
    startDate = defaults.startDate;
    endDate = defaults.endDate;
  }

  return { startDate, endDate };
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!hasDatabaseConfig()) {
      return NextResponse.json(
        { error: "DATABASE_URL is required before ads can sync" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const platform = normalizePlatform(body.platform);
    const platforms: AdPlatform[] = platform === "all" ? ["meta", "x"] : [platform];
    const range = parseRange(body);
    const results = await syncAds({ platforms, range });

    return NextResponse.json({
      ok: results.every((result) => result.status !== "error"),
      range,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

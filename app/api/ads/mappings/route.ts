import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getAdMappings, upsertAdMapping } from "@/lib/ads-db";
import { normalizePlatform, nullIfBlank } from "@/lib/ads-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ mappings: await getAdMappings() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load mappings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const platform = normalizePlatform(body.platform);

    if (platform === "all") {
      return NextResponse.json(
        { error: "A platform is required for an ad mapping" },
        { status: 400 }
      );
    }

    const platformCampaignId = nullIfBlank(body.platformCampaignId);
    const platformAdGroupId = nullIfBlank(body.platformAdGroupId);
    const platformAdId = nullIfBlank(body.platformAdId);

    if (!platformCampaignId && !platformAdGroupId && !platformAdId) {
      return NextResponse.json(
        { error: "Map at least a campaign, ad group, or ad" },
        { status: 400 }
      );
    }

    const mapping = await upsertAdMapping({
      mappingId: nullIfBlank(body.mappingId),
      platform,
      platformCampaignId,
      platformAdGroupId,
      platformAdId,
      eventSlug: nullIfBlank(body.eventSlug),
      utmSource: nullIfBlank(body.utmSource),
      utmCampaign: nullIfBlank(body.utmCampaign),
      utmContent: nullIfBlank(body.utmContent),
      notes: nullIfBlank(body.notes),
    });

    return NextResponse.json({ mapping });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save mapping";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

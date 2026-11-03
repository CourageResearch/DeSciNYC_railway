import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { getAdsEventReports } from "@/lib/ads-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try { await requireAdmin(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  try { return NextResponse.json(await getAdsEventReports()); }
  catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load event reports" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  ATTRIBUTION_MAX_AGE_SECONDS,
  attributionCookieName,
  extractTrackingParams,
  isUuid,
  resolveAttributionEvent,
} from "@/lib/attribution";
import { recordAttributionClick } from "@/lib/attribution-db";
import { sendAttributionClickNotification } from "@/lib/attribution-notifications";

export const runtime = "nodejs";

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return req.headers.get("x-real-ip");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clickId = typeof body.clickId === "string" ? body.clickId : "";

    if (!isUuid(clickId)) {
      return NextResponse.json({ error: "Invalid click id" }, { status: 400 });
    }

    const landingUrl =
      typeof body.landingUrl === "string"
        ? body.landingUrl.slice(0, 2000)
        : req.nextUrl.toString();
    const landingPath =
      typeof body.landingPath === "string"
        ? body.landingPath.slice(0, 1000)
        : req.nextUrl.pathname;
    const tracking = extractTrackingParams(body.tracking || {});
    const event = resolveAttributionEvent({
      slug: typeof body.eventSlug === "string" ? body.eventSlug : null,
      url: landingUrl,
      tracking,
    });
    const referrer =
      typeof body.referrer === "string" ? body.referrer.slice(0, 1000) : null;
    const userAgent = req.headers.get("user-agent");

    const result = await recordAttributionClick({
      clickId,
      event,
      landingUrl,
      landingPath,
      tracking,
      referrer,
      userAgent,
      ipAddress: getClientIp(req),
    });

    if (result.stored && result.inserted) {
      await sendAttributionClickNotification({
        event,
        clickId,
        landingUrl,
        tracking,
        referrer,
      });
    }

    const response = NextResponse.json({ ok: true, ...result });
    response.cookies.set(attributionCookieName(event.slug), clickId, {
      maxAge: ATTRIBUTION_MAX_AGE_SECONDS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Failed to record attribution click:", error);
    return NextResponse.json(
      { error: "Failed to record click" },
      { status: 500 }
    );
  }
}

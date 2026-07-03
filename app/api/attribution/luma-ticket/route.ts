import { NextRequest, NextResponse } from "next/server";
import { resolveAttributionEvent, type TrackingParams } from "@/lib/attribution";
import {
  findAttributionClick,
  recordAttributionConversion,
} from "@/lib/attribution-db";
import { sendAttributionTicketNotification } from "@/lib/attribution-notifications";
import { parseLumaConversionPayload } from "@/lib/luma-attribution";
import { verifyLumaWebhookSignature } from "@/lib/luma-webhooks";
import { sendXConversion } from "@/lib/x-conversions";

export const runtime = "nodejs";

function trackingFromClick(
  parsedTracking: TrackingParams,
  click: Awaited<ReturnType<typeof findAttributionClick>>
): TrackingParams {
  return {
    utm_source: parsedTracking.utm_source || click?.utm_source || null,
    utm_medium: parsedTracking.utm_medium || click?.utm_medium || null,
    utm_campaign: parsedTracking.utm_campaign || click?.utm_campaign || null,
    utm_content: parsedTracking.utm_content || click?.utm_content || null,
    utm_term: parsedTracking.utm_term || click?.utm_term || null,
    utm_id: parsedTracking.utm_id || click?.utm_id || click?.click_id || null,
    twclid: parsedTracking.twclid || click?.twclid || null,
  };
}

function isAdAttributedTicket({
  event,
  tracking,
  clickMatched,
}: {
  event: ReturnType<typeof resolveAttributionEvent>;
  tracking: TrackingParams;
  clickMatched: boolean;
}) {
  return Boolean(
    clickMatched ||
      tracking.twclid ||
      tracking.utm_campaign === event.defaultUtm.utm_campaign ||
      tracking.utm_content === event.defaultUtm.utm_content ||
      (tracking.utm_source === event.defaultUtm.utm_source &&
        tracking.utm_medium === event.defaultUtm.utm_medium)
  );
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const verification = verifyLumaWebhookSignature({
    body: rawBody,
    secret: process.env.LUMA_WEBHOOK_SECRET,
    signatureHeader: req.headers.get("webhook-signature"),
    timestampHeader: req.headers.get("webhook-timestamp"),
  });

  if (!verification.ok && verification.reason === "missing_secret") {
    return NextResponse.json(
      { error: "Luma webhook secret is not configured" },
      { status: 500 }
    );
  }

  if (!verification.ok) {
    return NextResponse.json(
      { error: "Invalid Luma webhook signature" },
      { status: 401 }
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseLumaConversionPayload(payload);
  const event = resolveAttributionEvent({
    lumaEventId: parsed.lumaEventId,
    url: parsed.eventSourceUrl,
    tracking: parsed.tracking,
  });
  const click = await findAttributionClick({
    eventSlug: event.slug,
    utmId: parsed.tracking.utm_id,
    twclid: parsed.twclid,
  });
  const tracking = trackingFromClick(parsed.tracking, click);
  const clickMatched = Boolean(click);
  const twclid = tracking.twclid || null;
  const xResult = await sendXConversion({
    conversionId: parsed.conversionId,
    conversionTime: parsed.conversionTime,
    twclid,
    hashedEmail: parsed.hashedEmail,
    ipAddress: click?.ip_address || null,
    userAgent: click?.user_agent || null,
    value: parsed.conversionValue,
    eventSourceUrl: parsed.eventSourceUrl,
    description: `${event.title} ticket registration`,
  });
  const xResponse = xResult.sent
    ? xResult.response
    : xResult.response || xResult.payload || null;

  try {
    const conversionResult = await recordAttributionConversion({
      conversionId: parsed.conversionId,
      clickId: click?.click_id || null,
      eventSlug: event.slug,
      lumaEventId: parsed.lumaEventId || event.lumaEventId,
      lumaGuestId: parsed.lumaGuestId,
      lumaTicketId: parsed.lumaTicketId,
      hashedEmail: parsed.hashedEmail,
      twclid,
      tracking,
      eventSourceUrl: parsed.eventSourceUrl,
      conversionValue: parsed.conversionValue,
      payload: parsed.sanitizedPayload,
      xSentAt: xResult.sent ? new Date().toISOString() : null,
      xStatus: xResult.status || null,
      xResponse,
      xError: xResult.sent ? null : xResult.error || null,
      xSkippedReason: xResult.sent ? null : xResult.skippedReason,
    });

    if (
      conversionResult.stored &&
      conversionResult.inserted &&
      isAdAttributedTicket({ event, tracking, clickMatched })
    ) {
      await sendAttributionTicketNotification({
        event,
        conversionId: parsed.conversionId,
        clickMatched,
        clickId: click?.click_id || null,
        lumaGuestId: parsed.lumaGuestId,
        lumaTicketId: parsed.lumaTicketId,
        attendeeName: parsed.attendeeName,
        attendeeEmail: parsed.email,
        tracking,
        eventSourceUrl: parsed.eventSourceUrl,
        conversionValue: parsed.conversionValue,
        conversionTime: parsed.conversionTime,
      });
    }
  } catch (error) {
    console.error("Failed to record Luma attribution conversion:", error);
  }

  return NextResponse.json({
    ok: true,
    webhookId: req.headers.get("webhook-id"),
    conversionId: parsed.conversionId,
    clickMatched,
    x: xResult.sent
      ? { sent: true, status: xResult.status }
      : { sent: false, skippedReason: xResult.skippedReason },
  });
}

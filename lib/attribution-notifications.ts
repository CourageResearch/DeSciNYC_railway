import "server-only";

import { Resend } from "resend";
import type {
  AttributionEventConfig,
  TrackingParams,
} from "@/lib/attribution";
import { ADMIN_EMAILS } from "@/types/adminEmails";

const FROM_EMAIL = "DeSciNYC <admin@desci.nyc>";

type EmailDetail = [label: string, value: string | null | undefined | boolean];

type SendAttributionClickNotificationInput = {
  event: AttributionEventConfig;
  clickId: string;
  landingUrl: string;
  tracking: TrackingParams;
  referrer?: string | null;
  occurredAt?: string;
};

type SendAttributionConversionNotificationInput = {
  event: AttributionEventConfig;
  conversionId: string;
  clickMatched: boolean;
  clickId?: string | null;
  webhookType?: string | null;
  approvalStatus?: string | null;
  lumaGuestId?: string | null;
  lumaTicketId?: string | null;
  attendeeName?: string | null;
  attendeeEmail?: string | null;
  tracking: TrackingParams;
  eventSourceUrl?: string | null;
  conversionValue?: string | null;
  conversionTime: string;
};

function displayValue(value: EmailDetail[1]) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (!value) {
    return "Not provided";
  }

  return value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function detailsToText(details: EmailDetail[]) {
  return details
    .map(([label, value]) => `${label}: ${displayValue(value)}`)
    .join("\n");
}

function detailsToHtml(details: EmailDetail[]) {
  const rows = details
    .map(([label, value]) => {
      return `
        <tr>
          <td style="padding: 6px 12px 6px 0; color: #555; font-weight: 700; vertical-align: top;">${escapeHtml(label)}</td>
          <td style="padding: 6px 0; color: #111; vertical-align: top;">${escapeHtml(displayValue(value))}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <table style="border-collapse: collapse;">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function sendAttributionNotification({
  kind,
  subject,
  details,
}: {
  kind: string;
  subject: string;
  details: EmailDetail[];
}) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.warn(
      `Skipping ${kind} attribution notification: RESEND_API_KEY is not configured`
    );
    return { sent: false, reason: "missing_resend_api_key" };
  }

  try {
    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAILS,
      subject,
      text: detailsToText(details),
      html: detailsToHtml(details),
    });

    return { sent: true };
  } catch (error) {
    console.error(`Failed to send ${kind} attribution notification:`, error);
    return { sent: false, reason: "send_failed" };
  }
}

export async function sendAttributionClickNotification({
  event,
  clickId,
  landingUrl,
  tracking,
  referrer,
  occurredAt = new Date().toISOString(),
}: SendAttributionClickNotificationInput) {
  return sendAttributionNotification({
    kind: "ad click",
    subject: `[DeSciNYC Ads] New ad click: ${event.slug}`,
    details: [
      ["Notification", "New ad click"],
      ["Event", event.title],
      ["Event slug", event.slug],
      ["Campaign", tracking.utm_campaign],
      ["Content", tracking.utm_content],
      ["Source", tracking.utm_source],
      ["Medium", tracking.utm_medium],
      ["Click ID", clickId],
      ["UTM ID", tracking.utm_id],
      ["TWCLID", tracking.twclid],
      ["FBCLID", tracking.fbclid],
      ["Landing URL", landingUrl],
      ["Referrer", referrer],
      ["Timestamp", occurredAt],
    ],
  });
}

export async function sendAttributionConversionNotification({
  event,
  conversionId,
  clickMatched,
  clickId,
  webhookType,
  approvalStatus,
  lumaGuestId,
  lumaTicketId,
  attendeeName,
  attendeeEmail,
  tracking,
  eventSourceUrl,
  conversionValue,
  conversionTime,
}: SendAttributionConversionNotificationInput) {
  return sendAttributionNotification({
    kind: "ad conversion",
    subject: `[DeSciNYC Ads] Registration from ad: ${event.slug}`,
    details: [
      ["Notification", "Registration from ad"],
      ["Event", event.title],
      ["Event slug", event.slug],
      ["Luma webhook type", webhookType],
      ["Approval status", approvalStatus],
      ["Campaign", tracking.utm_campaign],
      ["Content", tracking.utm_content],
      ["Source", tracking.utm_source],
      ["Medium", tracking.utm_medium],
      ["Click matched", clickMatched],
      ["Click ID", clickId],
      ["Conversion ID", conversionId],
      ["Luma ticket ID", lumaTicketId],
      ["Luma guest ID", lumaGuestId],
      ["Attendee name", attendeeName],
      ["Attendee email", attendeeEmail],
      ["Value", conversionValue],
      ["UTM ID", tracking.utm_id],
      ["TWCLID", tracking.twclid],
      ["FBCLID", tracking.fbclid],
      ["Event source URL", eventSourceUrl],
      ["Timestamp", conversionTime],
    ],
  });
}

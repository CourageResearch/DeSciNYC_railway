import { hasDatabaseConfig, query } from "@/lib/db";
import type { QueryResultRow } from "pg";
import {
  type AttributionEventConfig,
  type TrackingParams,
  getDefaultAttributionEvent,
  isUuid,
} from "@/lib/attribution";

export type RecordClickInput = {
  clickId: string;
  event: AttributionEventConfig;
  landingUrl: string;
  landingPath: string;
  tracking: TrackingParams;
  referrer?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type AttributionClick = QueryResultRow & {
  click_id: string;
  event_slug: string;
  luma_event_id: string;
  luma_url: string;
  landing_url: string;
  landing_path: string;
  twclid: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_id: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
  last_seen_at: Date;
};

export type MatchClickInput = {
  eventSlug?: string;
  utmId?: string | null;
  twclid?: string | null;
};

export type RecordConversionInput = {
  conversionId: string;
  clickId?: string | null;
  eventSlug?: string;
  lumaEventId?: string | null;
  lumaGuestId?: string | null;
  lumaTicketId?: string | null;
  hashedEmail?: string | null;
  twclid?: string | null;
  tracking?: TrackingParams;
  eventSourceUrl?: string | null;
  conversionValue?: string | null;
  payload: unknown;
  xSentAt?: string | null;
  xStatus?: number | null;
  xResponse?: unknown;
  xError?: string | null;
  xSkippedReason?: string | null;
};

export async function recordAttributionClick(input: RecordClickInput) {
  if (!hasDatabaseConfig()) {
    return { stored: false, reason: "missing_database_config" };
  }

  if (!isUuid(input.clickId)) {
    return { stored: false, reason: "invalid_click_id" };
  }

  const { rows } = await query<{ inserted: boolean }>(
    `
      WITH inserted AS (
        INSERT INTO attribution_clicks (
          click_id,
          event_slug,
          luma_event_id,
          luma_url,
          landing_url,
          landing_path,
          twclid,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          utm_id,
          referrer,
          user_agent,
          ip_address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (click_id) DO NOTHING
        RETURNING TRUE AS inserted
      ),
      updated AS (
        UPDATE attribution_clicks
        SET landing_url = $5,
            landing_path = $6,
            twclid = COALESCE($7, attribution_clicks.twclid),
            utm_source = COALESCE($8, attribution_clicks.utm_source),
            utm_medium = COALESCE($9, attribution_clicks.utm_medium),
            utm_campaign = COALESCE($10, attribution_clicks.utm_campaign),
            utm_content = COALESCE($11, attribution_clicks.utm_content),
            utm_term = COALESCE($12, attribution_clicks.utm_term),
            utm_id = COALESCE($13, attribution_clicks.utm_id),
            referrer = COALESCE($14, attribution_clicks.referrer),
            user_agent = COALESCE($15, attribution_clicks.user_agent),
            ip_address = COALESCE($16, attribution_clicks.ip_address),
            last_seen_at = now()
        WHERE click_id = $1
          AND NOT EXISTS (SELECT 1 FROM inserted)
        RETURNING FALSE AS inserted
      )
      SELECT inserted FROM inserted
      UNION ALL
      SELECT inserted FROM updated
      LIMIT 1
    `,
    [
      input.clickId,
      input.event.slug,
      input.event.lumaEventId,
      input.event.lumaUrl,
      input.landingUrl,
      input.landingPath,
      input.tracking.twclid || null,
      input.tracking.utm_source || null,
      input.tracking.utm_medium || null,
      input.tracking.utm_campaign || null,
      input.tracking.utm_content || null,
      input.tracking.utm_term || null,
      input.tracking.utm_id || input.clickId,
      input.referrer || null,
      input.userAgent || null,
      input.ipAddress || null,
    ]
  );

  return { stored: true, inserted: rows[0]?.inserted ?? false };
}

export async function findAttributionClick(input: MatchClickInput) {
  if (!hasDatabaseConfig()) {
    return null;
  }

  const eventSlug = input.eventSlug || getDefaultAttributionEvent().slug;

  if (input.utmId) {
    const { rows } = await query<AttributionClick>(
      `
        SELECT *
        FROM attribution_clicks
        WHERE event_slug = $1
          AND (utm_id = $2 OR click_id::text = $2)
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [eventSlug, input.utmId]
    );

    if (rows[0]) {
      return rows[0];
    }
  }

  if (input.twclid) {
    const { rows } = await query<AttributionClick>(
      `
        SELECT *
        FROM attribution_clicks
        WHERE event_slug = $1
          AND twclid = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [eventSlug, input.twclid]
    );

    return rows[0] || null;
  }

  return null;
}

export async function recordAttributionConversion(
  input: RecordConversionInput
) {
  if (!hasDatabaseConfig()) {
    return { stored: false, reason: "missing_database_config" };
  }

  const { rows } = await query<{ inserted: boolean }>(
    `
      WITH inserted AS (
        INSERT INTO attribution_conversions (
          conversion_id,
          click_id,
          event_slug,
          luma_event_id,
          luma_guest_id,
          luma_ticket_id,
          hashed_email,
          twclid,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          utm_id,
          event_source_url,
          conversion_value,
          payload,
          x_sent_at,
          x_status,
          x_response,
          x_error,
          x_skipped_reason
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17::jsonb, $18, $19, $20::jsonb, $21, $22
        )
        ON CONFLICT (conversion_id) DO NOTHING
        RETURNING TRUE AS inserted
      ),
      updated AS (
        UPDATE attribution_conversions
        SET click_id = COALESCE($2, attribution_conversions.click_id),
            luma_event_id = COALESCE($4, attribution_conversions.luma_event_id),
            luma_guest_id = COALESCE($5, attribution_conversions.luma_guest_id),
            luma_ticket_id = COALESCE($6, attribution_conversions.luma_ticket_id),
            hashed_email = COALESCE($7, attribution_conversions.hashed_email),
            twclid = COALESCE($8, attribution_conversions.twclid),
            utm_source = COALESCE($9, attribution_conversions.utm_source),
            utm_medium = COALESCE($10, attribution_conversions.utm_medium),
            utm_campaign = COALESCE($11, attribution_conversions.utm_campaign),
            utm_content = COALESCE($12, attribution_conversions.utm_content),
            utm_term = COALESCE($13, attribution_conversions.utm_term),
            utm_id = COALESCE($14, attribution_conversions.utm_id),
            event_source_url = COALESCE($15, attribution_conversions.event_source_url),
            conversion_value = COALESCE($16, attribution_conversions.conversion_value),
            payload = $17::jsonb,
            x_sent_at = COALESCE($18, attribution_conversions.x_sent_at),
            x_status = COALESCE($19, attribution_conversions.x_status),
            x_response = COALESCE($20::jsonb, attribution_conversions.x_response),
            x_error = $21,
            x_skipped_reason = $22
        WHERE conversion_id = $1
          AND NOT EXISTS (SELECT 1 FROM inserted)
        RETURNING FALSE AS inserted
      )
      SELECT inserted FROM inserted
      UNION ALL
      SELECT inserted FROM updated
      LIMIT 1
    `,
    [
      input.conversionId,
      input.clickId && isUuid(input.clickId) ? input.clickId : null,
      input.eventSlug || getDefaultAttributionEvent().slug,
      input.lumaEventId || null,
      input.lumaGuestId || null,
      input.lumaTicketId || null,
      input.hashedEmail || null,
      input.twclid || null,
      input.tracking?.utm_source || null,
      input.tracking?.utm_medium || null,
      input.tracking?.utm_campaign || null,
      input.tracking?.utm_content || null,
      input.tracking?.utm_term || null,
      input.tracking?.utm_id || null,
      input.eventSourceUrl || null,
      input.conversionValue || null,
      JSON.stringify(input.payload || {}),
      input.xSentAt || null,
      input.xStatus || null,
      input.xResponse ? JSON.stringify(input.xResponse) : null,
      input.xError || null,
      input.xSkippedReason || null,
    ]
  );

  return { stored: true, inserted: rows[0]?.inserted ?? false };
}

import eventsData from "@/events.json";
import { hasDatabaseConfig, query } from "./db";

export type EventRecord = {
  id: number | null;
  event_uuid: string | null;
  title: string;
  speaker: string | null;
  yt_uuid: string | null;
  luma_url: string;
  luma_id: string;
  slides: string | null;
  created_at: string | null;
  updated_at: string | null;
  active: boolean;
};

type EventRow = Omit<EventRecord, "created_at" | "updated_at"> & {
  sort_order?: number | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
};

export type EventInput = {
  title: string;
  speaker?: string | null;
  yt_uuid?: string | null;
  luma_url?: string | null;
  luma_id?: string | null;
  slides?: string | null;
  active?: boolean;
};

const EVENT_FIELDS = `
  id,
  event_uuid::text,
  title,
  speaker,
  yt_uuid,
  luma_url,
  luma_id,
  slides,
  created_at,
  updated_at,
  active
`;

function toIso(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function mapEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    event_uuid: row.event_uuid,
    title: row.title,
    speaker: row.speaker,
    yt_uuid: row.yt_uuid,
    luma_url: row.luma_url,
    luma_id: row.luma_id,
    slides: row.slides,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    active: row.active,
  };
}

function bundledEvents() {
  const nextEventId = Number(eventsData.next_event);
  return eventsData.events.map((event, index) => ({
    id: Number(event.id),
    event_uuid: null,
    title: event.title,
    speaker: event.speaker || null,
    yt_uuid: event.yt_uuid || null,
    luma_url: event.luma_url,
    luma_id: event.luma_id,
    slides: "slides" in event ? event.slides || null : null,
    created_at: null,
    updated_at: null,
    active: Number(event.id) >= nextEventId,
    sort_order: index + 1,
  }));
}

export async function getUpcomingEvents() {
  if (!hasDatabaseConfig()) {
    return bundledEvents().filter((event) => event.active).map(mapEvent);
  }

  const { rows } = await query<EventRow>(
    `
      SELECT ${EVENT_FIELDS}
      FROM events
      WHERE active = true
      ORDER BY sort_order ASC NULLS LAST, id ASC NULLS LAST, created_at ASC
    `
  );

  return rows.map(mapEvent);
}

export async function getPastEvents() {
  if (!hasDatabaseConfig()) {
    return bundledEvents()
      .filter((event) => !event.active && Boolean(event.yt_uuid))
      .map(mapEvent);
  }

  const { rows } = await query<EventRow>(
    `
      SELECT ${EVENT_FIELDS}
      FROM events
      WHERE active = false
        AND COALESCE(yt_uuid, '') <> ''
      ORDER BY sort_order DESC NULLS LAST, id DESC NULLS LAST, created_at DESC
    `
  );

  return rows.map(mapEvent);
}

export async function getAllEvents() {
  if (!hasDatabaseConfig()) {
    return bundledEvents().map(mapEvent);
  }

  const { rows } = await query<EventRow>(
    `
      SELECT ${EVENT_FIELDS}
      FROM events
      ORDER BY active DESC, sort_order DESC NULLS LAST, id DESC NULLS LAST, created_at DESC
    `
  );

  return rows.map(mapEvent);
}

export async function createEvent(input: EventInput) {
  const { rows } = await query<EventRow>(
    `
      INSERT INTO events (
        title,
        speaker,
        yt_uuid,
        luma_url,
        luma_id,
        slides,
        active,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, (
        SELECT COALESCE(MAX(sort_order), 0) + 1 FROM events
      ))
      RETURNING ${EVENT_FIELDS}
    `,
    [
      input.title,
      input.speaker || null,
      input.yt_uuid || null,
      input.luma_url || "",
      input.luma_id || "",
      input.slides || null,
      Boolean(input.active),
    ]
  );

  return mapEvent(rows[0]);
}

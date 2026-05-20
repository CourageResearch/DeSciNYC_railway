import "./load-env.mjs";
import pg from "pg";

const { Pool } = pg;

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error("SUPABASE_DATABASE_URL is required");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const source = new Pool({
  connectionString: process.env.SUPABASE_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const target = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "false" ||
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
});

try {
  const { rows: sourceColumns } = await source.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'events'
  `);
  const columnNames = new Set(sourceColumns.map((row) => row.column_name));

  const { rows } = await source.query(`
    SELECT
      id,
      ${columnNames.has("event_uuid") ? "event_uuid::text" : "NULL::text"} AS event_uuid,
      title,
      speaker,
      yt_uuid,
      luma_url,
      luma_id,
      slides,
      active,
      created_at,
      updated_at
    FROM events
    ORDER BY active DESC, id ASC NULLS FIRST, created_at ASC
  `);

  for (const [index, event] of rows.entries()) {
    if (event.id != null) {
      await target.query(
        `
          INSERT INTO events (
            event_uuid,
            id,
            title,
            speaker,
            yt_uuid,
            luma_url,
            luma_id,
            slides,
            active,
            sort_order,
            created_at,
          updated_at
        )
        VALUES (
            COALESCE($1::uuid, gen_random_uuid()),
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            COALESCE($11, NOW()),
            COALESCE($12, NOW())
          )
          ON CONFLICT (id) DO UPDATE
          SET event_uuid = COALESCE(EXCLUDED.event_uuid, events.event_uuid),
              title = EXCLUDED.title,
              speaker = EXCLUDED.speaker,
              yt_uuid = EXCLUDED.yt_uuid,
              luma_url = EXCLUDED.luma_url,
              luma_id = EXCLUDED.luma_id,
              slides = EXCLUDED.slides,
              active = EXCLUDED.active,
              sort_order = EXCLUDED.sort_order,
              updated_at = EXCLUDED.updated_at
        `,
        [
          event.event_uuid,
          event.id,
          event.title,
          event.speaker,
          event.yt_uuid,
          event.luma_url,
          event.luma_id,
          event.slides,
          event.active,
          index + 1,
          event.created_at,
          event.updated_at,
        ]
      );
      continue;
    }

    if (event.event_uuid) {
      await target.query(
        `
          INSERT INTO events (
            event_uuid,
            id,
            title,
            speaker,
            yt_uuid,
            luma_url,
            luma_id,
            slides,
            active,
            sort_order,
            created_at,
            updated_at
          )
          VALUES (
            $1::uuid,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            $10,
            COALESCE($11, NOW()),
            COALESCE($12, NOW())
          )
          ON CONFLICT (event_uuid) DO UPDATE
          SET id = EXCLUDED.id,
              title = EXCLUDED.title,
              speaker = EXCLUDED.speaker,
              yt_uuid = EXCLUDED.yt_uuid,
              luma_url = EXCLUDED.luma_url,
              luma_id = EXCLUDED.luma_id,
              slides = EXCLUDED.slides,
              active = EXCLUDED.active,
              sort_order = EXCLUDED.sort_order,
              updated_at = EXCLUDED.updated_at
        `,
        [
          event.event_uuid,
          event.id,
          event.title,
          event.speaker,
          event.yt_uuid,
          event.luma_url,
          event.luma_id,
          event.slides,
          event.active,
          index + 1,
          event.created_at,
          event.updated_at,
        ]
      );
      continue;
    }

    await target.query(
      `
        INSERT INTO events (
          id,
          title,
          speaker,
          yt_uuid,
          luma_url,
          luma_id,
          slides,
          active,
          sort_order,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          COALESCE($10, NOW()),
          COALESCE($11, NOW())
        )
    `,
      [
        event.id,
        event.title,
        event.speaker,
        event.yt_uuid,
        event.luma_url,
        event.luma_id,
        event.slides,
        event.active,
        index + 1,
        event.created_at,
        event.updated_at,
      ]
    );
  }

  console.log(`Copied ${rows.length} Supabase event rows into target database`);
} finally {
  await Promise.all([source.end(), target.end()]);
}

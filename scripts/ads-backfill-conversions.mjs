import "./load-env.mjs";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "false" ||
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
});

const sources = [
  "twitter_ads",
  "x_ads",
  "instagram_ads",
  "facebook_ads",
  "meta_ads",
];
const startDate = process.env.ADS_BACKFILL_START_DATE || null;
const endDate = process.env.ADS_BACKFILL_END_DATE || null;
const windowDays = Number(process.env.ADS_BACKFILL_CLICK_WINDOW_DAYS || 30);

try {
  const { rows } = await pool.query(
    `
      WITH unmatched AS (
        SELECT
          conversion_id,
          event_slug,
          LOWER(utm_source) AS utm_source,
          utm_campaign,
          utm_content,
          created_at
        FROM attribution_conversions
        WHERE click_id IS NULL
          AND LOWER(COALESCE(utm_source, '')) = ANY($1::text[])
          AND (utm_campaign IS NOT NULL OR utm_content IS NOT NULL)
          AND ($2::date IS NULL OR created_at >= $2::date)
          AND ($3::date IS NULL OR created_at < ($3::date + INTERVAL '1 day'))
      ),
      candidates AS (
        SELECT
          unmatched.conversion_id,
          clicks.click_id
        FROM unmatched
        JOIN attribution_clicks clicks
          ON clicks.event_slug = unmatched.event_slug
         AND LOWER(COALESCE(clicks.utm_source, '')) = unmatched.utm_source
         AND (unmatched.utm_campaign IS NULL OR clicks.utm_campaign = unmatched.utm_campaign)
         AND (unmatched.utm_content IS NULL OR clicks.utm_content = unmatched.utm_content)
         AND clicks.created_at >= unmatched.created_at - ($4::int * INTERVAL '1 day')
         AND clicks.created_at <= unmatched.created_at + INTERVAL '1 hour'
      ),
      unique_matches AS (
        SELECT
          conversion_id,
          MAX(click_id::text)::uuid AS click_id,
          COUNT(*)::int AS candidate_count
        FROM candidates
        GROUP BY conversion_id
        HAVING COUNT(*) = 1
      ),
      updated AS (
        UPDATE attribution_conversions conversions
        SET click_id = unique_matches.click_id,
            updated_at = now()
        FROM unique_matches
        WHERE conversions.conversion_id = unique_matches.conversion_id
          AND conversions.click_id IS NULL
        RETURNING conversions.conversion_id
      )
      SELECT
        (SELECT COUNT(*)::int FROM unmatched) AS unmatched_reviewed,
        (SELECT COUNT(*)::int FROM unique_matches) AS unique_matches,
        (SELECT COUNT(*)::int FROM updated) AS conversions_updated
    `,
    [sources, startDate, endDate, Number.isFinite(windowDays) ? windowDays : 30]
  );

  console.log(
    JSON.stringify(
      {
        startDate,
        endDate,
        clickWindowDays: Number.isFinite(windowDays) ? windowDays : 30,
        ...rows[0],
      },
      null,
      2
    )
  );
} finally {
  await pool.end();
}

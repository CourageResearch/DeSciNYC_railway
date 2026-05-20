import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

const { Pool } = pg;

const PROD_URL = process.env.PROD_PUBLIC_URL || "https://www.desci.nyc";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "false" ||
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1")
      ? false
      : { rejectUnauthorized: false },
});

function hasS3Config() {
  return Boolean(
    (process.env.S3_BUCKET || process.env.BUCKET) &&
      (process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3) &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}

function getS3Client() {
  return new S3Client({
    region: process.env.AWS_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

async function copyPublicEvents() {
  const response = await fetch(`${PROD_URL}/api/events`);
  if (!response.ok) {
    throw new Error(`Failed to fetch public prod events: ${response.status}`);
  }

  const events = await response.json();
  for (const [index, event] of events.entries()) {
    if (event.event_uuid) {
      await db.query(
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
          event.speaker || null,
          event.yt_uuid || null,
          event.luma_url,
          event.luma_id,
          event.slides || null,
          Boolean(event.active),
          index + 1,
          event.created_at,
          event.updated_at,
        ]
      );
    } else if (event.id != null) {
      await db.query(
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, NOW()), COALESCE($11, NOW()))
          ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
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
          event.id,
          event.title,
          event.speaker || null,
          event.yt_uuid || null,
          event.luma_url,
          event.luma_id,
          event.slides || null,
          Boolean(event.active),
          index + 1,
          event.created_at,
          event.updated_at,
        ]
      );
    }
  }

  return events.length;
}

async function copyPublicGallery() {
  if (!hasS3Config()) {
    return 0;
  }

  const response = await fetch(PROD_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch public prod homepage: ${response.status}`);
  }

  const html = await response.text();
  const urls = [
    ...new Set(
      [...html.matchAll(/https:\/\/mvxqecumojlkotvlctau\.supabase\.co\/storage\/v1\/object\/public\/gallery\/images\/[^\\"'<>\s)]+/g)].map(
        (match) => match[0].replace(/\\$/g, "")
      )
    ),
  ];
  const s3 = getS3Client();
  let copied = 0;

  for (const url of urls) {
    const imageResponse = await fetch(url);
    if (!imageResponse.ok) {
      continue;
    }

    const parsed = new URL(url);
    const fileName = decodeURIComponent(parsed.pathname.split("/").pop() || "image");
    const objectKey = `images/${fileName}`;
    const contentType =
      imageResponse.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || process.env.BUCKET,
        Key: objectKey,
        Body: buffer,
        ContentType: contentType,
      })
    );
    await db.query(
      `
        INSERT INTO gallery_images (object_key, original_filename, content_type, archived)
        VALUES ($1, $2, $3, false)
        ON CONFLICT (object_key) DO UPDATE
        SET original_filename = EXCLUDED.original_filename,
            content_type = EXCLUDED.content_type,
            archived = false,
            updated_at = NOW()
      `,
      [objectKey, fileName, contentType]
    );
    copied += 1;
  }

  return copied;
}

try {
  const events = await copyPublicEvents();
  const images = await copyPublicGallery();
  console.log(`Copied visible public production data: ${events} events, ${images} images`);
} finally {
  await db.end();
}

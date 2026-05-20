import fs from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

const { Pool } = pg;

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required");
}

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
const localRoot =
  process.env.LOCAL_STORAGE_ROOT || path.join(process.cwd(), ".local-storage");

function supabaseHeaders(extra = {}) {
  return {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAnonKey}`,
    ...extra,
  };
}

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

async function saveObject(key, buffer, contentType) {
  if (hasS3Config()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || process.env.BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType || "application/octet-stream",
      })
    );
    return;
  }

  const target = path.join(localRoot, "gallery", key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
}

async function copyEvents() {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/events?select=*`,
    { headers: supabaseHeaders() }
  );
  if (!response.ok) {
    throw new Error(`Failed to read Supabase events: ${response.status}`);
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
      continue;
    }

    if (event.id == null) {
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
      continue;
    }

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

  return events.length;
}

async function listStorageFolder(folder) {
  const response = await fetch(`${supabaseUrl}/storage/v1/object/list/gallery`, {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      prefix: folder,
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to list Supabase storage ${folder}: ${response.status}`);
  }

  return response.json();
}

async function copyStorageFolder(folder, archived) {
  const files = await listStorageFolder(folder);
  let copied = 0;

  for (const file of files || []) {
    if (!file.name || file.name.startsWith(".")) {
      continue;
    }

    const key = `${folder}/${file.name}`;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/gallery/${key
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
    const response = await fetch(publicUrl, { headers: supabaseHeaders() });
    if (!response.ok) {
      console.warn(`Skipping ${key}: ${response.status}`);
      continue;
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const buffer = Buffer.from(await response.arrayBuffer());
    await saveObject(key, buffer, contentType);
    await db.query(
      `
        INSERT INTO gallery_images (object_key, original_filename, content_type, archived)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (object_key) DO UPDATE
        SET original_filename = EXCLUDED.original_filename,
            content_type = EXCLUDED.content_type,
            archived = EXCLUDED.archived,
            updated_at = NOW()
      `,
      [key, file.name, contentType, archived]
    );
    copied += 1;
  }

  return copied;
}

try {
  const eventCount = await copyEvents();
  const imageCount = await copyStorageFolder("images", false);
  const archiveCount = await copyStorageFolder("archive", true);
  console.log(
    `Copied ${eventCount} events, ${imageCount} images, and ${archiveCount} archived images from Supabase public read APIs`
  );
} finally {
  await db.end();
}

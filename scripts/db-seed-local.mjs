import "./load-env.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const eventsPath = path.join(root, "events.json");
const publicGalleryDir = path.join(root, "public", "gallery", "small");
const localStorageRoot =
  process.env.LOCAL_STORAGE_ROOT || path.join(root, ".local-storage");

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

const data = JSON.parse(await fs.readFile(eventsPath, "utf8"));
const nextEventId = Number(data.next_event);

function contentTypeFor(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".png") {
    return "image/png";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  return "application/octet-stream";
}

try {
  for (const [index, event] of data.events.entries()) {
    await pool.query(
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
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE
        SET id = EXCLUDED.id,
            title = EXCLUDED.title,
            speaker = EXCLUDED.speaker,
            yt_uuid = EXCLUDED.yt_uuid,
            luma_url = EXCLUDED.luma_url,
            slides = EXCLUDED.slides,
            active = EXCLUDED.active,
            sort_order = EXCLUDED.sort_order
      `,
      [
        Number(event.id),
        event.title,
        event.speaker || null,
        event.yt_uuid || null,
        event.luma_url,
        event.luma_id,
        event.slides || null,
        Number(event.id) >= nextEventId,
        index + 1,
      ]
    );
  }

  console.log(`Seeded ${data.events.length} events from events.json`);

  const galleryFiles = (await fs.readdir(publicGalleryDir)).filter((file) => {
    return /\.(jpe?g|png|webp)$/i.test(file);
  });

  for (const file of galleryFiles) {
    const objectKey = `images/${file}`;
    const target = path.join(localStorageRoot, "gallery", objectKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(publicGalleryDir, file), target);
    await pool.query(
      `
        INSERT INTO gallery_images (object_key, original_filename, content_type, archived)
        VALUES ($1, $2, $3, false)
        ON CONFLICT (object_key) DO UPDATE
        SET original_filename = EXCLUDED.original_filename,
            content_type = EXCLUDED.content_type,
            archived = false,
            updated_at = NOW()
      `,
      [objectKey, file, contentTypeFor(file)]
    );
  }

  console.log(`Seeded ${galleryFiles.length} local gallery images`);
} finally {
  await pool.end();
}

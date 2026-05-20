import "./load-env.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import {
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import pg from "pg";

const { Pool } = pg;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
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
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
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

async function copyFolder(folder, archived) {
  const { data: files, error } = await supabase.storage
    .from("gallery")
    .list(folder, { limit: 1000 });

  if (error) {
    throw error;
  }

  for (const file of files || []) {
    if (!file.name || file.name.startsWith(".")) {
      continue;
    }

    const key = `${folder}/${file.name}`;
    const { data, error: downloadError } = await supabase.storage
      .from("gallery")
      .download(key);

    if (downloadError) {
      throw downloadError;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const contentType = data.type || "application/octet-stream";
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
    console.log(`Copied gallery/${key}`);
  }
}

try {
  await copyFolder("images", false);
  await copyFolder("archive", true);
} finally {
  await db.end();
}

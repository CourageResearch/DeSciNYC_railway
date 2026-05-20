import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { hasDatabaseConfig, query } from "./db";

type GalleryRow = {
  object_key: string;
  original_filename: string;
  content_type: string | null;
  archived: boolean;
  created_at: Date | string | null;
};

export type GalleryImage = {
  original: string;
  thumbnail: string;
};

type UploadInput = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
};

const LOCAL_ROOT =
  process.env.LOCAL_STORAGE_ROOT || path.join(process.cwd(), ".local-storage");
const GALLERY_PREFIX = "gallery";

let s3Client: S3Client | null = null;

function hasS3Config() {
  return Boolean(
    (process.env.S3_BUCKET || process.env.BUCKET) &&
      (process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3) &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}

function getBucketName() {
  const bucket = process.env.S3_BUCKET || process.env.BUCKET;
  if (!bucket) {
    throw new Error("S3 bucket is not configured");
  }

  return bucket;
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }

  return s3Client;
}

function publicGalleryUrl(objectKey: string) {
  return `/api/gallery/${objectKey.split("/").map(encodeURIComponent).join("/")}`;
}

function safeObjectKey(objectKey: string) {
  const normalized = objectKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    throw new Error("Invalid gallery object key");
  }

  return normalized;
}

function localPathFor(objectKey: string) {
  return path.join(LOCAL_ROOT, GALLERY_PREFIX, safeObjectKey(objectKey));
}

function archiveKey(objectKey: string) {
  const fileName = path.basename(objectKey);
  return `archive/${fileName}`;
}

export async function listGalleryImages(): Promise<GalleryImage[]> {
  if (!hasDatabaseConfig()) {
    return [];
  }

  const { rows } = await query<GalleryRow>(
    `
      SELECT object_key, original_filename, content_type, archived, created_at
      FROM gallery_images
      WHERE archived = false
      ORDER BY created_at DESC, object_key ASC
    `
  );

  return rows.map((row) => {
    const url = publicGalleryUrl(row.object_key);
    return { original: url, thumbnail: url };
  });
}

export async function listAdminGalleryImages() {
  if (!hasDatabaseConfig()) {
    return [];
  }

  const { rows } = await query<GalleryRow>(
    `
      SELECT object_key, original_filename, content_type, archived, created_at
      FROM gallery_images
      WHERE archived = false
      ORDER BY created_at DESC, object_key ASC
    `
  );

  return rows.map((row) => ({
    key: row.object_key,
    url: publicGalleryUrl(row.object_key),
    filename: row.original_filename,
  }));
}

export async function saveGalleryImage(input: UploadInput) {
  const safeName = path.basename(input.fileName).replace(/[^a-zA-Z0-9._-]/g, "-");
  const objectKey = `images/${Date.now()}-${safeName || "upload"}`;

  if (hasS3Config()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getBucketName(),
        Key: objectKey,
        Body: input.buffer,
        ContentType: input.contentType,
      })
    );
  } else {
    const target = localPathFor(objectKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, input.buffer);
  }

  const { rows } = await query<GalleryRow>(
    `
      INSERT INTO gallery_images (object_key, original_filename, content_type, archived)
      VALUES ($1, $2, $3, false)
      ON CONFLICT (object_key) DO UPDATE
      SET original_filename = EXCLUDED.original_filename,
          content_type = EXCLUDED.content_type,
          archived = false,
          updated_at = NOW()
      RETURNING object_key, original_filename, content_type, archived, created_at
    `,
    [objectKey, input.fileName, input.contentType]
  );

  return rows[0];
}

export async function archiveGalleryImage(objectKey: string) {
  const sourceKey = safeObjectKey(objectKey);
  const targetKey = archiveKey(sourceKey);

  if (hasS3Config()) {
    const client = getS3Client();
    const bucket = getBucketName();
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${sourceKey}`,
        Key: targetKey,
      })
    );
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: sourceKey }));
  } else {
    const source = localPathFor(sourceKey);
    const target = localPathFor(targetKey);
    await fs.mkdir(path.dirname(target), { recursive: true });
    try {
      await fs.rename(source, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  await query(
    `
      UPDATE gallery_images
      SET object_key = $2,
          archived = true,
          updated_at = NOW()
      WHERE object_key = $1
    `,
    [sourceKey, targetKey]
  );
}

export async function serveGalleryObject(objectKey: string) {
  const safeKey = safeObjectKey(objectKey);

  if (hasS3Config()) {
    const url = await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: getBucketName(), Key: safeKey }),
      { expiresIn: 60 * 60 }
    );
    return NextResponse.redirect(url);
  }

  const file = await fs.readFile(localPathFor(safeKey));
  const contentType = await getGalleryContentType(safeKey);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      ...(contentType ? { "Content-Type": contentType } : {}),
      "Cache-Control": "public, max-age=3600",
    },
  });
}

async function getGalleryContentType(objectKey: string) {
  if (!hasDatabaseConfig()) {
    return null;
  }

  const { rows } = await query<{ content_type: string | null }>(
    "SELECT content_type FROM gallery_images WHERE object_key = $1 LIMIT 1",
    [objectKey]
  );

  return rows[0]?.content_type || null;
}

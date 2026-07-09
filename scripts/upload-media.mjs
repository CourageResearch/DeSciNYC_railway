import "./load-env.mjs";

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const [filePath, objectKey, requestedContentType] = process.argv.slice(2);

if (!filePath || !objectKey) {
  throw new Error(
    "Usage: node scripts/upload-media.mjs <file-path> <media/object-key> [content-type]"
  );
}

if (!objectKey.startsWith("media/") || objectKey.includes("..")) {
  throw new Error("Object key must be a safe path below media/");
}

const bucket = process.env.S3_BUCKET || process.env.BUCKET;
const endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
  throw new Error("S3 media storage is not configured");
}

const contentTypes = {
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};
const contentType =
  requestedContentType || contentTypes[path.extname(filePath).toLowerCase()];

if (!contentType) {
  throw new Error("Content type is required for this file extension");
}

const file = await stat(filePath);
if (!file.isFile()) {
  throw new Error("Media path must point to a file");
}

const client = new S3Client({
  region: process.env.AWS_REGION || "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

await client.send(
  new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: createReadStream(filePath),
    ContentLength: file.size,
    ContentType: contentType,
    ContentDisposition: `inline; filename="${path.basename(filePath)}"`,
    CacheControl: "public, max-age=31536000, immutable",
  })
);

console.log(`Uploaded ${objectKey} (${file.size} bytes, ${contentType})`);

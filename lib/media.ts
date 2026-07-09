import "server-only";

import {
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type EventMedia = {
  eventUuid: string;
  lumaId: string;
  videoKey: string;
  posterKey: string;
};

const EVENT_MEDIA: EventMedia[] = [
  {
    eventUuid: "034b5719-7ea0-4ab0-b817-3149042a9f26",
    lumaId: "evt-dc04Au36HzE1tvh",
    videoKey: "media/events/descinyc19-crispr.mp4",
    posterKey: "media/events/descinyc19-crispr-poster.png",
  },
];

type MediaObject = {
  contentType: string;
  fileName: string;
};

const MEDIA_OBJECTS = new Map<string, MediaObject>(
  EVENT_MEDIA.flatMap((media): [string, MediaObject][] => [
    [
      media.videoKey,
      {
        contentType: "video/mp4",
        fileName: "descinyc19-crispr.mp4",
      },
    ],
    [
      media.posterKey,
      {
        contentType: "image/png",
        fileName: "descinyc19-crispr-poster.png",
      },
    ],
  ])
);

let mediaS3Client: S3Client | null = null;

function getBucketName() {
  const bucket = process.env.S3_BUCKET || process.env.BUCKET;
  if (!bucket) {
    throw new Error("Media storage bucket is not configured");
  }

  return bucket;
}

function getMediaS3Client() {
  if (!mediaS3Client) {
    const endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("Media storage is not configured");
    }

    mediaS3Client = new S3Client({
      region: process.env.AWS_REGION || "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    });
  }

  return mediaS3Client;
}

export function getEventMedia(event: {
  event_uuid: string | null;
  luma_id: string;
}) {
  return (
    EVENT_MEDIA.find(
      (media) =>
        media.eventUuid === event.event_uuid || media.lumaId === event.luma_id
    ) || null
  );
}

export function getMediaUrl(objectKey: string) {
  const path = objectKey
    .replace(/^media\//, "")
    .split("/")
    .map(encodeURIComponent)
    .join("/");

  return `/api/media/${path}`;
}

export async function getSignedMediaUrl(
  objectKey: string,
  method: "GET" | "HEAD"
) {
  const mediaObject = MEDIA_OBJECTS.get(objectKey);
  if (!mediaObject) {
    return null;
  }

  const client = getMediaS3Client();
  const bucket = getBucketName();
  // Keep the direct URL valid longer than the 98-minute video so late seeks
  // cannot fail if a browser reuses the redirected storage URL.
  const expiresIn = 7 * 24 * 60 * 60;

  if (method === "HEAD") {
    return getSignedUrl(
      client,
      new HeadObjectCommand({ Bucket: bucket, Key: objectKey }),
      { expiresIn }
    );
  }

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ResponseContentDisposition: `inline; filename="${mediaObject.fileName}"`,
      ResponseContentType: mediaObject.contentType,
    }),
    { expiresIn }
  );
}

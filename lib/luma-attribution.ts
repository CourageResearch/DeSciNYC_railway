import {
  TRACKING_PARAM_KEYS,
  cleanTrackingValue,
  findAttributionEventByUrl,
  getDefaultAttributionEvent,
  type TrackingParams,
} from "@/lib/attribution";
import { hashEmailForX, sha256Hex } from "@/lib/x-conversions";

type PayloadEntry = {
  path: string[];
  key: string;
  value: string;
};

export type ParsedLumaConversion = {
  webhookType: string | null;
  approvalStatus: string | null;
  attendeeName: string | null;
  email: string | null;
  hashedEmail: string | null;
  lumaEventId: string | null;
  lumaGuestId: string | null;
  lumaTicketId: string | null;
  conversionId: string;
  conversionTime: string;
  tracking: TrackingParams;
  twclid: string | null;
  eventSourceUrl: string;
  conversionValue: string | null;
  sanitizedPayload: unknown;
};

const REDACTED = "[redacted]";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getStringAtPath(value: unknown, path: string[]) {
  let current = value;

  for (const segment of path) {
    if (!isRecord(current)) {
      return null;
    }

    current = current[segment];
  }

  return typeof current === "string" ? current.trim() || null : null;
}

function collectEntries(
  value: unknown,
  path: string[] = [],
  entries: PayloadEntry[] = []
) {
  if (entries.length > 1000) {
    return entries;
  }

  if (typeof value === "string" || typeof value === "number") {
    entries.push({
      path,
      key: path[path.length - 1] || "",
      value: String(value).trim(),
    });
    return entries;
  }

  if (Array.isArray(value)) {
    value.slice(0, 100).forEach((item, index) => {
      collectEntries(item, [...path, String(index)], entries);
    });
    return entries;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      collectEntries(item, [...path, key], entries);
    }
  }

  return entries;
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function findByKey(
  entries: PayloadEntry[],
  matcher: (leafKey: string, fullPath: string, value: string) => boolean
) {
  return (
    entries.find((entry) =>
      matcher(
        normalizeKey(entry.key),
        normalizeKey(entry.path.join("_")),
        entry.value
      )
    )?.value || null
  );
}

function findAttendeeName(entries: PayloadEntry[]) {
  return findByKey(entries, (leafKey, fullPath, value) => {
    return (
      value.length <= 120 &&
      !value.includes("@") &&
      !/^https?:\/\//i.test(value) &&
      (leafKey === "name" || leafKey.endsWith("_name")) &&
      /(attendee|buyer|contact|guest|person|registration|user)/.test(fullPath) &&
      !/(calendar|event|organization|ticket_type)/.test(fullPath)
    );
  });
}

function extractUrlParams(value: string) {
  try {
    return new URL(value).searchParams;
  } catch {
    const queryIndex = value.indexOf("?");
    if (queryIndex === -1) {
      return null;
    }

    try {
      return new URLSearchParams(value.slice(queryIndex + 1));
    } catch {
      return null;
    }
  }
}

function getTrackingFromEntries(entries: PayloadEntry[]) {
  const tracking: TrackingParams = {};

  for (const entry of entries) {
    const leafKey = normalizeKey(entry.key);
    if ((TRACKING_PARAM_KEYS as readonly string[]).includes(leafKey)) {
      tracking[leafKey as keyof TrackingParams] = cleanTrackingValue(
        entry.value
      );
    }

    const urlParams = extractUrlParams(entry.value);
    if (!urlParams) {
      continue;
    }

    for (const key of TRACKING_PARAM_KEYS) {
      tracking[key] = tracking[key] || cleanTrackingValue(urlParams.get(key));
    }
  }

  return tracking;
}

function findLikelyUrl(entries: PayloadEntry[]) {
  const candidates = entries
    .map((entry) => entry.value)
    .filter((value) => /^https?:\/\//i.test(value));

  return (
    candidates.find((value) => findAttributionEventByUrl(value)) ||
    candidates.find(
      (value) => value.includes("luma.com/") || value.includes("lu.ma/")
    ) ||
    `https://desci.nyc/${getDefaultAttributionEvent().slug}`
  );
}

function parseMoney(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) {
    return null;
  }

  const amount = Number(match[0]);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return amount.toFixed(2);
}

function sanitizePayload(value: unknown, path: string[] = [], depth = 0): unknown {
  if (depth > 8) {
    return "[truncated]";
  }

  if (typeof value === "string") {
    const pathKey = normalizeKey(path.join("_"));
    if (
      /email|phone|name|address/.test(pathKey) ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      return REDACTED;
    }

    return value.length > 1000 ? `${value.slice(0, 1000)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, 50)
      .map((item, index) => sanitizePayload(item, [...path, String(index)], depth + 1));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 80)
        .map(([key, item]) => [
          key,
          sanitizePayload(item, [...path, key], depth + 1),
        ])
    );
  }

  return null;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function parseLumaConversionPayload(
  payload: unknown
): ParsedLumaConversion {
  const entries = collectEntries(payload).filter((entry) => entry.value);
  const tracking = getTrackingFromEntries(entries);
  const webhookType = getStringAtPath(payload, ["type"]);
  const approvalStatus =
    getStringAtPath(payload, ["data", "approval_status"]) ||
    findByKey(entries, (leafKey, fullPath) => {
      return leafKey === "approval_status" || fullPath.includes("approval_status");
    });
  const email = findByKey(
    entries,
    (leafKey, fullPath, value) =>
      (leafKey.includes("email") || fullPath.includes("email")) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
  const attendeeName = findAttendeeName(entries);
  const hashedEmail = hashEmailForX(email);
  const lumaEventId =
    findByKey(entries, (_leafKey, fullPath, value) => {
      return fullPath.includes("event") && /^evt-[A-Za-z0-9]+$/.test(value);
    }) ||
    findByKey(entries, (_leafKey, _fullPath, value) =>
      /^evt-[A-Za-z0-9]+$/.test(value)
  );
  const lumaGuestId = findByKey(
    entries,
    (leafKey, fullPath, value) =>
      (fullPath.includes("guest") || fullPath.includes("registration")) &&
      (leafKey.includes("id") || leafKey.includes("api_id")) &&
      /^[A-Za-z0-9_-]{6,}$/.test(value)
  );
  const nativeWebhookType = normalizeKey(getStringAtPath(payload, ["type"]) || "");
  const nativeDataApiId = getStringAtPath(payload, ["data", "api_id"]);
  const nativeTicketId =
    nativeWebhookType.includes("ticket") &&
    nativeDataApiId &&
    !nativeDataApiId.startsWith("ttyp-")
      ? nativeDataApiId
      : null;
  const lumaTicketId =
    findByKey(
      entries,
      (leafKey, fullPath, value) =>
        fullPath.includes("ticket") &&
        (leafKey.includes("id") || leafKey.includes("api_id")) &&
        !value.startsWith("ttyp-") &&
        /^[A-Za-z0-9_-]{6,}$/.test(value)
    ) || nativeTicketId;
  const eventSourceUrl = findLikelyUrl(entries);
  const conversionValue = parseMoney(
    findByKey(
      entries,
      (leafKey, fullPath) =>
        leafKey.includes("amount") ||
        leafKey.includes("price") ||
        leafKey.includes("value") ||
        fullPath.includes("ticket_price")
    )
  );
  const conversionTime =
    findByKey(
      entries,
      (leafKey, fullPath, value) =>
        (leafKey.includes("created") ||
          leafKey.includes("registered") ||
          leafKey.includes("timestamp") ||
          fullPath.includes("created_at")) &&
        !Number.isNaN(new Date(value).getTime())
    ) || new Date().toISOString();

  const conversionIdSeed =
    lumaTicketId ||
    lumaGuestId ||
    [
      lumaEventId || getDefaultAttributionEvent().lumaEventId,
      tracking.utm_id,
      tracking.twclid,
      hashedEmail,
      conversionTime.slice(0, 10),
    ]
      .filter(Boolean)
      .join(":") ||
    stableStringify(payload);

  return {
    webhookType,
    approvalStatus,
    attendeeName,
    email,
    hashedEmail,
    lumaEventId,
    lumaGuestId,
    lumaTicketId,
    conversionId: `luma-${sha256Hex(conversionIdSeed).slice(0, 32)}`,
    conversionTime: new Date(conversionTime).toISOString(),
    tracking,
    twclid: tracking.twclid || null,
    eventSourceUrl,
    conversionValue,
    sanitizedPayload: sanitizePayload(payload),
  };
}

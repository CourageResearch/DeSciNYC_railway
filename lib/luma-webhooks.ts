import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

type ParsedSignature = {
  timestamp: number | null;
  signatures: string[];
};

export type LumaWebhookVerificationResult =
  | { ok: true; timestamp: number }
  | { ok: false; reason: string };

function parseSignatureHeader(signatureHeader: string | null): ParsedSignature {
  if (!signatureHeader) {
    return { timestamp: null, signatures: [] };
  }

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const signatures: string[] = [];
  let timestamp: number | null = null;

  for (const part of parts) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = part.slice(0, separatorIndex);
    const value = part.slice(separatorIndex + 1);

    if (key === "t") {
      const parsed = Number(value);
      timestamp = Number.isFinite(parsed) ? parsed : null;
    }

    if (key === "v1" && value) {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

function safeCompareHex(expectedHex: string, actualHex: string) {
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = Buffer.from(actualHex, "hex");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function verifyLumaWebhookSignature({
  body,
  secret,
  signatureHeader,
  timestampHeader,
  toleranceSeconds = DEFAULT_TOLERANCE_SECONDS,
  nowSeconds = Math.floor(Date.now() / 1000),
}: {
  body: string;
  secret: string | undefined;
  signatureHeader: string | null;
  timestampHeader: string | null;
  toleranceSeconds?: number;
  nowSeconds?: number;
}): LumaWebhookVerificationResult {
  if (!secret) {
    return { ok: false, reason: "missing_secret" };
  }

  const parsed = parseSignatureHeader(signatureHeader);
  const fallbackTimestamp = timestampHeader ? Number(timestampHeader) : NaN;
  const timestamp = parsed.timestamp || fallbackTimestamp;

  if (!Number.isFinite(timestamp)) {
    return { ok: false, reason: "missing_timestamp" };
  }

  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return { ok: false, reason: "stale_timestamp" };
  }

  if (parsed.signatures.length === 0) {
    return { ok: false, reason: "missing_signature" };
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  if (
    !parsed.signatures.some((signature) =>
      safeCompareHex(expectedSignature, signature)
    )
  ) {
    return { ok: false, reason: "invalid_signature" };
  }

  return { ok: true, timestamp };
}

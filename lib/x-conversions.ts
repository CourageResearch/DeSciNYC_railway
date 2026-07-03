import crypto from "crypto";

export type XConversionInput = {
  conversionId: string;
  conversionTime?: string;
  twclid?: string | null;
  hashedEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  value?: string | null;
  eventSourceUrl?: string | null;
  description?: string | null;
};

export type XConversionResult =
  | {
      sent: true;
      status: number;
      response: unknown;
    }
  | {
      sent: false;
      skippedReason: string;
      status?: number;
      response?: unknown;
      error?: string;
      payload?: unknown;
    };

type XIdentifier =
  | { twclid: string }
  | { hashed_email: string }
  | { ip_address: string; user_agent: string };

function getXConfig() {
  const required = {
    pixelToken: process.env.X_ADS_PIXEL_TOKEN || process.env.X_PIXEL_TOKEN,
    pixelId: process.env.X_ADS_PIXEL_ID,
    eventId: process.env.X_ADS_EVENT_ID,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    ...required,
    missing,
    apiVersion: process.env.X_ADS_API_VERSION || "12",
    dryRun: process.env.X_ADS_DRY_RUN === "true",
  };
}

export function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

export function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashEmailForX(email: string | null | undefined) {
  const normalized = normalizeEmail(email);
  return normalized ? sha256Hex(normalized) : null;
}

export async function sendXConversion(
  input: XConversionInput
): Promise<XConversionResult> {
  const config = getXConfig();
  const identifiers: XIdentifier[] = [];

  if (input.twclid) {
    identifiers.push({ twclid: input.twclid });
  }

  if (input.hashedEmail) {
    identifiers.push({ hashed_email: input.hashedEmail });
  }

  if (input.ipAddress && input.userAgent) {
    identifiers.push({
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
    });
  }

  if (identifiers.length === 0) {
    return {
      sent: false,
      skippedReason: "missing_conversion_identifier",
    };
  }

  const conversion: Record<string, unknown> = {
    conversion_time: input.conversionTime || new Date().toISOString(),
    event_id: config.eventId || "missing-event-id",
    identifiers,
    conversion_id: input.conversionId,
    description: input.description || "DeSciNYC Luma ticket registration",
  };

  if (input.value) {
    conversion.value = input.value;
    conversion.number_items = 1;
  }

  if (input.eventSourceUrl) {
    conversion.event_source_url = input.eventSourceUrl;
  }

  const payload = {
    conversions: [conversion],
  };

  if (config.missing.length > 0) {
    return {
      sent: false,
      skippedReason: `missing_x_ads_config:${config.missing.join(",")}`,
      payload,
    };
  }

  if (config.dryRun) {
    return {
      sent: false,
      skippedReason: "x_ads_dry_run",
      payload,
    };
  }

  const pixelId = encodeURIComponent(config.pixelId as string);
  const url = `https://ads-api.x.com/${config.apiVersion}/measurement/conversions/${pixelId}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-Pixel-Token": config.pixelToken as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const responseText = await response.text();
    let responseBody: unknown = responseText;

    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseBody = responseText;
    }

    if (!response.ok) {
      return {
        sent: false,
        skippedReason: "x_ads_api_error",
        status: response.status,
        response: responseBody,
        error:
          typeof responseBody === "string"
            ? responseBody
            : JSON.stringify(responseBody),
      };
    }

    return {
      sent: true,
      status: response.status,
      response: responseBody,
    };
  } catch (error) {
    return {
      sent: false,
      skippedReason: "x_ads_network_error",
      error: error instanceof Error ? error.message : "Unknown X Ads error",
    };
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

export {};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function baseUrl() {
  const configured =
    process.env.ADS_SYNC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    "https://desci.nyc";
  const withProtocol = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;

  return withProtocol.replace(/\/+$/, "");
}

function getCookieHeader(response: Response) {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies: string[] =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : ([headers.get("set-cookie")].filter(Boolean) as string[]);

  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function readJson(response: Response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = await readJson(response);

  if (!response.ok) {
    const detail =
      body && typeof body === "object" && "error" in body ? body.error : body;
    throw new Error(`HTTP ${response.status}: ${detail || "request failed"}`);
  }

  return { response, body };
}

async function main() {
  if (!process.env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is required for ads sync");
  }

  const root = baseUrl();
  const endDate = process.env.ADS_SYNC_END_DATE || isoDate(new Date());
  const windowDays = Number(process.env.ADS_SYNC_WINDOW_DAYS || 30);
  const startDate =
    process.env.ADS_SYNC_START_DATE ||
    isoDate(
      new Date(
        new Date(`${endDate}T00:00:00Z`).getTime() -
          (Number.isFinite(windowDays) ? windowDays : 30) * DAY_MS
      )
    );
  const platform = process.env.ADS_SYNC_PLATFORM || "all";
  const login = await requestJson(`${root}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
  });
  const cookie = getCookieHeader(login.response);

  if (!cookie) {
    throw new Error("Admin login did not return a session cookie");
  }

  const { body } = await requestJson(`${root}/api/ads/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({ startDate, endDate, platform }),
  });

  console.log(
    JSON.stringify({
      ok: Boolean(body?.ok),
      range: body?.range || { startDate, endDate },
      results: Array.isArray(body?.results)
        ? body.results.map((result: Record<string, unknown>) => ({
            platform: result.platform,
            status: result.status,
            configured: result.configured,
            rowsSynced: result.rowsSynced,
            missingConfig: result.missingConfig || [],
            error: result.error || null,
          }))
        : [],
    })
  );

  if (!body?.ok) {
    throw new Error("Ads sync returned ok=false");
  }
}

await main();

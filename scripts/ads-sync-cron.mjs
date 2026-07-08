import "./load-env.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function baseUrl() {
  const configured =
    process.env.ADS_SYNC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    process.env.RAILWAY_STATIC_URL ||
    "https://desci.nyc";
  const withProtocol = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;

  return withProtocol.replace(/\/+$/, "");
}

function getCookieHeader(response) {
  const headers = response.headers;
  const cookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : [headers.get("set-cookie")].filter(Boolean);

  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

async function readJson(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function requestJson(url, init) {
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

  const endDate = process.env.ADS_SYNC_END_DATE || isoDate(new Date());
  const startDate =
    process.env.ADS_SYNC_START_DATE ||
    process.env.ADS_REPORTING_START_DATE ||
    isoDate(new Date(new Date(`${endDate}T00:00:00Z`).getTime() - 30 * DAY_MS));
  const platform = process.env.ADS_SYNC_PLATFORM || "all";
  const root = baseUrl();
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

  const results = Array.isArray(body?.results) ? body.results : [];
  const summary = results.map((result) => ({
    platform: result.platform,
    status: result.status,
    configured: result.configured,
    rowsSynced: result.rowsSynced,
    missingConfig: result.missingConfig || [],
    warnings: result.warnings || [],
    error: result.error || null,
  }));

  console.log(
    JSON.stringify(
      {
        ok: Boolean(body?.ok),
        baseUrl: root,
        range: body?.range || { startDate, endDate },
        results: summary,
      },
      null,
      2
    )
  );

  if (!body?.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

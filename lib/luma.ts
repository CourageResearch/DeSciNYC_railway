export type LumaEventResponse = {
  event?: {
    api_id?: string;
    cover_url?: string;
    end_at?: string;
    name?: string;
    start_at?: string;
    timezone?: string;
    url?: string;
  };
};

function normalizeLumaUrl(lumaUrl?: string | null) {
  if (!lumaUrl) {
    return null;
  }

  try {
    return new URL(lumaUrl).toString();
  } catch {
    return `https://lu.ma/${lumaUrl.replace(/^\/+/, "")}`;
  }
}

function getInitialLumaData(html: string): LumaEventResponse | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
  );

  if (!match?.[1]) {
    return null;
  }

  try {
    const payload = JSON.parse(match[1]);
    const initialData = payload?.props?.pageProps?.initialData?.data;
    const event = initialData?.event;

    if (!event) {
      return null;
    }

    return {
      event: {
        api_id: event.api_id,
        cover_url: event.cover_url,
        end_at: event.end_at,
        name: event.name,
        start_at: event.start_at,
        timezone: event.timezone,
        url: normalizeLumaUrl(event.url) || undefined,
      },
    };
  } catch (error) {
    console.error("Failed to parse public Luma page data:", error);
    return null;
  }
}

async function getPublicLumaEvent(lumaUrl?: string | null) {
  const url = normalizeLumaUrl(lumaUrl);
  if (!url) {
    return null;
  }

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    return getInitialLumaData(await response.text());
  } catch (error) {
    console.error(`Failed to fetch public Luma page ${url}:`, error);
    return null;
  }
}

export async function getLumaEvent(
  lumaId: string,
  lumaUrl?: string | null
): Promise<LumaEventResponse | null> {
  if (!process.env.LUMA_API_KEY) {
    if (process.env.NODE_ENV !== "development") {
      return null;
    }

    return getPublicLumaEvent(lumaUrl);
  }

  const config = {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-luma-api-key": process.env.LUMA_API_KEY,
    },
  };

  try {
    const response = await fetch(
      `https://api.lu.ma/public/v1/event/get?api_id=${lumaId}`,
      config
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch Luma event ${lumaId}:`,
        response.status,
        response.statusText
      );
      return getPublicLumaEvent(lumaUrl);
    }

    return response.json();
  } catch (error) {
    console.error(`Failed to fetch Luma event ${lumaId}:`, error);
    return getPublicLumaEvent(lumaUrl);
  }
}

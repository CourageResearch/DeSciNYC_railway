import type { MetadataRoute } from "next";
import { MARKO_TALK } from "@/lib/marko-talk";
import { transcripts } from "@/lib/transcripts";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://desci.nyc" },
    { url: "https://desci.nyc/biological-futures" },
    {
      url: `https://desci.nyc${MARKO_TALK.pagePath}`,
      lastModified: MARKO_TALK.summaryPublishedAt,
    },
    ...transcripts.filter((item) => item.videoId).map((item) => ({
      url: `https://desci.nyc${item.pagePath}`,
    })),
  ];
}

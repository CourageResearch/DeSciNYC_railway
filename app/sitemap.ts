import type { MetadataRoute } from "next";
import { MARKO_TALK } from "@/lib/marko-talk";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://desci.nyc" },
    { url: "https://desci.nyc/biological-futures" },
    {
      url: `https://desci.nyc${MARKO_TALK.pagePath}`,
      lastModified: MARKO_TALK.summaryPublishedAt,
    },
  ];
}

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/ads", "/api/admin", "/api/ads"],
    },
    sitemap: "https://desci.nyc/sitemap.xml",
  };
}

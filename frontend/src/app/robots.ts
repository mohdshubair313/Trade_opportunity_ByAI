import type { MetadataRoute } from "next";

/**
 * Dynamic robots.txt — Next.js serves this at /robots.txt automatically.
 *
 * Allows all crawlers and points to the sitemap for discovery.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: "https://tradeinsight.shubair.in/sitemap.xml",
  };
}

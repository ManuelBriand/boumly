import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://boumly.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/fr/dashboard",
        "/en/dashboard",
        "/fr/account",
        "/en/account",
        "/fr/login",
        "/en/login",
        "/fr/register",
        "/en/register",
        "/api",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}

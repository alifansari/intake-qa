import type { MetadataRoute } from "next";

const BASE = "https://plaintiffops.com";

// Marketing is indexable; authenticated / product / operator routes are not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/queue",
        "/billing",
        "/settings",
        "/triage",
        "/calibration",
        "/funnel",
        "/reps",
        "/statement",
        "/getting-started",
        "/login",
        "/api",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}

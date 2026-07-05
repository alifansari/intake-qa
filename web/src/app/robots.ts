import type { MetadataRoute } from "next";

const BASE = "https://intake-qa.vercel.app";

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
        "/onboard",
        "/getting-started",
        "/login",
        "/api",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}

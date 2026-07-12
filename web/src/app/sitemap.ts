import type { MetadataRoute } from "next";

const BASE = "https://plaintiffops.com";

// Public, indexable marketing surfaces only. Authenticated/product routes are
// disallowed in robots.ts and omitted here.
const ROUTES = [
  "",
  "/apply",
  "/how-it-works",
  "/compliance",
  "/pricing",
  "/honesty",
  "/faq",
  "/security",
  "/founder",
  "/letter",
  "/audit",
  "/terms",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return ROUTES.map((r) => ({
    url: `${BASE}${r}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r === "" ? 1 : 0.7,
  }));
}

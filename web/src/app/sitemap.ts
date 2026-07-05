import type { MetadataRoute } from "next";

const BASE = "https://intake-qa.vercel.app";

// Public, indexable marketing surfaces only. Authenticated/product routes are
// disallowed in robots.ts and omitted here.
const ROUTES = [
  "",
  "/how-it-works",
  "/compliance",
  "/pricing",
  "/honesty",
  "/faq",
  "/security",
  "/founder",
  "/concierge",
  "/audit",
  "/demo",
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

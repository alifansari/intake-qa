// The public marketing surfaces. The product Nav hides itself on these so the
// marketing shell (its own nav/footer/sticky CTA) owns the chrome. Keep in sync
// with the (marketing) route group.

export const MARKETING_ROUTES = [
  "/",
  "/pricing",
  "/honesty",
  "/compliance",
  "/how-it-works",
  "/faq",
  "/security",
  "/founder",
  "/concierge",
  "/terms",
  "/privacy",
];

export function isMarketingRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return MARKETING_ROUTES.some((r) => r !== "/" && (pathname === r || pathname.startsWith(r + "/")));
}

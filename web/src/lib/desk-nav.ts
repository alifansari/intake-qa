// The desk's screens, defined ONCE — the single source of truth for every nav
// that shows desk links. Both `src/app/desk/layout.tsx` (the real desk header)
// and `src/components/nav.tsx` (the small bar on /billing + /settings) render
// from this list, so labels + routes can never drift apart again.
//
// 2026-07-20 (B-021): re-ordered to the retired-scorer positioning — the LIVE
// surfaces lead (Cockpit is the primary CTA; the live queue is the day-to-day
// home), and the retrospective "what slipped" money view is demoted to a normal
// tab. `visibility` gates a link to a role; `primary` is the filled CTA.
export type DeskLink = {
  href: string;
  label: string;
  // undefined = everyone; "manager" = managers/admins only; "founder" = founder only
  visibility?: "manager" | "founder";
  primary?: boolean;
};

export const DESK_LINKS: readonly DeskLink[] = [
  // The Cockpit (in-call screen) returns here as the primary CTA once it ships to
  // production. Until then the live queue is the front door (B-021 scoped deploy).
  { href: "/desk/triage", label: "Live queue", primary: true },
  { href: "/desk/what-slipped", label: "What slipped" },
  { href: "/desk/coach", label: "Coach" },
  { href: "/desk/calibration", label: "Our accuracy" },
  { href: "/desk/receipts", label: "Recovered" },
  { href: "/desk/scorecard", label: "Scorecard", visibility: "manager" },
  { href: "/desk/signal", label: "Marketing", visibility: "manager" },
  { href: "/desk/team", label: "Team", visibility: "manager" },
  { href: "/desk/review", label: "Analyst review", visibility: "founder" },
  { href: "/studio", label: "Studio", visibility: "founder" },
  { href: "/desk/settings", label: "Settings", visibility: "manager" },
] as const;

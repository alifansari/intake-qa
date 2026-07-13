// The desk’s screens, defined once. Both navs that show desk links
// (src/components/nav.tsx and src/app/desk/layout.tsx) import this list so the
// labels can never drift apart again.
export const DESK_LINKS = [
  { href: "/desk/queue", label: "Missed cases" },
  { href: "/desk/upload", label: "Upload calls" },
  { href: "/desk/documents", label: "Documents" },
  { href: "/desk/calls", label: "Calls" },
  { href: "/desk/scorecard", label: "Scorecard" },
  { href: "/desk/settings", label: "Settings" },
] as const;

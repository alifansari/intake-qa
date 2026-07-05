// Consolidation map (item 3): the ~7 prior internal tabs redirect to the four
// new desk screens. No data loss — data lives in the DB; only the routes move.
// Imported by next.config.ts (to emit real redirects) AND by the redirect test
// (single source of truth). Permanent 308s.
export const DESK_REDIRECTS = [
  { source: "/dashboard", destination: "/desk/queue", permanent: true },
  { source: "/queue", destination: "/desk/queue", permanent: true },
  { source: "/triage", destination: "/desk/queue", permanent: true },
  { source: "/reps", destination: "/desk/queue", permanent: true },
  { source: "/calibration", destination: "/desk/queue", permanent: true },
  { source: "/statement", destination: "/desk/documents", permanent: true },
  { source: "/funnel", destination: "/desk/reconciliation", permanent: true },
  { source: "/getting-started", destination: "/desk/settings", permanent: true },
];

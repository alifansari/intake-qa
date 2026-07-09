// Security & trust layer as a FIRST-CLASS config/status object (module 9),
// not scattered prose. This is the single source the compliance memo, the
// security page, and the founder status view all read — when posture changes,
// it changes here.
//
// Claims discipline (compliance §IV/§V): every field below states either a
// present-tense fact about the build or an explicitly-labeled roadmap state.
// No aspirational claim may be phrased as current.

export const SECURITY_POSTURE = Object.freeze({
  version: "2026-07-09",

  encryption: {
    at_rest: "Supabase Postgres + Storage encryption at rest (AES-256)",
    in_transit: "TLS 1.2+ on every hop",
    credentials: "CRM credentials encrypted app-side (AES-256-GCM, integrations/crypto.mjs) before storage",
  },

  access_control: {
    model: "RBAC via Supabase Auth + Postgres RLS on every firm-data table",
    access_logging: "artifact_access_log + report_access_events record who viewed/exported what",
    founder_surfaces: "Studio + admin routes triple-gated (proxy allowlist, per-route guard, RLS)",
  },

  data_residency: { region: "us", note: "US data residency (Supabase US region + Vercel US functions)" },

  subprocessors: [
    { name: "Supabase", purpose: "database, auth, file storage" },
    { name: "Vercel", purpose: "application hosting" },
    { name: "AssemblyAI", purpose: "speech-to-text transcription" },
    { name: "Anthropic", purpose: "call analysis (zero-retention API tier; never trains on inputs)" },
    { name: "Twilio", purpose: "SMS delivery" },
    { name: "Dropbox Sign", purpose: "e-signature (NDA, agreements)" },
    { name: "Resend", purpose: "transactional email" },
    { name: "Stripe", purpose: "billing" },
  ],

  data_minimization: {
    retention: "transcripts + messages purged after DATA_RETENTION_DAYS (default 30); recordings within 30 days",
    training: "NEVER train models on client call content (invariant e) — API calls are inference-only",
    deletion: "firm offboarding triggers the deletion cascade including derived data",
  },

  portability: {
    export: "full data export on request (CSV ledger + JSON records)",
    continuity: "TODO(Ali): source-escrow / business-continuity commitment — name the escrow agent before the first paid contract",
  },

  certifications: {
    soc2: {
      status: "roadmap",
      current: "controls mapped; Type I examination not yet started",
      // TODO(Ali): confirm auditor + start date; until then this ships as
      // 'roadmap' and is never presented as an attestation.
      target: "Type I engagement letter by Q4 2026; Type II to follow",
    },
    baa: {
      status: "template drafted",
      note: "BAA covering privilege/PHI-adjacent call content offered to every beta firm; co-exists with the beta NDA",
      // TODO(Ali/Yang): execute-ready BAA is contract language — route for
      // review before first signature (compliance §VII).
    },
  },
});

// Founder status view: which posture items are live facts vs. open TODOs.
export function postureStatus(posture = SECURITY_POSTURE) {
  const todos = [];
  const walk = (obj, path) => {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && v.includes("TODO")) todos.push(`${path}${k}`);
      else if (v && typeof v === "object" && !Array.isArray(v)) walk(v, `${path}${k}.`);
    }
  };
  walk(posture, "");
  return { version: posture.version, openItems: todos, live: todos.length === 0 };
}

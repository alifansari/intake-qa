// The one list of product event names (migration SQLite 0027 / Postgres 0035).
// Both db dialects, the TS boundary helper (src/lib/events.ts), and the
// /studio/beta board import from HERE so the allowlist can never drift from
// the schema CHECK constraint. Add a name here AND in both migrations (a new
// migration for existing databases) — never ad hoc.
//
// upload_started / upload_completed: call sites land with the /desk/upload
// build (sibling branch). apply_submitted: call site lands with the apply-form
// build (sibling branch). Both are defined now so the schema is settled.
//
// firm_created / score_completed: the two lifecycle events the founder-activity
// digest reports on (SQLite 0031 / Postgres 0039). firm_created is recorded when
// a firm is added in the studio; score_completed when the scoring worker finishes
// a call (leaked-signable or clean). Adding a name here REQUIRES a matching CHECK
// migration in BOTH dialects — never ad hoc.

export const EVENT_TYPES = Object.freeze([
  "sign_in",
  "desk_view",
  "digest_sent",
  "digest_opened",
  "digest_link_clicked",
  "callback_marked",
  "upload_started",
  "upload_completed",
  "audit_started",
  "audit_completed",
  "apply_submitted",
  "firm_created",
  "score_completed",
  // call_missed: recorded at ingest when CallRail reports an INBOUND call that
  // went unanswered (answered=false / voicemail). Drives the missed-call pager —
  // the founder-activity sweep turns it into a near-real-time ping instead of a
  // next-morning digest line (SQLite 0039 / Postgres 0047).
  "call_missed",
]);

export function isEventType(name) {
  return EVENT_TYPES.includes(name);
}

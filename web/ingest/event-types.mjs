// The one list of product event names (migration SQLite 0027 / Postgres 0035).
// Both db dialects, the TS boundary helper (src/lib/events.ts), and the
// /studio/beta board import from HERE so the allowlist can never drift from
// the schema CHECK constraint. Add a name here AND in both migrations (a new
// migration for existing databases) — never ad hoc.
//
// upload_started / upload_completed: call sites land with the /desk/upload
// build (sibling branch). apply_submitted: call site lands with the apply-form
// build (sibling branch). Both are defined now so the schema is settled.

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
]);

export function isEventType(name) {
  return EVENT_TYPES.includes(name);
}

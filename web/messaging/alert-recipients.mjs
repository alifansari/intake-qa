// Per-firm alert recipients — pure, no I/O.
//
// WHY: who should be paged is NOT the same as who happens to have a login. A
// firm wants its missed-call pager and daily digest going to a shared intake
// inbox or an on-call address (intake@firm.com), not only to whoever signed up.
// The old Settings "notifications" control was removed precisely because it
// persisted nowhere — a silent no-op is worse than no control. This makes it real.
//
// Also fixes a live gap: memberEmails() reads auth.users and is Postgres-only,
// so on the SQLite pilot it returns [] and the digest silently skips with
// "no recipients". An explicit list works on both dialects.

// Deliberately permissive but structural: we are not in the business of
// RFC-5322 pedantry, only of refusing garbage that would hard-fail the mailer.
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

// A pager that fans out to a crowd is a pager nobody answers; cap it.
export const MAX_ALERT_RECIPIENTS = 10;

// Accepts a comma / semicolon / whitespace separated string (what a human types
// into a settings box). Lowercases, validates, de-duplicates, preserves order.
/**
 * @param {string|null|undefined} raw
 * @returns {string[]}
 */
export function parseAlertRecipients(raw) {
  if (raw == null) return [];
  const parts = String(raw)
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (!EMAIL_RE.test(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

// The firm's explicit list wins; otherwise fall back to whoever has a login.
// Never returns duplicates, never exceeds the cap.
/**
 * @param {{ alertEmails?: string|null, fallback?: string[]|string|null }} [opts]
 * @returns {string[]}
 */
export function resolveAlertRecipients({ alertEmails = null, fallback = [] } = {}) {
  const explicit = parseAlertRecipients(alertEmails);
  if (explicit.length > 0) return explicit.slice(0, MAX_ALERT_RECIPIENTS);
  const fb = Array.isArray(fallback) ? fallback.join(",") : fallback;
  return parseAlertRecipients(fb).slice(0, MAX_ALERT_RECIPIENTS);
}

// What we store back: the normalized, validated list as a canonical string.
/**
 * @param {string|null|undefined} raw
 * @returns {string|null}
 */
export function serializeAlertRecipients(raw) {
  const list = parseAlertRecipients(raw);
  return list.length > 0 ? list.join(", ") : null;
}

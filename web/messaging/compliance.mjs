// Pure compliance helpers for the send layer. NO I/O — just decisions, so they
// are trivially testable and identical for SQLite now and Postgres later. These
// encode the non-negotiable guardrails from CLAUDE.md (quiet hours, opt-out,
// kill switch, TEST_MODE). The send chokepoint (send.mjs) is the ONLY caller
// that acts on them; nothing sends around it.

// Parse an env-style flag. Treats "true"/"1"/"yes"/"on" (any case) as true.
export function truthy(v) {
  if (v == null) return false;
  return /^(true|1|yes|on)$/i.test(String(v).trim());
}

// Global master kill switch (env.KILL_SWITCH). When on, ALL sends halt.
export function killSwitchEngaged(env = process.env) {
  return truthy(env.KILL_SWITCH);
}

// TEST_MODE: sends are simulated (logged, never transmitted).
export function isTestMode(env = process.env) {
  return truthy(env.TEST_MODE);
}

// EMAIL_ENABLED: gates ONLY the Resend email paths (daily digests, weekly
// reports, operator alerts). Deliberately decoupled from TEST_MODE: TEST_MODE +
// KILL_SWITCH arm SMS through the send chokepoint (send.mjs) and stay exactly
// as they are — enabling email must never arm texting, and flipping TEST_MODE
// for texting must never silently start emailing firms. Default (unset) is
// FALSE: no email leaves the system until EMAIL_ENABLED=true is set explicitly.
export function isEmailEnabled(env = process.env) {
  return truthy(env.EMAIL_ENABLED);
}

// Read the quiet-hours window from env, defaulting to 20 (8pm) → 8 (8am).
export function quietHoursFromEnv(env = process.env) {
  const start = Number(env.QUIET_HOURS_START ?? 20);
  const end = Number(env.QUIET_HOURS_END ?? 8);
  return { startHour: start, endHour: end };
}

// Is `now` within the recipient's local quiet hours? The window wraps overnight
// (e.g. 20 → 8 means quiet when local hour >= 20 OR local hour < 8). The
// recipient-local hour is derived from the firm's timezone.
export function isQuietHours(now, timezone, startHour = 20, endHour = 8) {
  const hour = localHour(now, timezone);
  if (startHour === endHour) return false; // no quiet window configured
  if (startHour < endHour) {
    // Same-day window (e.g. 1 → 6): quiet when start <= hour < end.
    return hour >= startHour && hour < endHour;
  }
  // Overnight wrap (e.g. 20 → 8): quiet at/after start OR before end.
  return hour >= startHour || hour < endHour;
}

// The hour (0-23) at `now` in the given IANA timezone. Falls back to UTC hour if
// the timezone is missing/invalid.
export function localHour(now, timezone) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "numeric",
      hour12: false,
    });
    const h = Number(fmt.format(now));
    // Intl can render midnight as 24; normalize to 0.
    return h === 24 ? 0 : h;
  } catch {
    return now.getUTCHours();
  }
}

// Revocation detection — 47 C.F.R. § 64.1200(a)(10), IN FORCE NOW.
//
// The rule requires honoring revocation made "through any reasonable means" and
// EXPRESSLY FORBIDS designating an exclusive means. Keyword-only matching is
// therefore under-enforcement: it misses the revocations a reasonable person
// plainly makes without ever typing a magic word — "leave me alone", "take me
// off your list", "I have an attorney", "don't text me", "not interested".
// FCC 24-24 ¶ 11 treats the seven per se words as "absolute proof"; ¶¶ 30-32 add
// the reasonable-person catch-all for everything else.
//
// We err toward honoring: a false positive only means we don't text, which is
// always the compliance-safe side. Matched as standalone words so "stopping by"
// does not trigger.

// The seven per se words (+ Spanish equivalents — PI intake is often
// Spanish-speaking, and the rule is about what a reasonable person conveyed,
// not about which language they conveyed it in).
const PER_SE_RE =
  /(^|\W)(stop|unsubscribe|cancel|quit|end|revoke|opt\s*out|alto|cancelar|parar|basta|no)(\W|$)/i;

// The reasonable-person catch-all. Everything here is a revocation a court would
// find obvious and a keyword matcher would miss entirely.
const REASONABLE_PERSON_RE = new RegExp(
  [
    "leave me alone",
    "take me off",
    "remove me",
    "delete my number",
    "lose my number",
    "(do ?n'?o?t|dont|stop) (call|text|contact|messag|bother|reach)",
    "no more (calls|texts|messages|contact)",
    "not interested",
    "(i|we) (already )?(got|have|hired|retained) (a|an|another) (lawyer|attorney|firm)",
    "(i'?m|i am) (already )?represented",
    "wrong number",
    // Spanish
    "d[eé]jame en paz",
    "no me (llamen?|escriban?|contacten?|moleste)",
    "ya tengo (un )?abogado",
  ].join("|"),
  "i",
);

// Returns the full revocation read: whether it revoked, and on what basis, so
// the ledger can record the BASIS and the VERBATIM text (the reasonable-person
// test is applied to the person's actual words — a boolean cannot be defended).
export function detectRevocation(text) {
  const raw = String(text ?? "");
  if (PER_SE_RE.test(raw)) {
    return { revoked: true, basis: "per_se_keyword", verbatim: raw };
  }
  if (REASONABLE_PERSON_RE.test(raw)) {
    return { revoked: true, basis: "reasonable_person", verbatim: raw };
  }
  return { revoked: false, basis: null, verbatim: raw };
}

// Back-compat boolean for existing callers. New code should prefer
// detectRevocation() so the basis + verbatim survive into the record.
export function detectOptOut(text) {
  return detectRevocation(text).revoked;
}

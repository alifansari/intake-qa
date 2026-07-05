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

// Opt-out keyword detection (FCC/CTIA standard set + Spanish equivalents, since
// PI intake is often Spanish-speaking). Case-insensitive, matched as a standalone
// word/phrase so "stopping by" does NOT trigger an opt-out. Spanish keywords:
// ALTO (stop), CANCELAR (cancel), PARAR (stop), NO. We err toward honoring an
// opt-out (a false positive just means we don't text — the compliance-safe side).
const OPT_OUT_RE =
  /(^|\W)(stop|unsubscribe|cancel|quit|end|revoke|opt\s*out|alto|cancelar|parar|no)(\W|$)/i;

export function detectOptOut(text) {
  return OPT_OUT_RE.test(String(text ?? ""));
}

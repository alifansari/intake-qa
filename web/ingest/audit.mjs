// Leak Audit — the multi-call upgrade of Demo Mode. A session groups up to 10
// demo uploads under one shareable token; each call runs the UNCHANGED demo
// pipeline (transcribe -> score -> flag -> SOL -> summary -> delete audio); this
// module adds the session lifecycle + the honest aggregation on top.
//
// HARD ISOLATION is preserved: sessions only ever reference demo_calls. Nothing
// here creates a firm record, a conversation, or a message; nothing can send.
//
// The pure aggregation (aggregateAudit) has no I/O so the "$X/month leaking"
// arithmetic is unit-testable and shown honestly on the report.

import { randomBytes } from "node:crypto";
import {
  createAuditSession,
  getAuditSessionByToken,
  updateAuditSession,
  attachDemoCallToSession,
  getAuditSessionCalls,
  countAuditSessionCalls,
  countRecentAuditSessionsByFingerprint,
  getRecentAuditSessionByFingerprint,
  purgeExpiredAuditSessions,
} from "./store.mjs";

export const MAX_CALLS_PER_SESSION = 10;
// A fingerprint gets one audit session per 7 days (that session holds up to 10
// calls) — i.e. "10 calls per 7 days per visitor", matching the spec.
export const MAX_SESSIONS_PER_FINGERPRINT_7D = 1;
export const DEFAULT_MONTHLY_VOLUME = 100; // assumed when the visitor skips volume
export const SESSION_TTL_DAYS = 30;
// A call counts as "signable" at/above the same threshold the flag gate uses.
export const SIGNABLE_SCORE_THRESHOLD = 60;

// Unguessable, URL-safe session token.
export function newAuditToken() {
  return randomBytes(24).toString("base64url");
}

// Normalize a caller-supplied monthly call volume to a positive integer or null.
export function normalizeVolume(v) {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

// --- Pure aggregation --------------------------------------------------------
// `results` is an array of parsed demo result objects (the shape buildDemoResult
// produces), optionally each carrying an `id`/`filename` for best/worst refs.
export function aggregateAudit({ results = [], monthlyCallVolume = null } = {}) {
  const completed = results.filter((r) => r && typeof r === "object");
  const callsReviewed = completed.length;

  const scored = completed.filter((r) => typeof r.overallScore === "number");
  const avgHandlingScore = scored.length
    ? Math.round(scored.reduce((a, r) => a + r.overallScore, 0) / scored.length)
    : null;

  const signableCalls = completed.filter(
    (r) => (r.signabilityScore ?? 0) >= SIGNABLE_SCORE_THRESHOLD,
  ).length;

  const leaked = completed.filter((r) => r.leaked === true);
  const leakedSignable = leaked.length;
  const totalFeeAtRisk = leaked.reduce((a, r) => a + (Number(r.feeAtRisk) || 0), 0);

  let best = null;
  let worst = null;
  for (const r of scored) {
    if (!best || r.overallScore > best.overallScore) best = r;
    if (!worst || r.overallScore < worst.overallScore) worst = r;
  }

  const assumedVolume = normalizeVolume(monthlyCallVolume) == null;
  const volume = normalizeVolume(monthlyCallVolume) ?? DEFAULT_MONTHLY_VOLUME;
  const perCallLeak = callsReviewed > 0 ? totalFeeAtRisk / callsReviewed : 0;
  const projectedMonthlyLeakage = Math.round(perCallLeak * volume);

  return {
    callsReviewed,
    signableCalls,
    leakedSignable,
    totalFeeAtRisk,
    avgHandlingScore,
    best,
    worst,
    // The honest arithmetic, exposed so the report can show its work:
    // projectedMonthlyLeakage = (totalFeeAtRisk / callsReviewed) * monthlyVolume
    perCallLeak: Math.round(perCallLeak),
    monthlyCallVolume: volume,
    assumedVolume,
    projectedMonthlyLeakage,
  };
}

// --- Session lifecycle (persistence-backed) ----------------------------------

// Start a new audit session, enforcing the per-fingerprint 7-day cap. Returns
// { ok, token, sessionId } or { ok:false, reason }.
/**
 * @param {{ db?: unknown, fingerprint?: string|null, monthlyCallVolume?: number|null, now?: Date }} [opts]
 */
export async function startAuditSession({
  db,
  fingerprint = null,
  monthlyCallVolume = null,
  now = new Date(),
} = {}) {
  if (fingerprint) {
    const sinceIso = new Date(
      new Date(now).getTime() - 7 * 24 * 3600 * 1000,
    ).toISOString();
    const recent = await countRecentAuditSessionsByFingerprint(db, fingerprint, sinceIso);
    if (recent >= MAX_SESSIONS_PER_FINGERPRINT_7D) {
      // Don't 7-day-lock a visitor whose first attempt hiccuped mid-upload:
      // if they still have a live session, RESUME it (same 10-call cap) rather
      // than block. Only if there's no usable session do we report the limit.
      const existing = await getRecentAuditSessionByFingerprint(db, fingerprint, new Date(now).toISOString());
      if (existing?.token) {
        return { ok: true, token: existing.token, sessionId: existing.id, resumed: true };
      }
      return { ok: false, reason: "session_limit", retryHint: "one audit per 7 days" };
    }
  }
  const token = newAuditToken();
  const expiresAt = new Date(
    new Date(now).getTime() + SESSION_TTL_DAYS * 24 * 3600 * 1000,
  ).toISOString();
  const sessionId = await createAuditSession(db, {
    token,
    visitor_fingerprint: fingerprint,
    monthly_call_volume: normalizeVolume(monthlyCallVolume),
    expires_at: expiresAt,
  });
  return { ok: true, token, sessionId };
}

// Look up a session by token, treating an expired/absent one as unavailable.
export async function resolveSession({ db, token, now = new Date() }) {
  const session = await getAuditSessionByToken(db, token);
  if (!session) return { ok: false, reason: "not_found" };
  if (new Date(session.expires_at).getTime() < new Date(now).getTime()) {
    return { ok: false, reason: "expired", session };
  }
  return { ok: true, session };
}

// Attach a demo call to a session, enforcing the 10-call cap. Returns
// { ok, count } or { ok:false, reason }.
export async function addCallToAuditSession({ db, token, demoCallId, now = new Date() }) {
  const resolved = await resolveSession({ db, token, now });
  if (!resolved.ok) return resolved;
  const count = await countAuditSessionCalls(db, resolved.session.id);
  if (count >= MAX_CALLS_PER_SESSION) {
    return { ok: false, reason: "call_limit", retryHint: `max ${MAX_CALLS_PER_SESSION} calls` };
  }
  await attachDemoCallToSession(db, resolved.session.id, demoCallId);
  return { ok: true, sessionId: resolved.session.id, count: count + 1 };
}

// Build the full audit report for a token: the session, its per-call results,
// and the aggregate summary. Volume precedence: caller override > stored > default.
/**
 * @param {{ db?: unknown, token?: string, now?: Date, monthlyCallVolume?: number|null }} [opts]
 */
export async function buildAuditReport({ db, token, now = new Date(), monthlyCallVolume }) {
  const resolved = await resolveSession({ db, token, now });
  if (!resolved.ok) return resolved;
  const { session } = resolved;

  const rows = await getAuditSessionCalls(db, session.id);
  const calls = rows.map((row) => {
    let result = null;
    if (row.result_json) {
      try {
        result = JSON.parse(row.result_json);
      } catch {
        result = null;
      }
    }
    return {
      id: row.id,
      filename: row.filename,
      status: row.status,
      ...(result ?? {}),
    };
  });

  const doneCalls = calls.filter((c) => c.status === "done" && c.overallScore !== undefined);
  const effectiveVolume =
    monthlyCallVolume !== undefined
      ? normalizeVolume(monthlyCallVolume)
      : session.monthly_call_volume ?? null;

  const summary = aggregateAudit({
    results: doneCalls,
    monthlyCallVolume: effectiveVolume,
  });

  const pending = calls.filter((c) => c.status !== "done" && c.status !== "error").length;
  const errored = calls.filter((c) => c.status === "error").length;
  return { ok: true, session, calls, summary, pending, errored };
}

// Save the visitor's email + volume onto a session (from the report email capture).
/**
 * @param {{ db?: unknown, token?: string, email?: string, monthlyCallVolume?: number|null, now?: Date }} [opts]
 */
export async function saveAuditContact({ db, token, email, monthlyCallVolume, now = new Date() }) {
  const resolved = await resolveSession({ db, token, now });
  if (!resolved.ok) return resolved;
  const patch = {};
  if (email !== undefined) patch.email = email;
  const vol = normalizeVolume(monthlyCallVolume);
  if (vol != null) patch.monthly_call_volume = vol;
  await updateAuditSession(db, resolved.session.id, patch);
  return { ok: true, sessionId: resolved.session.id };
}

// Expire sessions past their TTL (opportunistic + cron-safe). Returns count.
export async function expireAuditSessions({ db, now = new Date() } = {}) {
  return purgeExpiredAuditSessions(db, new Date(now).toISOString());
}

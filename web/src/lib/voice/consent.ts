import type { CallContext, Language } from "./types";

// ---------------------------------------------------------------------------
// CIPA consent chokepoint (design §6, compliance-invariants §II).
//
// California is an ALL-PARTY consent state (Penal Code §632). This is the single
// point every call MUST pass before any audio is persisted — mirroring the
// single SMS send chokepoint (web/src/lib/messaging/send.ts). No code path may
// record or persist call audio around this module.
//
// Pure logic only. No I/O here — persistence of the ConsentEvent happens through
// the Repository seam by the caller. This module decides + scripts.
// ---------------------------------------------------------------------------

/** All-party consent script, authored natively per language (not translated). */
const CONSENT_SCRIPT: Record<Language, string> = {
  en:
    "Before we go further — this call may be recorded so the firm can help you accurately. " +
    "Is it okay with you if we record? You can say no and we'll continue without recording.",
  es:
    "Antes de continuar — esta llamada puede grabarse para que el bufete pueda ayudarle con exactitud. " +
    "¿Está bien si la grabamos? Puede decir que no y continuaremos sin grabar.",
};

/** Words that count as affirmative consent, per language (kept deliberately narrow). */
const AFFIRMATIVE: Record<Language, RegExp> = {
  en: /\b(yes|yeah|yep|sure|ok|okay|that'?s fine|go ahead|of course)\b/i,
  es: /\b(s[ií]|claro|est[aá] bien|de acuerdo|adelante|por supuesto)\b/i,
};

export function consentPrompt(language: Language): string {
  return CONSENT_SCRIPT[language];
}

/** Interpret a caller reply to the consent prompt. Ambiguous → NOT granted
 *  (fail closed: we never record without a clear yes). */
export function interpretConsent(reply: string, language: Language): boolean {
  return AFFIRMATIVE[language].test(reply.trim());
}

/**
 * The gate. Returns whether audio persistence is permitted for this call.
 * If consent was not granted, the call may still proceed (graceful path) but
 * NOTHING is recorded/persisted as audio and the transcript is treated as
 * transient per retention policy. Fail-closed by construction.
 */
export function recordingPermitted(ctx: CallContext): boolean {
  return ctx.state !== "greet" && ctx.consentGranted === true;
}

/** The ConsentEvent payload the caller should persist via the Repository seam. */
export interface ConsentEventInput {
  callId: string;
  firmId: string;
  language: Language;
  granted: boolean;
  /** ISO 8601, injected by the caller (pure logic never generates time). */
  at: string;
  basis: "all_party_verbal_consent";
}

export function buildConsentEvent(
  ctx: CallContext,
  granted: boolean,
  at: string,
): ConsentEventInput {
  return {
    callId: ctx.callId,
    firmId: ctx.firmId,
    language: ctx.language,
    granted,
    at,
    basis: "all_party_verbal_consent",
  };
}

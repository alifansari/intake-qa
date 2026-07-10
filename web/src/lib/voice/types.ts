import { z } from "zod";

// ---------------------------------------------------------------------------
// Intake Closer — voice domain types + the VoiceTransport port.
//
// Ports-and-adapters, same discipline as the Repository seam: the orchestrator
// depends ONLY on the VoiceTransport interface, never on Twilio types directly.
// A TwilioConversationRelayTransport implements it today; a speech-to-speech
// vendor could implement the same interface with zero change to dialogue logic.
//
// Pure types + interfaces only — no I/O, no secrets, storage-agnostic.
// ---------------------------------------------------------------------------

/** Dialogue state machine (see INTAKE_CLOSER_DESIGN.md §3). Deterministic nodes;
 *  Claude generates language, guardrails constrain it. */
export const INTAKE_STATES = [
  "greet",
  "consent", // CIPA chokepoint — must pass before any audio is persisted
  "empathy",
  "qualify",
  "score",
  "close", // the differentiator — autonomous close, still under the attorney gate
  "sign", // retainer e-sign, only after AttorneyApproval clears
  "handoff",
  "escalate", // warm human transfer (distress cue / "I want a human" / edge case)
  "decline", // polite auto-decline of junk; protects attorney time
] as const;
export const IntakeState = z.enum(INTAKE_STATES);
export type IntakeState = z.infer<typeof IntakeState>;

export const Language = z.enum(["en", "es"]);
export type Language = z.infer<typeof Language>;

/** Case-triage tiers (mirrors the calibrated engine's tiering + BI-RADS-style
 *  confidence we keep from the citation guard). */
export const CaseTier = z.enum(["strong", "qualified", "marginal", "decline"]);
export type CaseTier = z.infer<typeof CaseTier>;

export const Confidence = z.enum(["low", "moderate", "high"]);
export type Confidence = z.infer<typeof Confidence>;

/** Real-time provisional triage produced during the SCORE state. The permanent,
 *  cited CaseScore is produced post-call by the calibrated engine (design §5). */
export const ProvisionalScore = z.object({
  tier: CaseTier,
  confidence: Confidence,
  sol_days_remaining: z.number().nullable(), // FLAG only — never legal advice (UPL wall)
  liability_signal: z.enum(["clear", "contested", "unclear"]).nullable(),
  damages_tier: z.enum(["catastrophic", "significant", "moderate", "minor"]).nullable(),
  coverage_signal: z.enum(["policy_limits_likely", "coverage_present", "coverage_unknown", "uninsured"]).nullable(),
  prior_representation: z.boolean().nullable(),
  red_flags: z.array(z.string()),
});
export type ProvisionalScore = z.infer<typeof ProvisionalScore>;

/** One caller/agent turn over the transport. */
export interface VoiceTurn {
  role: "caller" | "agent";
  text: string;
  /** ISO 8601. Injected by the transport; never generated in pure logic. */
  at: string;
}

/** What the orchestrator emits back to the transport each turn. */
export interface AgentAction {
  /** Text for TTS to speak in the current language. */
  say: string;
  /** Optional state transition after this utterance. */
  nextState?: IntakeState;
  /** Language switch (EN/ES auto-parity). */
  switchLanguage?: Language;
  /** Send an SMS side-channel (e.g. the Dropbox Sign retainer link). */
  sms?: { body: string };
  /** Hand the call to a human (warm transfer or take-a-message). */
  transfer?: { reason: string };
  /** End the call. */
  hangup?: boolean;
}

/**
 * VoiceTransport — the port. Concrete adapters (Twilio ConversationRelay first)
 * translate real-time speech to `VoiceTurn`s and render `AgentAction`s. The
 * orchestrator never imports Twilio.
 */
export interface VoiceTransport {
  /** Speak text via TTS in the given language, honoring barge-in. */
  say(text: string, language: Language): Promise<void>;
  /** Send an SMS to the caller (retainer link, confirmation). Routed through the
   *  existing single send chokepoint — see design §6. */
  sendSms(body: string): Promise<void>;
  /** Warm-transfer or take a message. */
  transferToHuman(reason: string): Promise<void>;
  /** End the call. */
  hangup(): Promise<void>;
}

/** Immutable per-call context threaded through the pure orchestrator step. */
export interface CallContext {
  callId: string;
  firmId: string;
  language: Language;
  state: IntakeState;
  consentGranted: boolean;
  transcript: VoiceTurn[];
  score: ProvisionalScore | null;
  /** True once a licensed attorney has approved finalizing the engagement (design §8). */
  attorneyApproved: boolean;
}

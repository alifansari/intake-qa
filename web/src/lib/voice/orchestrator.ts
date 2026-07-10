import type { AgentAction, CallContext, IntakeState, VoiceTurn } from "./types";
import { consentPrompt, interpretConsent } from "./consent";

// ---------------------------------------------------------------------------
// Intake Orchestrator — the dialogue brain's control layer (design §3).
//
// Claude (Sonnet 4.6, streaming) generates the *language*; this module owns the
// deterministic state machine and the non-negotiable guardrails. Business logic
// lives here (lib/), never in a route/component. This file is the skeleton: the
// state transitions and guardrails are real; the Claude call is behind a seam
// (`generateReply`) so it can be unit-tested with a stub and swapped safely.
//
// UPL WALL (design §7, compliance §): the agent gathers facts and FLAGS the SOL;
// it must NEVER give tailored legal advice or a legal conclusion. That constraint
// is enforced here structurally, not left to prompt-politeness.
// ---------------------------------------------------------------------------

/** Deterministic refusal for any turn that would cross into legal advice. */
const UPL_REFUSAL = {
  en:
    "I'm the firm's intake assistant, not an attorney, so I can't give legal advice — " +
    "but I'll get your details to an attorney here who can. ",
  es:
    "Soy el asistente de admisión del bufete, no un abogado, así que no puedo dar asesoría legal — " +
    "pero pasaré sus datos a un abogado que sí puede. ",
} as const;

/** Phrases in a caller turn that signal they're asking for a legal conclusion. */
const LEGAL_ADVICE_TRIGGERS =
  /\b(do i have a case|will i win|how much will i get|should i sign|is (it|this) my fault|am i liable|what should i do legally)\b/i;

/** Distress / escalation cues → warm human transfer from any state. */
const ESCALATION_TRIGGERS =
  /\b(i want (a|to speak to a) human|talk to a person|this is an emergency|i can'?t breathe|i'?m scared|help me now)\b/i;

/**
 * The Claude seam. In production this streams from the Anthropic SDK with the
 * calibrated system prompt + firm config + few-shot anchors (CLAUDE.md contract),
 * temp 0, prompt caching ON. Injected so tests can stub it.
 */
export type ReplyGenerator = (
  ctx: CallContext,
  latest: VoiceTurn,
) => Promise<string>;

/**
 * One deterministic step of the conversation. Given the current context and the
 * caller's latest turn, decide what the agent does next. Pure w.r.t. its inputs
 * except for the injected `generateReply` seam.
 */
export async function step(
  ctx: CallContext,
  latest: VoiceTurn,
  generateReply: ReplyGenerator,
): Promise<AgentAction> {
  const said = latest.text ?? "";

  // Guardrail 1 — escalation always wins, from any state.
  if (ESCALATION_TRIGGERS.test(said)) {
    return { say: "", nextState: "escalate", transfer: { reason: "caller_requested_or_distress" } };
  }

  // State machine.
  switch (ctx.state) {
    case "greet":
      // Move straight into the CIPA consent gate before anything is recorded.
      return { say: consentPrompt(ctx.language), nextState: "consent" };

    case "consent": {
      const granted = interpretConsent(said, ctx.language);
      // Either way we proceed to empathy; `granted` controls persistence, not flow.
      // (The route persists a ConsentEvent and sets ctx.consentGranted.)
      return {
        say: await generateReply({ ...ctx, consentGranted: granted }, latest),
        nextState: "empathy",
      };
    }

    case "empathy":
    case "qualify":
    case "score":
    case "close": {
      // Guardrail 2 — UPL wall. If the caller is fishing for a legal conclusion,
      // prepend the deterministic refusal and stay factual.
      const reply = await generateReply(ctx, latest);
      if (LEGAL_ADVICE_TRIGGERS.test(said)) {
        return { say: UPL_REFUSAL[ctx.language] + reply, nextState: nextAfter(ctx.state) };
      }
      return { say: reply, nextState: nextAfter(ctx.state) };
    }

    case "sign": {
      // Guardrail 3 — attorney-in-the-loop. Never send a retainer until an
      // attorney has approved finalizing the engagement (design §8).
      if (!ctx.attorneyApproved) {
        return {
          say: await generateReply(ctx, latest),
          // Hold in `sign`; the route sends for approval out-of-band and flips
          // ctx.attorneyApproved when the attorney taps "approve".
          nextState: "sign",
        };
      }
      return {
        say: await generateReply(ctx, latest),
        sms: { body: retainerSmsBody(ctx) },
        nextState: "handoff",
      };
    }

    case "handoff":
      return { say: await generateReply(ctx, latest), hangup: true };

    case "decline":
      return { say: await generateReply(ctx, latest), hangup: true };

    case "escalate":
      return { say: "", transfer: { reason: "in_escalation" } };

    default:
      return { say: await generateReply(ctx, latest) };
  }
}

/** Linear progression through the closing funnel (escalate/decline are handled
 *  explicitly above and are not part of the happy path). */
function nextAfter(state: IntakeState): IntakeState {
  const order: IntakeState[] = ["empathy", "qualify", "score", "close", "sign"];
  const i = order.indexOf(state);
  return i >= 0 && i < order.length - 1 ? order[i + 1] : state;
}

function retainerSmsBody(ctx: CallContext): string {
  // The actual Dropbox Sign link is injected by the route; this is the framing.
  return ctx.language === "es"
    ? "Aquí está su acuerdo de representación para firmar: {SIGN_LINK}"
    : "Here is your representation agreement to sign: {SIGN_LINK}";
}

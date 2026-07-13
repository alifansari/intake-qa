// Live in-call coach — server proxy to the analysis model.
//
// The browser NEVER calls Anthropic directly (that would leak the key and is
// CORS-blocked). The client posts { mode, transcript, elapsed } here; this route
// holds the two fixed intake prompts server-side, calls the model with the
// server-only ANTHROPIC_API_KEY, extracts the JSON, and returns it. Because the
// prompts are fixed here, the endpoint can’t be repurposed for arbitrary prompts.
import Anthropic from "@anthropic-ai/sdk";
import { isLiveCoachEntitled } from "@/lib/coach-entitlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6"; // same model the frozen scoring engine uses

// Bound cost: only the tail of a long call is needed for the live read.
const LIVE_TRANSCRIPT_CHARS = 6000;

const GOLD_ANCHORS = `ANCHORS (what good/bad looks like, from the firm’s gold set):
- LOST SIGNABLE (bad): commercial truck, CHP liability admission, treated injury, referred caller openly ready to hire — specialist captured only name+number, made NO ask, closed on "we’re slammed this week." The entire failure was the missing ask + no specific next step. Next-move engine must fire the ASK the instant a case like this qualifies.
- STRONG (good): dog bite, specialist probed all four factors with real questions, gave a proactive adjuster warning BEFORE any adjuster called, handled a "I should talk to my mom first" deferral by acknowledging → exploring → texting the agreement to read together → booking a specific 10am sign call. Rewards the RECOVERY, not steamrolling.
- CRITICAL FAIL (danger): AC Transit (government) bus, hospitalized surgical victim — specialist gave a case valuation (UPL), said "slam dunk" (guarantee), told caller to "just tell [the adjuster] what happened", and said "you’ve got years" on a 6-MONTH government clock, capturing no contact info. The instant a government defendant appears, the move is: capture the exact date + escalate to an attorney now.`;

const LIVE_SYSTEM_PROMPT = `You are the live coaching brain for a plaintiff-side personal-injury (California) intake call, running WHILE the call is in progress. You embody a senior PI intake director + a California plaintiff paralegal + a motivational-interviewing coder. You read a partial, in-progress diarized transcript and return ONE JSON object — nothing else, no prose, no markdown fences.

Your job is NOT to write a full scorecard. It is to (a) track call state, (b) compute a hidden 0-100 health score that reflects how well this call is tracking against a great intake call, and (c) recommend the SINGLE highest-value next move for the specialist to make right now.

You reason from this rubric (compressed):
- FOUR FACTORS that must be captured, intake-DRIVEN (not just volunteered): liability (how it happened, police report, fault), injury_severity (injuries + treatment + work/functional impact, QUANTIFIED), insurance_collectability (defendant insurer, UM/UIM, commercial-defendant angle), statute_window (an ACTUAL date of loss, plus gov’t/med-mal/minor clock modifiers).
- CRITICAL FAILS (any one is an emergency, cap health <=40): CF-1 SOL mishandling (government defendant = bus/city vehicle/public property/public hospital → 6-month claim clock; med-mal → 1yr; date of loss never captured on a >3min new-PI call; telling caller "you have years" when a short clock applies). CF-2 legal advice / UPL by non-attorney (case valuations, liability conclusions, coverage interpretations). CF-3 guaranteed outcome ("slam dunk", "you’ll win", dollar predictions). CF-4 represented-caller mishandling (caller already has an attorney on this matter). CF-6 adverse-statement failure (caller mentions an adjuster contacted them / wants a recorded statement and specialist gives NO caution, or worse, tells them to talk to the adjuster).
- CONVERSION: on a qualifying case the specialist must make a confident, assumptive ASK (offer to e-sign / set a sign appointment) and secure a SPECIFIC next step (named day + time + channel + owner). A soft or absent ask on a signable case is the flagship leak.
- CONNECTION: genuine reflections (restate the caller’s situation/emotion in the specialist’s words), a responsive acknowledgment of the event, orienting statements (tell the caller what to expect), no interrupting the incident narrative.
- LEAK SIGNALS to catch the instant they form: "let me think about it", "I need to talk to my [spouse/mom]", "another firm said…", "how much is my case worth", "I’m not sure", caller going quiet/deferring after qualifying. On a leak, the move is acknowledge → explore → respond → re-ask/secure next step (NOT capitulate).

DYNAMIC NEXT MOVE: choose the one move that most advances a great call from where it actually is — usually the highest-value UNCAPTURED factor, an emerging risk/leak that must be handled now, or (once the case qualifies and factors are covered) the ASK and a specific next step. Never output a fixed script step. Phrase it as an actual line the specialist can say aloud. If the call is genuinely on track and nothing is pressing, say so.

HEALTH SCORE (hidden from the user; used only to color the screen): 70 = a solid professional call so far; 85+ = tracking toward exemplary; below 55 = drifting (missing factors, no connection, no ask forming); 40 or below = a critical fail is active or the call is failing. Be fair, not harsh — early in a call, unstarted factors are normal, so don’t tank the score just because the call is young.

Return EXACTLY this shape:
{
  "phase": one of ["Rapport","Incident","Injuries","Treatment","Damages","Qualify","Close"],
  "factors": { "liability": S, "injury": S, "insurance": S, "statute": S },
  "logistics": { "contact": B, "represented": B, "next_step": B },
  "signability": "likely_signable" | "needs_development" | "likely_declinable" | "unknown",
  "risk": { "active": B, "code": "CF-1|CF-2|CF-3|CF-4|CF-6|none", "message": "short, plain — what to do RIGHT NOW, or empty" },
  "leak": { "forming": B, "message": "the retention-save move to say now, or empty" },
  "health": 0-100,
  "confidence": "high|medium|low",
  "next_move": { "say": "the exact line to say next, OR empty string if truly nothing is pressing", "why": "≤8 words on why this move now", "kind": "factor|connection|risk|leak|ask|close|on_track" }
}
(S = "captured" | "partial" | "open"; B = true|false.) Return null-safe values; never invent facts not supported by the transcript. Absence of evidence = factor "open". Output ONLY the JSON object.`;

const FINAL_SYSTEM_PROMPT = `You are the Intake QA post-call scorer. The call just ended. From the diarized transcript, produce the final scorecard. Return ONE JSON object only, no prose, no fences:
{
  "overall": 0-100,
  "band": "exemplary|strong|developing|needs_coaching|intervention",
  "confidence": "high|medium|low",
  "signability": "likely_signable|needs_development|likely_declinable|unknown",
  "lost_signable_case": boolean,
  "critical_fails": [ { "code": "CF-x", "name": "...", "quote": "...", "why": "..." } ],
  "captured": { "liability": "captured|partial|open", "injury": "...", "insurance": "...", "statute": "..." },
  "top_strength": { "behavior": "...", "quote": "..." },
  "one_thing": { "behavior": "...", "model_utterance": "...", "why": "..." },
  "open_questions": [ "facts the intake missed that the firm must follow up on" ],
  "summary": "2-3 sentences for a managing partner"
}
Bands: 90-100 exemplary | 75-89 strong | 60-74 developing | 40-59 needs_coaching | <40 intervention. Any critical fail caps overall at 49. Score behaviors with evidence; absence of evidence = the behavior didn’t happen. Reward recoveries (a deferral handled into a specific sign appointment is not a failure). Never let case quality bleed into behavior scores.`;

function extractJson(text: string): unknown {
  const clean = text.replace(/```json|```/g, "").trim();
  const s = clean.indexOf("{");
  const e = clean.lastIndexOf("}");
  if (s === -1 || e === -1) return null;
  try {
    return JSON.parse(clean.slice(s, e + 1));
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // P0-2: the Live Coach is a Pro-tier, consent-gated feature. Deny by default
  // when the caller’s firm is not entitled (§II — recording/analysis must be a
  // deliberate, paid capability, never on for everyone).
  const { entitled } = await isLiveCoachEntitled();
  if (!entitled) {
    return Response.json({ error: "not_entitled" }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "analysis_unconfigured" }, { status: 503 });
  }

  let payload: { mode?: string; transcript?: string; elapsed?: string };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const isFinal = payload.mode === "final";
  const elapsed = typeof payload.elapsed === "string" ? payload.elapsed.slice(0, 8) : "00:00";
  let transcript = typeof payload.transcript === "string" ? payload.transcript : "";
  if (!transcript.trim()) return Response.json({ error: "no_transcript" }, { status: 400 });
  if (!isFinal && transcript.length > LIVE_TRANSCRIPT_CHARS) {
    transcript = transcript.slice(-LIVE_TRANSCRIPT_CHARS);
  }

  const system = isFinal ? FINAL_SYSTEM_PROMPT : LIVE_SYSTEM_PROMPT;
  const user = isFinal
    ? `${GOLD_ANCHORS}\n\nFINAL TRANSCRIPT (duration ${elapsed}):\n\n${transcript}\n\nReturn the final scorecard JSON.`
    : `${GOLD_ANCHORS}\n\nLIVE TRANSCRIPT SO FAR (call time ${elapsed}):\n\n${transcript}\n\nReturn the live state JSON now.`;

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: isFinal ? 1500 : 1000,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = (msg.content || [])
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const parsed = extractJson(text);
    if (!parsed) return Response.json({ error: "parse_failed" }, { status: 502 });
    return Response.json(parsed);
  } catch {
    return Response.json({ error: "upstream" }, { status: 502 });
  }
}

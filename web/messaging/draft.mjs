// Compliant SMS drafting for re-engagement. Drafts a personalized first message
// (and subsequent replies) from an attorney-approved template, in a constrained
// style. NOTHING is sent here — this only produces text that lands in the
// approval queue as a `drafted` message.
//
// The scoring engine is untouched: this uses its OWN drafting system prompt.
// The Claude call is injectable (`drafter`) so tests run with a deterministic
// fake — no API key, no cost, no network.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";
export const MAX_SMS_CHARS = 320;
export const OPT_OUT_TEXT = "Reply STOP to opt out.";

// The hard rules, stated to the model AND enforced by validateDraft below.
const DRAFTING_SYSTEM = `You draft short SMS messages for a law firm's intake team re-engaging a
prospective client who called in but never got properly helped.

HARD RULES — never violate:
- Identify the firm by name.
- Warm, empathetic, human tone. Plain language.
- NO pressure, urgency tactics, deadlines, or salesy language.
- NEVER give legal advice, evaluate the case, or comment on its merits or value.
- NEVER promise, guarantee, or predict any outcome, result, settlement, or money.
- The FIRST message MUST include the exact opt-out phrase "${OPT_OUT_TEXT}".
- Keep the whole message under ${MAX_SMS_CHARS} characters. No emojis.

You are given an approved TEMPLATE as the base. Personalize it lightly (use the
caller's first name, reference that they called) but keep it within the rules.
If personalizing would require legal advice or any guarantee, DO NOT add it —
return a compliant message that stays within the template's intent.

Return ONLY the message text, nothing else.`;

// Banned content — a hard guard so advice/guarantees can't slip through even if
// the model misbehaves. Kept deliberately conservative.
const BANNED = [
  /\bguarantee\b/i,
  /\bguaranteed\b/i,
  /\bpromise\b/i,
  /\blegal advice\b/i,
  /\byou (will|'ll) (win|recover|get|receive)\b/i,
  /\byou have a (strong |good |valid )?case\b/i,
  /\bworth \$?\d/i,
  /\bwe (will|'ll) win\b/i,
];

// Validate a draft against the constraints. Returns an array of error strings
// (empty = valid). `firstMessage` requires opt-out language; `firmName` (if
// given) must appear in the text.
export function validateDraft(text, { firstMessage = false, firmName = null } = {}) {
  const errors = [];
  const t = String(text ?? "");
  if (t.trim().length === 0) errors.push("empty message");
  if (t.length > MAX_SMS_CHARS)
    errors.push(`too long (${t.length} > ${MAX_SMS_CHARS} chars)`);
  if (firstMessage && !/\bstop\b/i.test(t))
    errors.push("first message missing opt-out language");
  if (firmName && !t.includes(firmName))
    errors.push("does not identify the firm by name");
  for (const re of BANNED) {
    if (re.test(t)) {
      errors.push(`contains prohibited content (legal advice/guarantee): ${re}`);
      break;
    }
  }
  return errors;
}

// Default (production) drafter: one Claude call, temperature 0. Returns text.
async function defaultDrafter({ system, user }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is missing from the environment");
  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    temperature: 0,
    system,
    messages: [{ role: "user", content: user }],
  });
  return resp.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

// Draft, validate, and retry once on failure. Refuses (throws) if the second
// attempt still violates the constraints.
async function draftWithGuard({ system, user, validateOpts, drafter }) {
  let text = await drafter({ system, user });
  let errors = validateDraft(text, validateOpts);
  if (errors.length) {
    const retryUser = `${user}\n\nYour previous draft was rejected for: ${errors.join(
      "; "
    )}. Return a corrected message that fixes ALL of these and obeys every hard rule.`;
    text = await drafter({ system, user: retryUser });
    errors = validateDraft(text, validateOpts);
  }
  if (errors.length) {
    throw new Error(`Draft refused — constraints not met: ${errors.join("; ")}`);
  }
  return text;
}

// Draft a personalized FIRST re-engagement message.
export async function draftFirstMessage({
  transcriptSummary,
  template,
  firmName,
  callerName,
  drafter = defaultDrafter,
}) {
  const firstName = (callerName ?? "").trim().split(/\s+/)[0] || "there";
  const filled = fillTemplate(template.body, { firmName, firstName });
  const user = [
    `FIRM NAME: ${firmName}`,
    `CALLER FIRST NAME: ${firstName}`,
    `ONE-LINE CALL SUMMARY (context only — do not quote legal detail): ${transcriptSummary ?? "(none)"}`,
    ``,
    `APPROVED TEMPLATE (base — personalize lightly, keep the opt-out):`,
    filled,
  ].join("\n");

  return draftWithGuard({
    system: DRAFTING_SYSTEM,
    user,
    validateOpts: { firstMessage: true, firmName },
    drafter,
  });
}

// Draft a reply to an inbound message, in the SAME constrained style. Opt-out
// is only required on the first message, so it is not enforced here.
export async function draftReply({
  history = [],
  incoming,
  template,
  firmName,
  callerName,
  drafter = defaultDrafter,
}) {
  const firstName = (callerName ?? "").trim().split(/\s+/)[0] || "there";
  const transcript = history
    .map((m) => `${m.direction === "inbound" ? "CALLER" : "FIRM"}: ${m.body}`)
    .join("\n");
  const user = [
    `FIRM NAME: ${firmName}`,
    `CALLER FIRST NAME: ${firstName}`,
    `CONVERSATION SO FAR:`,
    transcript || "(none)",
    ``,
    `CALLER JUST SAID: ${incoming}`,
    ``,
    `Draft the firm's next reply. Same warm, compliant style as this approved template:`,
    fillTemplate(template.body, { firmName, firstName }),
  ].join("\n");

  return draftWithGuard({
    system: DRAFTING_SYSTEM,
    user,
    validateOpts: { firstMessage: false, firmName },
    drafter,
  });
}

// Fill {{firm_name}} / {{first_name}} placeholders in an approved template.
export function fillTemplate(body, { firmName, firstName }) {
  return String(body)
    .replaceAll("{{firm_name}}", firmName ?? "")
    .replaceAll("{{first_name}}", firstName ?? "");
}

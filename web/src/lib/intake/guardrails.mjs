// ============================================================================
// Intake-agent compliance guardrails — LOAD-BEARING. Read before editing.
//
// WHY THIS FILE EXISTS (UPL / ABA Formal Op. 512 / CIPA):
//
// 1) UNAUTHORIZED PRACTICE OF LAW (Cal. B&P §§6125–6126) + ABA Formal Op. 512
//    (2024, on generative AI): a non-lawyer — and an AI is always a non-lawyer —
//    may never evaluate a claim, quote or estimate case value, or state a legal
//    conclusion ("you have a strong case", "they're liable", "your claim is
//    time-barred"). The intake agent GATHERS FACTS AND SCHEDULES ONLY. This is
//    enforced two ways, belt and suspenders:
//      a) STRUCTURALLY — the qualification tree (tree.mjs) is a fixed graph of
//         pre-written questions with deterministic routing; there is no code
//         path where a model composes a legal assessment for the visitor.
//      b) IN THE PROMPT — the one narrow LLM task (summarizing the visitor's
//         free-text narrative into structured fields, api/intake/interpret)
//         carries INTERPRET_SYSTEM_RULES below, and its output is data fields,
//         never visitor-facing prose.
//    When a visitor asks the forbidden questions anyway ("what's my case
//    worth?"), the agent answers with the FIXED deflections below — never an
//    improvised answer.
//
// 2) CIPA CONSENT-FIRST (Cal. Penal Code §632 — all-party-consent state) + AI
//    disclosure: the FIRST message of every conversation is the disclosure
//    below; the visitor must affirmatively proceed before any question is
//    asked. The exact text is versioned; the version the visitor saw is stored
//    on the canonical record (consent_version) so it is provable later. If the
//    wording changes, BUMP THE VERSION — never edit in place.
//
// 3) FEE FRAMING (compliance-invariants §I): if fees come up, the only
//    permitted framing is the fixed FEE_DEFLECTION — the agent never describes
//    contingency terms, percentages, or outcomes.
//
// Tests in tests/intake-tree.test.mjs assert every visitor-facing prompt in the
// tree is free of the banned phrasings.
// ============================================================================

// --- CIPA / AI disclosure (the mandatory first message) ----------------------
export const AI_DISCLOSURE_VERSION = "intake-disclosure-v1-2026-07";
export const AI_DISCLOSURE_TEXT =
  "Hi — before we start, you should know: this chat is an automated intake " +
  "assistant, not a lawyer, and this conversation is recorded and saved so the " +
  "office can follow up with you. I can take down what happened and help you get " +
  "a call scheduled — I can't give legal advice or tell you what your situation " +
  "is worth. If this is an emergency, call 911 first. OK to continue?";

// --- Fixed deflections (the ONLY permitted answers to these questions) -------
// The agent never improvises here. Each deflection redirects to a human without
// stating any conclusion about the visitor's situation.
export const CASE_VALUE_DEFLECTION =
  "That's exactly the right question for the attorney — I'm not able to evaluate " +
  "or put a value on anyone's situation. What I can do is make sure the office has " +
  "everything they need to give you a real answer quickly.";

export const LEGAL_ADVICE_DEFLECTION =
  "I can't advise on that — only the attorney can. I'll note your question so it's " +
  "the first thing they cover when they talk with you.";

export const FEE_DEFLECTION =
  "The attorney goes over how fees work during your consultation — I don't handle " +
  "that part. The consultation itself costs nothing.";

// --- The interpreter's system rules (the ONE narrow LLM task) -----------------
// Used by api/intake/interpret to turn the visitor's free-text "what happened"
// into structured fields. Output is DATA, never visitor-facing prose.
export const INTERPRET_SYSTEM_RULES = `You extract structured facts from a personal-injury intake narrative. You are a data extractor, not a lawyer and not an assistant.

STRICT RULES:
- Extract ONLY what the narrative states. Never infer fault, liability, negligence, claim strength, or value. Never add facts.
- Output must never contain a legal conclusion, an opinion on the merits, or any dollar amount.
- Return ONE JSON object only, no prose, no code fences:
  { "summary": "<1-2 factual sentences restating what happened>",
    "mentions_injury": true|false,
    "mentions_prior_attorney": true|false,
    "distress_cues": true|false }
- "summary" restates the visitor's own account in neutral language ("Visitor reports..."). No adjectives about strength, blame, or severity beyond what was said.`;

// --- Banned phrasings (tested against every visitor-facing prompt) -----------
// A prompt containing any of these is a defect (UPL + compliance-invariants §I).
export const BANNED_PROMPT_PHRASES = [
  "your case is worth",
  "strong case",
  "you have a case",
  "we can win",
  "guaranteed",
  "% of recovery",
  "percentage of",
  "contingent",
  "per signed",
  "success fee",
  "we only get paid",
  "time-barred",
  "statute of limitations has",
  "they are liable",
  "you are entitled to",
];

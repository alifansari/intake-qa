// Intake Leak Report — verbatim copy (single source of truth). Static blocks are
// constants; blocks with [bracketed] slots are builder functions. Carry text
// exactly as specified. Reserved-term rule: never "audit"/"audited" for this
// artifact — it is a review / diagnostic / independent diagnostic review.

import { ANALYST, ANALYST_CONTACT } from "../analyst.mjs";

// Page-one BLUF — three fixed labels (do not rename).
export const PAGE_ONE_LABELS = {
  count: "Leaked signable cases found",
  fee: "Estimated fee value at risk (conservative range)",
  recoverable: "Cases still legally recoverable now",
};

export function verdictSentence({ n, period, x, y, low, high }) {
  return `We reviewed ${n} recorded intake calls from ${period} and found ${x} qualified callers who did not sign. Of those, ${y} appear still recoverable today. The estimated fee value at risk is ${low}–${high}.`;
}

export function nextActionLine({ caseType, page, badge }) {
  return `Your fastest win is the ${caseType} case on page ${page} — the statute clock is ${badge}.`;
}

export function scopeBlock({ n, period, channelsReviewed, notReviewed }) {
  return `This report reviews ${n} calls from ${period}. Findings are per-call facts, not firm-wide statistics. With a sample this size, these results are directional — they show patterns worth acting on, not a statistical measurement of your whole operation. We reviewed ${channelsReviewed}. We did not review ${notReviewed}.`;
}

export const FINDINGS_SUMMARY_INTRO =
  "Here is where cases most often slipped, by category. Each count is a process pattern, not a person.";

export function exclusionsIntro({ total, strong }) {
  return `We found ${total} flagged cases. We count ${strong} of them toward the numbers on page one. Here is what we left out, and why — so you can trust the number we kept in.`;
}

export const COULD_NOT_DETERMINE_INTRO =
  "To be straight with you, here is what we could not determine from these recordings. Naming these limits is part of doing this honestly.";

export const GUARANTEE_BOX =
  "Our find-it-free guarantee. If we do not find at least $25,000 in leaked signable fee value in your first Intake Leak Report, you owe us nothing for it. This guarantee attaches to your decision to subscribe. Our pricing is a flat monthly fee. We are never paid a share of any recovery. See the Methodology appendix for how we estimate fee value.";

export function methodologyAppendix({ low, high }) {
  return `How we estimated fee value. We use a conservative method. For each case we apply a value range, not a single number, and in the summary we quote the low end. Our sources, in order of preference: (1) your firm's own average fee by case type, when you provide it at onboarding; (2) otherwise, published fee ranges by case type, which you approve before we use them. We exclude any case whose statute has expired. We exclude moderate-confidence flags from the totals. We do not predict outcomes and we do not guarantee recoveries. Worked example: a case with a value range of ${low}–${high} contributes ${low} to the conservative headline total, and appears as one row in the fee-at-risk schedule. TODO(Ali): populate the fee-value table by case type, and approve the published-source citations used when a firm has not provided its own averages.`;
}

export function analystSignoff({ contact = ANALYST_CONTACT } = {}) {
  return `Analyst of record: ${ANALYST.name}, ${ANALYST.org}. Former personal-injury paralegal; bilingual English/Spanish. Direct line: ${contact}. I personally reviewed this report before it was released. The findings here reflect my own independent judgment. Every quoted excerpt was checked against the original call recording. This is an independent diagnostic review — it is not a certified financial audit and it is not legal advice.`;
}

export function coverMemo({ date, firm, caseType, deadline, days, exhibit }) {
  return `MEMO — TIME-SENSITIVE.
Date: ${date}.   To: ${firm}.   From: ${ANALYST.name}, ${ANALYST.org}.
Re: One live case with a closing statute clock.
Before you read the full report: at least one leaked case has a statute deadline in the CRITICAL band.
Case type: ${caseType}.  Estimated deadline: ${deadline} (${days} days out).
See Exhibit ${exhibit} and the mandatory disclaimer on statute calculations. Please act on this case before it expires.`;
}

export const REVIEW_CHECKLIST = [
  "Every page-one number traces to a schedule row.",
  "Play and spot-check at least [N] excerpts against the audio.",
  "No staff names appear anywhere in the report.",
  "Statute math is confirmed for every CRITICAL and SOON case.",
  "The exclusions list is complete (moderate flags AND expired statutes shown).",
  "The guarantee box does not create outcome-fee optics.",
  "Sign-off stamps analyst name + timestamp into the footer.",
];

export function coverEmail({ firm, name, x, n, low, y, page }) {
  return {
    subject: `${firm} — we found ${x} leaked signable cases in your intake calls`,
    body: `Hi ${name}, your Intake Leak Report is attached. Bottom line: we reviewed ${n} of your recorded intake calls and found ${x} qualified callers who didn't sign, with an estimated ${low} at risk on the conservative low end. ${y} of them look recoverable right now — and one has a closing statute clock, so I'd start there (page ${page}). Everything in the report traces to a timestamped quote from your own recordings, and I reviewed it personally before sending it. Reply here and I'll walk you through it. — Ali`,
  };
}

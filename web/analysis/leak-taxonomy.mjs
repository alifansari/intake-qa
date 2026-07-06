// Moment-of-leak taxonomy (Stage 2). Each leaked case gets EXACTLY ONE primary
// tag with a supporting transcript citation. Aggregate counts feed the findings
// summary. Definitions are carried verbatim from the spec — do not reword.

export const LEAK_TAGS = {
  "no-callback-commitment":
    "The call ended with no scheduled follow-up and no named owner of the next contact.",
  "unhandled-objection":
    "The caller raised a concern (fee, timing, \"need to think about it,\" spouse/decision-maker) that was never addressed.",
  "transfer-dropped":
    "The caller was transferred or placed on hold and the thread died without resolution.",
  "quote-only-no-close":
    "Information or a fee quote was given with no attempt to sign or set a concrete next step.",
  "language-mismatch":
    "The caller's preferred language (English/Spanish) was not served.",
  "statute-urgency-missed":
    "A time-sensitive legal deadline was present but never surfaced or acted on.",
  "qualification-incomplete":
    "Screening ended before the qualifying facts were established.",
};

export const LEAK_TAG_KEYS = Object.keys(LEAK_TAGS);

export function isValidTag(tag) {
  return Object.prototype.hasOwnProperty.call(LEAK_TAGS, tag);
}

// Count leaked cases by tag. Returns { tag: count } including only present tags,
// plus `total`. Aggregate counts always equal the number of tagged cases.
export function tagCounts(leaks = []) {
  const counts = {};
  let total = 0;
  for (const l of leaks) {
    if (!isValidTag(l.tag)) continue;
    counts[l.tag] = (counts[l.tag] ?? 0) + 1;
    total += 1;
  }
  return { counts, total };
}

// Validate: every leak has exactly one valid primary tag. Returns { ok, errors }.
export function validateTags(leaks = []) {
  const errors = [];
  for (const l of leaks) {
    if (!l.tag) errors.push(`${l.callerId ?? "?"}: missing moment-of-leak tag`);
    else if (!isValidTag(l.tag)) errors.push(`${l.callerId ?? "?"}: invalid tag "${l.tag}"`);
  }
  return { ok: errors.length === 0, errors };
}

// Citation guard (Stage 1) — "no citation, no claim."
//
// Every qualifying fact, excerpt, and moment-of-leak annotation carries a
// verbatim_snippet. Before anything reaches the report, we check that snippet
// against the stored call transcript. If normalized similarity < THRESHOLD, the
// item is DROPPED from the report and logged to the review queue
// (citation_failures) for the analyst. Precision-critical: fabricated snippets
// must fail.
//
// Metric: character-level partial ratio — the best Levenshtein similarity of the
// normalized snippet against any equal-length window of the normalized transcript.
// This tolerates minor transcription drift (a substituted/typo'd word in a longer
// snippet) while rejecting invented text. Pure; no I/O except the optional logger.

import { insertCitationFailure } from "../ingest/store.mjs";

export const THRESHOLD = 0.9;

// lowercase, strip punctuation, collapse whitespace.
export function normalize(s) {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Standard Levenshtein edit distance.
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ai = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function ratio(a, b) {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

// Best similarity of the snippet against any equal-length window of the transcript.
export function citationScore(snippet, transcript) {
  const s = normalize(snippet);
  const t = normalize(transcript);
  if (!s) return 0;
  if (!t) return 0;
  if (t.includes(s)) return 1; // the common case: verbatim extract
  const w = s.length;
  if (w >= t.length) return ratio(s, t);
  let best = 0;
  // Slide an equal-length window; a small ± flex absorbs 1-char length drift.
  for (let i = 0; i + w <= t.length && best < 1; i++) {
    const score = ratio(s, t.slice(i, i + w));
    if (score > best) best = score;
  }
  return best;
}

// Validate one citation. Returns { ok, score, status }.
export function validateCitation(citation, transcript, threshold = THRESHOLD) {
  const score = citationScore(citation?.verbatim_snippet ?? "", transcript);
  const ok = score >= threshold;
  return { ok, score: Number(score.toFixed(4)), status: ok ? "passed" : "failed" };
}

// Split a set of citations into { passed, dropped } against a transcript. Pure.
export function filterCitations(citations, transcript, threshold = THRESHOLD) {
  const passed = [];
  const dropped = [];
  for (const c of citations ?? []) {
    const r = validateCitation(c, transcript, threshold);
    (r.ok ? passed : dropped).push({ ...c, score: r.score });
  }
  return { passed, dropped };
}

// Guard + log: keep passing citations, log the dropped ones to the review queue.
// `nearest` is the transcript excerpt for the analyst to eyeball. Returns { passed, dropped }.
export async function guardAndLog({ db, flagId = null, citations, transcript, threshold = THRESHOLD }) {
  const { passed, dropped } = filterCitations(citations, transcript, threshold);
  for (const d of dropped) {
    await insertCitationFailure(db, {
      flag_id: flagId,
      snippet: d.verbatim_snippet ?? "",
      nearest_text: (transcript ?? "").slice(0, 240),
      score: d.score,
    });
  }
  return { passed, dropped };
}

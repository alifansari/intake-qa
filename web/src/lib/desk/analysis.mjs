// The desk’s analysis brain — pure, testable, no I/O. Turns the durable per-call
// analysis rows (from store.listCallsWithAnalysis / getCallWithAnalysis) into the
// two things a firm owner actually acts on:
//   * a per-call VERDICT + letter grade + the one fix, and
//   * a team SCORECARD graded on a fair "Signable-Save Rate" (the controllables
//     on winnable calls), not raw sign rate (which swings with lead quality).
//
// Design grounded in the intake-QA research pass (2026-07-12): lead with a grade,
// a dollar figure, and one action; bury the metric wall. Grade what the rep
// controls. Turn scores into sentences.

// --- Letter grades -----------------------------------------------------------

// Per-call letter from the 0-100 overall score. Standard scale (not a curve) so
// "everyone can get an A" — non-experts expect school grading.
export function letterGrade(score) {
  // Guard null/undefined/"" BEFORE Number(): Number(null) is 0 (finite), which
  // would mislabel an un-scored call as an F.
  if (score == null || score === "") return { letter: "—", label: "Not scored", tone: "muted" };
  const n = Number(score);
  if (!Number.isFinite(n)) return { letter: "—", label: "Not scored", tone: "muted" };
  if (n >= 90) return { letter: "A", label: "Excellent", tone: "good" };
  if (n >= 80) return { letter: "B", label: "Solid", tone: "good" };
  if (n >= 70) return { letter: "C", label: "Okay", tone: "warn" };
  if (n >= 60) return { letter: "D", label: "Needs work", tone: "warn" };
  return { letter: "F", label: "Poor", tone: "bad" };
}

// Team letter from the Signable-Save Rate (0-1). Benchmarked to the ~50%+
// consult-to-sign "healthy PI intake" line.
export function gradeFromSaveRate(rate) {
  const r = Number(rate);
  if (!Number.isFinite(r)) return { letter: "—", label: "Not enough calls yet", tone: "muted" };
  if (r >= 0.8) return { letter: "A", label: "Excellent", tone: "good" };
  if (r >= 0.65) return { letter: "B", label: "Healthy", tone: "good" };
  if (r >= 0.5) return { letter: "C", label: "At the industry line", tone: "warn" };
  if (r >= 0.35) return { letter: "D", label: "Leaking cases", tone: "warn" };
  return { letter: "F", label: "Leaking badly", tone: "bad" };
}

// --- Per-call verdict --------------------------------------------------------

// Which case-signability values mean "a case worth taking" (winnable).
const SIGNABLE = new Set(["signable", "possibly_signable", "likely_signable"]);

export function isWinnable(row) {
  if (!row) return false;
  if (row.lost_signable) return true; // we flagged it as a blown signable
  return SIGNABLE.has(String(row.case_signability ?? "").toLowerCase());
}

// A blown winnable call: flagged as a lost signable and not since signed.
export function isBlown(row) {
  return Boolean(row?.lost_signable) && row?.save_status !== "signed";
}

// The one-word outcome for the top of the per-call readout, plus a tone.
export function verdict(row) {
  if (!row) return { word: "—", tone: "muted", line: "" };
  const notAnalyzed = row.status && row.status !== "analyzed";
  if (notAnalyzed) {
    if (String(row.status).startsWith("failed"))
      return { word: "Could not read", tone: "muted", line: "We could not read this recording automatically. Nothing for you to do — we re-request it." };
    if (String(row.status).startsWith("excluded"))
      return { word: "Not an intake call", tone: "muted", line: "Set aside — this was not a new-client intake call." };
    return { word: "Being read", tone: "muted", line: "This call is still being read. Its readout appears here when it is done." };
  }
  if (row.lost_signable && row.save_status === "signed")
    return { word: "Won back", tone: "good", line: "A signable case your team let slip — and you called back and signed it." };
  if (isBlown(row))
    return { word: "On the table", tone: "bad", line: "A signable case your team let slip. Still winnable with a callback." };
  if (isWinnable(row))
    return { word: "Handled", tone: "good", line: "A signable case, worked the way you want intake worked." };
  return { word: "No case", tone: "muted", line: "Not a signable case — no fee walked here." };
}

// --- The four money moves (conversion checklist) -----------------------------

// Each returns true = done, false = missed, null = unknown (don’t grade).
export function moneyMoves(row) {
  const cat = (v) => (typeof v === "number" ? v : null);
  return [
    {
      key: "retainer",
      label: "Asked for the retainer",
      done: typeof row?.retainer_asked === "boolean" ? row.retainer_asked : row?.retainer_asked === 1 ? true : row?.retainer_asked === 0 ? false : null,
      why: "The single behavior that separates a 20% from a 50% sign rate.",
    },
    {
      key: "next_step",
      label: "Set a specific next step",
      done: row?.next_step_specificity == null ? null : String(row.next_step_specificity).toLowerCase() === "specific",
      why: "A named time beats “we’ll call you.”",
    },
    {
      key: "contact",
      label: "Captured full contact info",
      done: row?.contact_info_captured == null ? null : String(row.contact_info_captured).toLowerCase() === "full",
      why: "You cannot follow up on a case you cannot reach.",
    },
    {
      key: "qualify",
      label: "Qualified the case",
      done: cat(row?.cat_qualification) == null ? null : cat(row.cat_qualification) >= 70,
      why: "Liability, injury, treatment, and coverage established.",
    },
  ];
}

// --- Category breakdown ------------------------------------------------------

export const CATEGORY_LABELS = [
  { key: "cat_qualification", label: "Qualification", blurb: "Did they establish liability, injury, treatment, coverage?" },
  { key: "cat_conversion", label: "Conversion", blurb: "Did they move the caller toward signing?" },
  { key: "cat_connection", label: "Connection", blurb: "Did the caller feel heard and understood?" },
  { key: "cat_risk_compliance", label: "Risk & compliance", blurb: "Did they avoid promises and conflicts?" },
  { key: "cat_process", label: "Process", blurb: "Did they follow the intake steps cleanly?" },
];

export function categoryBars(row) {
  return CATEGORY_LABELS.map((c) => ({
    label: c.label,
    blurb: c.blurb,
    score: typeof row?.[c.key] === "number" ? row[c.key] : null,
  })).filter((c) => c.score != null);
}

// --- Coaching payload --------------------------------------------------------

// Parse the stored coaching JSON into { top_strength, one_thing } safely.
export function parseCoaching(coachingJson) {
  if (!coachingJson) return null;
  if (typeof coachingJson === "object") return coachingJson;
  try {
    return JSON.parse(coachingJson);
  } catch {
    return null;
  }
}

// --- Team scorecard ----------------------------------------------------------

// Only calls that actually got scored contribute to grade/averages.
export function analyzedRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((r) => r && r.overall_score != null);
}

export function signableSaveRate(rows) {
  const analyzed = analyzedRows(rows);
  const winnable = analyzed.filter(isWinnable);
  const saved = winnable.filter((r) => !isBlown(r));
  const rate = winnable.length ? saved.length / winnable.length : null;
  return { rate, saved: saved.length, winnable: winnable.length };
}

export function averageScore(rows) {
  const analyzed = analyzedRows(rows);
  if (!analyzed.length) return null;
  return Math.round(analyzed.reduce((s, r) => s + Number(r.overall_score), 0) / analyzed.length);
}

// The Leak Board: the recurring biggest-misses, ranked by frequency × dollars.
// Groups lost/low calls by their coaching "one_thing.behavior" (the single fix),
// summing the estimated fee at risk so the owner sees which habit costs the most.
export function topLeaks(rows, limit = 3) {
  const groups = new Map();
  for (const r of analyzedRows(rows)) {
    const coaching = parseCoaching(r.coaching_json);
    const behavior = coaching?.one_thing?.behavior;
    if (!behavior) continue;
    // Only count it as a leak when the call actually lost a signable case or scored poorly.
    if (!(r.lost_signable || Number(r.overall_score) < 70)) continue;
    const key = behavior.trim();
    const g = groups.get(key) ?? { behavior: key, count: 0, dollarsCents: 0, model: coaching?.one_thing?.model_utterance ?? null };
    g.count += 1;
    // Only money STILL on the table counts toward the leak’s cost — a case that
    // was won back is a coaching pattern, not a live dollar loss.
    if (isBlown(r)) g.dollarsCents += Number(r.revenue_at_risk_cents) || 0;
    if (!g.model && coaching?.one_thing?.model_utterance) g.model = coaching.one_thing.model_utterance;
    groups.set(key, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.dollarsCents - a.dollarsCents)
    .slice(0, limit);
}

// The conversion funnel: team % on each of the four money moves. Only counts
// calls where the signal is known (not null).
export function conversionFunnel(rows) {
  const analyzed = analyzedRows(rows);
  const out = [];
  for (const move of ["retainer", "next_step", "contact", "qualify"]) {
    let done = 0;
    let known = 0;
    for (const r of analyzed) {
      const m = moneyMoves(r).find((x) => x.key === move);
      if (m.done == null) continue;
      known += 1;
      if (m.done) done += 1;
    }
    const label = {
      retainer: "Asked for the retainer",
      next_step: "Set a specific next step",
      contact: "Captured full contact info",
      qualify: "Qualified the case",
    }[move];
    out.push({ key: move, label, pct: known ? Math.round((done / known) * 100) : null, done, known });
  }
  return out;
}

// The full team scorecard object the page renders.
export function buildScorecard(rows) {
  const analyzed = analyzedRows(rows);
  const ssr = signableSaveRate(rows);
  const grade = gradeFromSaveRate(ssr.rate);
  const onTheTableCents = analyzedRows(rows)
    .filter(isBlown)
    .reduce((s, r) => s + (Number(r.revenue_at_risk_cents) || 0), 0);
  return {
    grade,
    ssr,
    avgScore: averageScore(rows),
    analyzedCount: analyzed.length,
    totalCount: (Array.isArray(rows) ? rows : []).length,
    onTheTableCents,
    leaks: topLeaks(rows),
    funnel: conversionFunnel(rows),
    benchmarkPct: 50, // industry "healthy" consult-to-sign line
  };
}

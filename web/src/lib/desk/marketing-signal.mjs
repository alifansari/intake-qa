// Marketing Signal — pure, no I/O, storage-agnostic.
//
// The insight no cost-per-LEAD tool has: attribute SIGNABLE-CASE VALUE to lead
// source. Everyone measures cost-per-lead; only Intake QA holds both the source
// (from CallRail) and the value-weighted signability (from call_analyses), so it
// can tell a firm "your TV leads carry 3x the signable value per call of your
// PPC leads."
//
// Compliance (§IV): small-N sources are flagged NOT rankable (no false
// precision on 3 calls). Figures are signable-value ESTIMATES per the scoring
// engine, never guarantees, never "cost per signed case" (we hold no ad spend).

const SIGNABLE = new Set(["signable", "possibly_signable", "likely_signable"]);
export const MIN_RANKABLE_CALLS = 5;

// rows: [{ lead_source, case_signability, revenue_at_risk_cents }]
export function aggregateMarketingSignal(rows = [], opts = {}) {
  const minN = opts.minRankableCalls ?? MIN_RANKABLE_CALLS;
  const bySource = new Map();
  for (const r of rows) {
    const source = (r.lead_source && String(r.lead_source).trim()) || "Unattributed";
    let g = bySource.get(source);
    if (!g) {
      g = { source, calls: 0, signable: 0, signableValueCents: 0 };
      bySource.set(source, g);
    }
    g.calls += 1;
    const signable = SIGNABLE.has(String(r.case_signability ?? "").toLowerCase());
    if (signable) {
      g.signable += 1;
      const cents = Number(r.revenue_at_risk_cents);
      if (Number.isFinite(cents)) g.signableValueCents += cents;
    }
  }

  const groups = [...bySource.values()].map((g) => ({
    source: g.source,
    calls: g.calls,
    signable: g.signable,
    signableRate: g.calls ? g.signable / g.calls : 0,
    junkRate: g.calls ? (g.calls - g.signable) / g.calls : 0,
    signableValueCents: g.signableValueCents,
    valuePerCallCents: g.calls ? Math.round(g.signableValueCents / g.calls) : 0,
    rankable: g.calls >= minN && g.source !== "Unattributed",
  }));
  groups.sort((a, b) => b.signableValueCents - a.signableValueCents);

  // Honest headline: the value-per-call multiple between the best and worst
  // RANKABLE source (never computed on small-N or Unattributed buckets).
  const rankable = groups.filter((g) => g.rankable && g.valuePerCallCents > 0);
  let headline = null;
  if (rankable.length >= 2) {
    const best = rankable[0];
    const worst = rankable[rankable.length - 1];
    if (worst.valuePerCallCents > 0) {
      headline = {
        bestSource: best.source,
        worstSource: worst.source,
        multiple: best.valuePerCallCents / worst.valuePerCallCents,
      };
    }
  }

  return {
    groups,
    rankableCount: rankable.length,
    totalCalls: rows.length,
    headline,
  };
}

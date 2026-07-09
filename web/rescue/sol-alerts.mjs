// Speed-to-lead & SOL alerts (module 12).
//
// Two urgency signals over data the pipeline already has:
//   * SOL clock: lost cases where the statute is running — deadline math comes
//     from the EXISTING deterministic engine (analysis/sol.mjs + sol-rules.mjs;
//     never LLM-computed). This module only classifies urgency bands.
//   * Speed-to-lead outliers: calls whose time-to-live-answer sits in the slow
//     tail of the firm's own distribution.
//
// Pure functions; callers join them onto packets/reports.

// Urgency band for a computed SOL deadline. Mirrors the CRITICAL/SOON/OK/EXPIRED
// badges in lib/leak-report/compose.mjs so the product speaks one language.
export function solUrgency({ deadlineIso, now = new Date(), urgentThresholdDays = 90 }) {
  if (!deadlineIso) return { band: "unknown", daysLeft: null };
  const deadline = new Date(deadlineIso);
  if (Number.isNaN(deadline.getTime())) return { band: "unknown", daysLeft: null };
  const daysLeft = Math.floor((deadline.getTime() - new Date(now).getTime()) / 86_400_000);
  if (daysLeft < 0) return { band: "expired", daysLeft };
  if (daysLeft <= 30) return { band: "critical", daysLeft };
  if (daysLeft <= urgentThresholdDays) return { band: "soon", daysLeft };
  return { band: "ok", daysLeft };
}

// Flag SOL-urgent items among confirmed-but-unsigned ledger entries/candidates.
export function solAlerts({ items, now = new Date(), urgentThresholdDays = 90 }) {
  return (items ?? [])
    .map((item) => ({ ...item, sol: solUrgency({ deadlineIso: item.sol_deadline, now, urgentThresholdDays }) }))
    .filter((item) => item.sol.band === "critical" || item.sol.band === "soon")
    .sort((a, b) => (a.sol.daysLeft ?? 0) - (b.sol.daysLeft ?? 0));
}

// Speed-to-lead outliers: entries above the p90 of the firm's own
// speed_to_lead_seconds distribution (and above a floor so tiny samples don't
// generate noise). Input rows come from handling_scores.
export function speedToLeadOutliers({ handlingRows, floorSeconds = 60, minSample = 5 }) {
  const rows = (handlingRows ?? []).filter((r) => r.speed_to_lead_seconds != null);
  if (rows.length < minSample) return { outliers: [], p90: null, sample: rows.length };
  const sorted = rows.map((r) => Number(r.speed_to_lead_seconds)).sort((a, b) => a - b);
  const p90 = sorted[Math.floor(0.9 * (sorted.length - 1))];
  const threshold = Math.max(p90, floorSeconds);
  return {
    outliers: rows.filter((r) => Number(r.speed_to_lead_seconds) > threshold),
    p90,
    sample: rows.length,
  };
}

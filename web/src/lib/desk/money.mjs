// The desk’s money math — the one number that answers "where’s the value?".
//
// Pure + testable (no I/O). Given the firm’s leaked-case flags, each already
// enriched with an estimated FEE range (cents) and a workflow status, this
// splits the book into:
//   * onTheTable — estimated fees still winnable (active, not yet signed/lost).
//     This is the leak the desk uniquely reveals, and the hero number.
//   * wonBack    — cases the FIRM marked signed via a callback. A COUNT, plus an
//     estimated value range. Per compliance-invariants §IV we never present a
//     realized-recovery dollar figure as a guarantee — the signed FEE is still an
//     estimate (the settlement hasn’t happened), so the count leads and the
//     dollars are labeled estimates, same methodology as every card.
//
// Status vocabulary matches LeakCard: TERMINAL = signed | didnt_sign | bad_number;
// a null status defaults to needs_callback (untouched, still on the table).

// Still-winnable: untouched or in-progress, not yet signed or lost.
export const ON_THE_TABLE_STATUSES = new Set([
  "needs_callback",
  "reached_out",
  "back_in_touch",
]);

// One item as the aggregator needs it. feeLowCents/feeHighCents may be null when
// we have no fee-value row for that case type — such a case still COUNTS toward
// the tally of cases but contributes $0 to the range (honest: we don’t invent a
// value we can’t source).
/** @typedef {{ status: string | null, feeLowCents: number | null, feeHighCents: number | null }} MoneyLeak */

function feeOf(leak) {
  const low = Number(leak?.feeLowCents);
  const high = Number(leak?.feeHighCents);
  return {
    low: Number.isFinite(low) ? Math.max(0, low) : 0,
    high: Number.isFinite(high) ? Math.max(0, high) : 0,
  };
}

/**
 * Split the firm’s flags into on-the-table vs won-back tallies.
 * @param {MoneyLeak[]} leaks
 * @returns {{
 *   onTheTable: { lowCents: number, highCents: number, count: number, valued: number },
 *   wonBack: { lowCents: number, highCents: number, count: number, valued: number },
 * }}
 */
export function summarizeMoney(leaks) {
  const onTheTable = { lowCents: 0, highCents: 0, count: 0, valued: 0 };
  const wonBack = { lowCents: 0, highCents: 0, count: 0, valued: 0 };
  for (const leak of Array.isArray(leaks) ? leaks : []) {
    const status = leak?.status ?? "needs_callback";
    const { low, high } = feeOf(leak);
    const valued = low > 0 || high > 0 ? 1 : 0;
    if (status === "signed") {
      wonBack.count += 1;
      wonBack.valued += valued;
      wonBack.lowCents += low;
      wonBack.highCents += high;
    } else if (ON_THE_TABLE_STATUSES.has(status)) {
      onTheTable.count += 1;
      onTheTable.valued += valued;
      onTheTable.lowCents += low;
      onTheTable.highCents += high;
    }
    // didnt_sign / bad_number: terminal-lost, contribute to neither tally.
  }
  return { onTheTable, wonBack };
}

// A big, scannable dollar string for the hero — rounded to whole dollars,
// range-only ("$34,000–$81,000"), never a point estimate (methodology promise).
// Uses an en dash between the two figures to read as one number at a glance.
export function fmtBigRange(lowCents, highCents) {
  const lo = dollars(lowCents);
  const hi = dollars(highCents);
  if (lo === hi) return `$${lo.toLocaleString("en-US")}`;
  return `$${lo.toLocaleString("en-US")}–$${hi.toLocaleString("en-US")}`;
}

function dollars(cents) {
  const n = Math.round(Number(cents) / 100);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

// Compact money for tight spots (a card chip): "$25k", "$120k", "$1.2k".
// Whole dollars under $1,000 stay exact ("$800"). Never a point estimate on its
// own — callers pass a low/high pair to fmtKRange.
export function fmtK(cents) {
  const d = dollars(cents);
  if (d < 1000) return `$${d.toLocaleString("en-US")}`;
  const k = d / 1000;
  const shown = k >= 100 || Number.isInteger(k) ? Math.round(k) : Math.round(k * 10) / 10;
  return `$${shown}k`;
}

// A compact fee RANGE for a card chip: "$25k–$60k" (collapses when equal).
// Retained for the Ledger (firm's own average fee) and any internal readout; per
// B-022 the firm-facing callback surfaces show a value TIER, not this dollar.
export function fmtKRange(lowCents, highCents) {
  const lo = fmtK(lowCents);
  const hi = fmtK(highCents);
  return lo === hi ? lo : `${lo}–${hi}`;
}

// Value TIER for a leaked case (B-022). On the firm-facing callback surfaces we
// show a coarse, honest priority band instead of an estimated dollar: a $ figure
// on a case that hasn't signed reads as inflated vendor math (attorney's-eyes
// teardown, insights 2026-07-20) and §IV prefers tiers to point-ish estimates.
// The band is derived from the HIGH end of the sourced fee range; the real dollar
// survives only where the firm entered its OWN average fee (the Ledger).
//
// THRESHOLDS ARE TUNABLE — calibrate against a firm's own average fees. Defaults
// map the PI fee bands from research: commercial/catastrophic/wrongful-death land
// high (~$45k–$150k), standard MVA/premises/dog-bite mid (~$12k–$18k), minor low.
export const VALUE_TIER = Object.freeze({
  high: { key: "high", label: "High-value" },
  standard: { key: "standard", label: "Standard-value" },
  modest: { key: "modest", label: "Modest-value" },
});
const VALUE_TIER_HIGH_MIN_CENTS = 35_000 * 100;
const VALUE_TIER_STANDARD_MIN_CENTS = 8_000 * 100;

// Returns the tier object, or null when no fee value is sourced (no basis → no
// claim; the card then shows confidence only, never a fabricated tier).
export function valueTier(highCents) {
  const hi = Number(highCents);
  if (!Number.isFinite(hi) || hi <= 0) return null;
  if (hi >= VALUE_TIER_HIGH_MIN_CENTS) return VALUE_TIER.high;
  if (hi >= VALUE_TIER_STANDARD_MIN_CENTS) return VALUE_TIER.standard;
  return VALUE_TIER.modest;
}

// Count on-the-table cases by value tier, for the hero's one-line summary.
/** @param {MoneyLeak[]} leaks */
export function tierBreakdown(leaks) {
  const out = { high: 0, standard: 0, modest: 0 };
  for (const leak of Array.isArray(leaks) ? leaks : []) {
    const status = leak?.status ?? "needs_callback";
    if (!ON_THE_TABLE_STATUSES.has(status)) continue;
    const t = valueTier(leak?.feeHighCents);
    if (t) out[t.key] += 1;
  }
  return out;
}

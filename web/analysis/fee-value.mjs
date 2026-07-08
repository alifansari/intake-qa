// Estimated missed FEE value (item 12). The fee_value_ranges table stores CASE
// VALUE ranges (from firm historicals first, else named published sources); the
// fee a firm actually missed is that case value times its contingency percentage.
// Ranges only — never a point estimate. Pure + testable.

// Standard California PI pre-litigation contingency (33 1/3%). Confirmed as the
// default by Ali (July 2026); a firm's own rate overrides it when provided.
// TODO(Ali): set each firm's actual contingency % (and 40% litigation rate) when known.
export const DEFAULT_CONTINGENCY = 1 / 3;

// Convert a CASE-VALUE range (cents) to an estimated FEE range (cents).
export function feeRangeCents(caseLowCents, caseHighCents, contingency = DEFAULT_CONTINGENCY) {
  const low = Math.round(Number(caseLowCents) * contingency);
  const high = Math.round(Number(caseHighCents) * contingency);
  return { lowCents: Math.min(low, high), highCents: Math.max(low, high) };
}

// Given a fee_value_ranges row (case-value range), return the estimated fee range.
export function feeRangeFromRow(row, contingency = DEFAULT_CONTINGENCY) {
  if (!row) return null;
  return feeRangeCents(row.low_cents, row.high_cents, contingency);
}

// The live Leak Audit's per-call engine emits a SINGLE point fee estimate (a
// case-type table lookup), but the methodology promises "a range, never a point
// estimate." Rather than fabricate a symmetric spread around the point, we treat
// the engine's point as the CONSERVATIVE LOW anchor (matching the "quote the low"
// rule) and derive the high with a documented, overridable case-value spread
// factor. The reconstructed case-value band (fee ÷ contingency) is returned too,
// so the exhibit can print the full derivation. Pure. Ranges only.
//
// SPREAD_FACTOR is the documented default assumption (published sources show PI
// settlements commonly span ~2.5× low→high within a case type). TODO(Ali): set a
// per-firm, per-case-type spread from real historicals when available.
export const DEFAULT_SPREAD_FACTOR = 2.5;

export function feeBandFromPoint(pointFeeCents, { contingency = DEFAULT_CONTINGENCY, spreadFactor = DEFAULT_SPREAD_FACTOR } = {}) {
  const low = Math.max(0, Math.round(Number(pointFeeCents) || 0));
  const high = Math.round(low * spreadFactor);
  // Reconstruct the implied case-value band that produced these fees.
  const caseLow = contingency > 0 ? Math.round(low / contingency) : 0;
  const caseHigh = contingency > 0 ? Math.round(high / contingency) : 0;
  return { feeLowCents: low, feeHighCents: high, caseLowCents: caseLow, caseHighCents: caseHigh };
}

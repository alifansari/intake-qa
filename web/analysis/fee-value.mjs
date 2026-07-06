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

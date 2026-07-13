// ============================================================================
// The monthly "Recovered Receipts" for the INDEPENDENT-AUDIT product.
//
// This is the proof-of-value artifact a firm forwards to its partners: the
// signable cases IntakeQA surfaced that the firm's own intake had let slip, and
// how many it won back. Pure compose, no I/O (mirrors lib/ledger/compose.mjs
// and reconcile.ts).
//
// Two disciplines, both non-negotiable:
//   * HONEST ATTRIBUTION. We only ever count a case as "recovered by us" if we
//     surfaced it AND the firm had not already actioned it. A case the firm's
//     own person already had in hand is not our catch. The caller passes only
//     unactioned-then-recovered cases; this module never infers credit.
//   * FIRM'S OWN NUMBER, OR NOTHING (compliance §IV). The dollar line uses the
//     firm's stated average case fee. No fee set → counts only, no dollars.
//     Never an invented valuation, never a guarantee — an estimate with its
//     input printed on the receipt.
//   * MISSES ARE ON THE RECEIPT. Cases we flagged that the firm lost anyway
//     (signed elsewhere) and cases still open are shown, not hidden. A receipt
//     that hides misses is marketing, not accounting.
// ============================================================================

/**
 * @param {{
 *   period: string,                        // "2026-07"
 *   flagged?: number,                      // signable cases we surfaced this period that were UNACTIONED when flagged
 *   recovered?: Array<{ id?: unknown, case_type?: string }>, // of those, the ones the firm won back (signed WITH US)
 *   stillOpen?: number,                    // flagged + being worked, not yet decided
 *   lostAnyway?: number,                   // flagged but signed elsewhere / declined despite the flag (a miss)
 *   settings?: { average_case_fee?: number|null },
 *   subscription?: number|null,            // optional monthly fee, for an ROI multiple (never a % or outcome tie)
 *   recoveredRange?: { lowCents: number, highCents: number }|null, // summed case-type fee bands (preferred dollar source)
 * }} input
 */
export function composeReceipts(input) {
  const {
    period,
    flagged = 0,
    recovered = [],
    stillOpen = 0,
    lostAnyway = 0,
    settings = {},
    subscription = null,
    recoveredRange = null, // { lowCents, highCents } summed from the case-type fee bands
  } = input;

  const fee =
    typeof settings.average_case_fee === "number" && settings.average_case_fee > 0
      ? settings.average_case_fee
      : null;

  const recoveredCount = recovered.length;
  const recoveredValue = fee ? recoveredCount * fee : null;

  // Dollar block: the firm's own number, or nothing (§IV). Two honest sources,
  // in order of precedence: (1) a summed fee RANGE from the firm's per-case-type
  // bands (how the desk already values money — an estimate low–high, never a
  // point figure); (2) a single stated average case fee × count. No source →
  // counts only, never an invented valuation.
  let dollars = null;
  if (recoveredRange && ((recoveredRange.lowCents ?? 0) > 0 || (recoveredRange.highCents ?? 0) > 0)) {
    dollars = {
      kind: "range",
      low: Math.round((recoveredRange.lowCents ?? 0) / 100),
      high: Math.round((recoveredRange.highCents ?? 0) / 100),
      inputs_note: `estimated fee range across ${recoveredCount} case${
        recoveredCount === 1 ? "" : "s"
      } you won back, from your case-type fee bands`,
    };
  } else if (fee) {
    dollars = {
      kind: "average",
      average_case_fee: fee,
      recovered_value: recoveredValue,
      inputs_note: `${recoveredCount} case${recoveredCount === 1 ? "" : "s"} you won back × $${fee.toLocaleString(
        "en-US",
      )} (your stated average case fee)`,
    };
  }

  // Optional ROI framing: a plain multiple of the flat monthly fee. Never a
  // percentage of recovery, never outcome-tied pricing (§I). Shown only when we
  // have both a real recovered dollar figure and a subscription number.
  const roi =
    recoveredValue != null && typeof subscription === "number" && subscription > 0
      ? {
          subscription,
          multiple: Math.round((recoveredValue / subscription) * 10) / 10,
          note: `Recovered value is about ${Math.round(
            (recoveredValue / subscription) * 10,
          ) / 10}× your flat monthly fee. This is an estimate from your stated average fee, not a guarantee.`,
        }
      : null;

  return {
    period,
    flagged,
    recovered: {
      count: recoveredCount,
      ids: recovered.map((r) => r.id).filter((x) => x != null),
    },
    still_open: stillOpen,
    lost_anyway: lostAnyway, // a miss, on the receipt — flagged but lost despite it
    dollars,
    roi,
    methodology: RECEIPTS_METHODOLOGY,
  };
}

// A one-line human headline for the receipt, denominated in signed cases (and
// dollars only if the firm set a fee). Null-safe and never a guarantee.
export function receiptHeadline(receipt) {
  const n = receipt.recovered.count;
  const cases = `${n} signable case${n === 1 ? "" : "s"} won back`;
  const d = receipt.dollars;
  if (d?.kind === "range") {
    return `${cases} — about $${d.low.toLocaleString("en-US")}–$${d.high.toLocaleString("en-US")} in projected fees`;
  }
  if (d) {
    return `${cases} — about $${d.recovered_value.toLocaleString("en-US")} in projected fees`;
  }
  return cases;
}

export const RECEIPTS_METHODOLOGY = {
  recovered:
    "Cases we flagged as signable that your intake had not already actioned, and that you then won back. We never count a case your own team already had in hand — that isn't ours to claim.",
  dollars:
    "The dollar figure is the number of cases you won back times your own stated average case fee. If you haven't set an average fee, we show counts only. It is an estimate with its inputs printed, never a guarantee.",
  misses:
    "Cases we flagged that you lost anyway, and cases still being worked, are shown on the same receipt. A receipt that hides the misses is marketing, not accounting.",
};

// ============================================================================
// The Ledger — monthly one-page receipt. Pure compose, no I/O (Phase 6).
//
// Conservative by construction:
//   * DOLLAR HEADLINE USES THE FIRM’S OWN NUMBER. If the firm hasn’t set an
//     average case fee, the dollar lines are null and the receipt shows
//     counts only — the product never invents a valuation
//     (compliance-invariants §IV: estimates with stated inputs, or nothing).
//   * MISSES ARE ON THE RECEIPT. The SLA block includes unclaimed
//     escalations and the worst ack time — a receipt that hides misses is
//     marketing, not accounting.
//   * PRODUCT vs FIRM contribution are separate columns: the product
//     captured/routed/escalated; whether a lead CONVERTED is the firm’s
//     column, and until the CRM read-back (Phase 7 integration) exists it
//     shows manual dispositions only, labeled as such.
//   * EVERY NUMBER IS DRILLABLE: each stat carries the underlying lead /
//     escalation ids so the UI can link straight to the evidence.
// ============================================================================

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export const DEFAULT_MINUTES_PER_INTAKE = 12;

/**
 * @param {{
 *   period: string,                       // "2026-07"
 *   leads: Array<object>,                 // intake_leads rows for the period
 *   escalations: Array<object>,           // escalations rows (fired in period)
 *   dispositions: Array<object>,          // escalation_dispositions rows
 *   proposals: Array<object>,             // tuning_proposals rows (period)
 *   settings?: { average_case_fee?: number|null, minutes_per_intake?: number }
 * }} input
 */
export function composeLedger(input) {
  const {
    period,
    leads = [],
    escalations = [],
    dispositions = [],
    proposals = [],
    settings = {},
  } = input;

  const fee =
    typeof settings.average_case_fee === "number" && settings.average_case_fee > 0
      ? settings.average_case_fee
      : null;
  const minutesPer = settings.minutes_per_intake ?? DEFAULT_MINUTES_PER_INTAKE;

  // --- captures (the product’s column) --------------------------------------
  const hasContact = (l) => Boolean(l.contact?.phone || l.contact?.first_name);
  const captured = leads.filter(hasContact);
  const byBucket = { book: [], escalate: [], human_handoff: [], decline: [] };
  for (const l of captured) {
    if (byBucket[l.bucket]) byBucket[l.bucket].push(l.id);
  }
  const abandonedButCaptured = captured
    .filter((l) => l.status !== "complete")
    .map((l) => l.id);

  // Leads the product put in front of the firm with a next step attached:
  // booked or escalated (the conservative "caught" definition — handoffs and
  // declines are counted but not valued).
  const caughtIds = [...byBucket.book, ...byBucket.escalate];

  // --- catastrophic-catch log ------------------------------------------------
  const catastrophic = escalations
    .filter((e) => e.tier === "hot")
    .map((e) => ({ id: e.id, trigger: e.trigger_key, lead_id: e.lead_id, fired_at: e.fired_at }));

  // --- escalation SLA (misses included) --------------------------------------
  const ackTimes = escalations
    .filter((e) => e.acked_at)
    .map((e) => (new Date(e.acked_at) - new Date(e.fired_at)) / 60000);
  const unclaimed = escalations.filter((e) => e.status === "unclaimed");
  const sla = {
    fired: escalations.length,
    acked: ackTimes.length,
    median_ack_minutes: ackTimes.length ? Math.round(median(ackTimes)) : null,
    worst_ack_minutes: ackTimes.length ? Math.round(Math.max(...ackTimes)) : null,
    unclaimed: unclaimed.length,                       // the misses, on the receipt
    unclaimed_ids: unclaimed.map((e) => e.id),
  };

  // --- the firm’s column (conversion) ----------------------------------------
  // Until the CRM read-back exists, this is manual dispositions only.
  const converted = dispositions.filter((d) => d.converted === true);
  const firmColumn = {
    source: "manual_dispositions", // becomes 'crm_readback' after Phase 7 connects
    converted: converted.length,
    converted_escalation_ids: converted.map((d) => d.escalation_id),
  };

  // --- tuning summary ----------------------------------------------------------
  const tuning = {
    proposed: proposals.filter((p) => p.status === "proposed").length,
    approved: proposals.filter((p) => p.status === "approved").length,
    rejected: proposals.filter((p) => p.status === "rejected").length,
  };

  // --- currencies ----------------------------------------------------------------
  const timeSavedMinutes = captured.length * minutesPer;
  const dollars = fee
    ? {
        average_case_fee: fee,                        // the firm’s number, printed
        caught_leads_value: caughtIds.length * fee,   // count × THEIR fee
        inputs_note: `${caughtIds.length} caught leads × $${fee.toLocaleString("en-US")} (your stated average case fee)`,
      }
    : null; // no firm fee → no dollar lines at all

  return {
    period,
    product: {
      captured: captured.length,
      captured_ids: captured.map((l) => l.id),
      abandoned_but_captured: abandonedButCaptured.length,
      abandoned_ids: abandonedButCaptured,
      by_bucket: {
        book: byBucket.book.length,
        escalate: byBucket.escalate.length,
        human_handoff: byBucket.human_handoff.length,
        decline: byBucket.decline.length,
      },
      bucket_ids: byBucket,
      caught: caughtIds.length,
      caught_ids: caughtIds,
    },
    firm: firmColumn,
    catastrophic,
    sla,
    tuning,
    time_saved_minutes: timeSavedMinutes,
    dollars,
  };
}

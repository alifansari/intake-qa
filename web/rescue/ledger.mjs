// Recovered-revenue ledger + proof engine (module 5) and the beta's utility
// evidence. Every rescued case carries a unique rescue tag and moves through
// flagged -> contacted -> consult -> signed -> settled (or dead).
//
// HONESTY RULES enforced here, not in copy:
//   * "Would-have-lost" gating: a case counts as RECOVERED only when it had
//     gone cold before the flag (no scheduled next step AND past the firm's
//     normal follow-up window). Frozen at packet time, before any callback.
//   * Recovered totals count SIGNED+ stages only (matching the existing
//     signed-only rule in messaging/reconcile.mjs).
//   * Optional random control holdout supports the counterfactual claim.
//
// Split: pure stage machine + gating + CSV (no I/O), thin persistence wrappers.

import {
  getLedgerEntry,
  listLedgerEntries,
  updateLedgerEntry,
  parseJson,
} from "../beta/store.mjs";

export const STAGES = Object.freeze(["flagged", "contacted", "consult", "signed", "settled", "dead"]);

// Forward-only stage edges ('dead' reachable from any live stage).
const STAGE_EDGES = Object.freeze({
  flagged: ["contacted", "dead"],
  contacted: ["consult", "dead"],
  consult: ["signed", "dead"],
  signed: ["settled", "dead"],
  settled: [],
  dead: [],
});

export function canAdvanceStage(from, to) {
  return (STAGE_EDGES[from] ?? []).includes(to);
}

// Pure would-have-lost assessment (the gating counterfactual). "Cold" = no
// scheduled next step AND the firm's normal follow-up window had already
// elapsed when the flag surfaced.
export function assessWouldHaveLost({ callReceivedAt, followUpWindowHours = 72, hasScheduledNextStep, now = new Date() }) {
  if (hasScheduledNextStep) {
    return { wouldHaveLost: false, basis: "a next step was already scheduled — firm was still working the lead" };
  }
  const received = callReceivedAt ? new Date(callReceivedAt) : null;
  if (!received || Number.isNaN(received.getTime())) {
    return { wouldHaveLost: false, basis: "call timestamp unknown — cannot establish the lead had gone cold" };
  }
  const hoursSince = (new Date(now).getTime() - received.getTime()) / 3_600_000;
  if (hoursSince > followUpWindowHours) {
    return {
      wouldHaveLost: true,
      basis: `no scheduled next step and ${Math.floor(hoursSince)}h since the call, past the firm's ${followUpWindowHours}h follow-up window`,
    };
  }
  return {
    wouldHaveLost: false,
    basis: `still inside the firm's ${followUpWindowHours}h follow-up window — firm may yet have recovered it unaided`,
  };
}

// Unique, human-quotable rescue tag: RSQ-<year>-<zero-padded seq per firm>.
export async function nextRescueTag(db, firmId, now = new Date()) {
  const entries = await listLedgerEntries(db, firmId);
  const year = new Date(now).getUTCFullYear();
  return `RSQ-${year}-${String(entries.length + 1).padStart(6, "0")}`;
}

// Guarded stage advance. Records who moved it (the CRM sync or a named staffer)
// and stamps the matching timestamp column.
export async function advanceStage({ db, entryId, to, by = "crm_sync", feeValueCents = null, now = new Date() }) {
  const entry = await getLedgerEntry(db, entryId);
  if (!entry) throw new Error(`unknown ledger entry: ${entryId}`);
  if (!canAdvanceStage(entry.stage, to)) {
    throw new Error(`illegal stage transition: ${entry.stage} -> ${to}`);
  }
  const at = new Date(now).toISOString();
  const history = parseJson(entry.stage_history, []);
  history.push({ stage: to, at, by });

  await updateLedgerEntry(db, entryId, {
    stage: to,
    stage_history: history,
    fee_value_cents: feeValueCents,
    contacted_at: to === "contacted" ? at : null,
    signed_at: to === "signed" ? at : null,
    settled_at: to === "settled" ? at : null,
  });
  return { from: entry.stage, to };
}

const RECOVERED_STAGES = new Set(["signed", "settled"]);

// Pure rollup for the monthly ROI report. "Recovered" is DOUBLE-gated: the
// case reached signed/settled AND it would have been lost without the flag.
// Control-holdout entries are excluded from recovered totals and reported
// separately (they exist to prove the counterfactual, not to pad it).
export function ledgerSummary(entries) {
  const live = (entries ?? []).filter((e) => !truthy(e.control_holdout));
  const holdout = (entries ?? []).filter((e) => truthy(e.control_holdout));
  const recovered = live.filter(
    (e) => RECOVERED_STAGES.has(e.stage) && truthy(e.would_have_lost)
  );
  const byStage = {};
  for (const stage of STAGES) byStage[stage] = live.filter((e) => e.stage === stage).length;
  return {
    total: live.length,
    byStage,
    recoveredCount: recovered.length,
    recoveredFeeCents: recovered.reduce((a, e) => a + Number(e.fee_value_cents ?? 0), 0),
    signedNotGated: live.filter((e) => RECOVERED_STAGES.has(e.stage) && !truthy(e.would_have_lost)).length,
    holdoutCount: holdout.length,
    holdoutSignedCount: holdout.filter((e) => RECOVERED_STAGES.has(e.stage)).length,
  };
}

function truthy(v) {
  return v === true || v === 1;
}

// CSV export (MVP deliverable for the monthly ROI report; PDF comes later).
// TODO(pdf): monthly ROI PDF via the existing @react-pdf/renderer pipeline
// (src/pdf), emailed via Resend on period close.
export function ledgerToCsv(entries) {
  const header = [
    "rescue_tag",
    "stage",
    "would_have_lost",
    "control_holdout",
    "fee_value_cents",
    "contacted_at",
    "signed_at",
    "settled_at",
    "created_at",
  ];
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = (entries ?? []).map((e) =>
    [
      e.rescue_tag,
      e.stage,
      truthy(e.would_have_lost) ? "yes" : "no",
      truthy(e.control_holdout) ? "yes" : "no",
      e.fee_value_cents ?? "",
      e.contacted_at ?? "",
      e.signed_at ?? "",
      e.settled_at ?? "",
      e.created_at ?? "",
    ]
      .map(esc)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

// Firm-facing monthly report data: summary + rows, ready for CSV/email.
export async function monthlyLedgerReport({ db, firmId }) {
  const entries = await listLedgerEntries(db, firmId);
  return { summary: ledgerSummary(entries), csv: ledgerToCsv(entries), entries };
}

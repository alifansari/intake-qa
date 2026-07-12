// Done-for-you daily rescue packet (module 4).
//
// A prioritized daily list CAPPED AT THE TOP 3 cases, ranked by
// (case value × recoverability). Each item: prospect details, a plain-English
// diagnosis of what went wrong, and a pre-filled callback script a staffer can
// read in ~2 minutes. The firm's OWN staff make the callback — this module
// builds and records the packet; it has no ability to contact a prospect.
//
// Candidates come exclusively from rescue/review.mjs surfaceableCandidates()
// (human-confirmed flags only — invariant d). Building a packet also opens a
// ledger entry per item, so every surfaced case is trackable end-to-end.
//
// Split: pure ranking/composition (no I/O) + a thin orchestrator.

import { surfaceableCandidates } from "./review.mjs";
import {
  createRescuePacket,
  addRescuePacketItem,
  getRescuePacket,
  getLedgerEntryByFlag,
  createLedgerEntry,
} from "../beta/store.mjs";
import { getFirm } from "../ingest/store.mjs";
import { nextRescueTag, assessWouldHaveLost } from "./ledger.mjs";

export const PACKET_CAP = 3;

// Days-to-SOL urgency multiplier: a case inside the urgent window ranks higher
// because the recoverable value decays to zero at the statute date (module 12).
function urgencyMultiplier(daysToSol, urgentThresholdDays = 90) {
  if (daysToSol == null) return 1;
  if (daysToSol <= 0) return 0; // expired: never packeted
  if (daysToSol <= urgentThresholdDays) return 1.25;
  return 1;
}

// Pure ranking: score = estValueCents × recoverability × urgency; take top 3.
// Recoverability defaults conservatively when unknown. Deterministic ties
// break on older call first (staler leads decay fastest).
export function rankRescueCandidates(candidates, { cap = PACKET_CAP, urgentThresholdDays = 90 } = {}) {
  return (candidates ?? [])
    .map((c) => ({
      ...c,
      recoverability: c.recoverability ?? 0.3,
      _score:
        (c.est_value_cents ?? 0) *
        (c.recoverability ?? 0.3) *
        urgencyMultiplier(c.days_to_sol ?? null, urgentThresholdDays),
    }))
    .filter((c) => c._score > 0)
    .sort((a, b) => b._score - a._score || String(a.received_at).localeCompare(String(b.received_at)))
    .slice(0, cap)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

// Pre-filled callback script (~2 min read). Deterministic template from flag
// facts — the same fields a staffer needs in the first 30 seconds of the call.
//
// TODO(llm): optional Claude polish behind a seam (drafted-then-approved, like
// messaging/draft.mjs). The deterministic version ships first so the beta can
// run with zero model dependency in this path.
export function draftCallbackScript({ prospectName, caseType, diagnosis, firmName }) {
  const name = prospectName || "there";
  const matter = caseType ? caseType.replace(/_/g, " ") : "your accident";
  return [
    `Hi ${name}, this is [YOUR NAME] from ${firmName}.`,
    `You called us about ${matter}, and I'm sorry we didn't get you taken care of on that first call — ${diagnosis || "we should have moved faster"}.`,
    `The attorney reviewed your situation and wants to talk with you. It's a free consultation, and there's no fee unless we win your case.`,
    `Are you free for a quick call with them today or tomorrow? I can also text you a couple of times that work.`,
    `[IF VOICEMAIL] Please call us back at [FIRM NUMBER] — cases like this have legal deadlines, and we want to make sure you don't lose the chance to bring yours.`,
  ].join("\n\n");
}

// Build (or return) today's packet for a firm. Idempotent per (firm, date).
// Every packeted flag gets a ledger entry with a unique rescue tag and the
// would-have-lost assessment frozen at packet time.
export async function buildDailyPacket({ db, firmId, date, now = new Date() }) {
  const packetDate = date ?? now.toISOString().slice(0, 10);
  const existing = await getRescuePacket(db, firmId, packetDate);
  if (existing) return { ...existing, existed: true };

  const firm = await getFirm(db, firmId);
  const candidates = await surfaceableCandidates({ db, firmId });
  if (candidates.length === 0) return { empty: true, packetDate };

  // Value each candidate at the firm's avg case fee (whole dollars -> cents)
  // until per-case-type fee ranges (fee_value_ranges) carry a firm override.
  const avgFeeCents = Number(firm?.avg_case_fee ?? 0) * 100;
  const valued = candidates.map((c) => ({
    ...c,
    est_value_cents: c.est_value_cents ?? avgFeeCents,
    // CRM-imported candidates carry a deterministic SOL estimate from their
    // triage read (analysis/sol.mjs via rescue/triage.mjs, joined in
    // listRescueCandidates). NULL means "no urgency signal", never a guess.
    // TODO(analysis): run the same SOL pass for call-flow flags.
    days_to_sol: c.days_to_sol ?? c.sol_days_remaining ?? null,
  }));

  const ranked = rankRescueCandidates(valued);
  if (ranked.length === 0) return { empty: true, packetDate };

  const packetId = await createRescuePacket(db, { firm_id: firmId, packet_date: packetDate });

  for (const item of ranked) {
    const script = draftCallbackScript({
      prospectName: item.caller_name,
      caseType: item.case_type,
      diagnosis: item.reason,
      firmName: firm?.name ?? "the firm",
    });
    await addRescuePacketItem(db, {
      packet_id: packetId,
      flag_id: item.flag_id,
      rank: item.rank,
      prospect_name: item.caller_name,
      prospect_phone: item.caller_phone,
      diagnosis: item.reason,
      callback_script: script,
      est_value_cents: item.est_value_cents,
      recoverability: item.recoverability,
      sol_deadline: item.sol_deadline ?? null,
    });

    // Open the ledger entry (one per flag, idempotent) with the counterfactual
    // frozen NOW — "would we have lost this without the flag?" is only honest
    // if answered before the callback happens.
    const ledgerExisting = await getLedgerEntryByFlag(db, item.flag_id);
    if (!ledgerExisting) {
      const wouldHaveLost = assessWouldHaveLost({
        callReceivedAt: item.received_at,
        followUpWindowHours: Number(firm?.reengage_window_hours ?? 72),
        hasScheduledNextStep: false, // a leaked-signable flag means no next step was secured
        now,
      });
      await createLedgerEntry(db, {
        firm_id: firmId,
        flag_id: item.flag_id,
        rescue_tag: await nextRescueTag(db, firmId, now),
        stage: "flagged",
        would_have_lost: wouldHaveLost.wouldHaveLost,
        would_have_lost_basis: wouldHaveLost.basis,
        fee_value_cents: item.est_value_cents,
      });
    }
  }

  return { ...(await getRescuePacket(db, firmId, packetDate)), existed: false };
}

// Human-in-the-loop review layer (module 3, invariant d).
//
// No signable-but-lost flag reaches a tester until a NAMED human reviewer
// confirms it here. The queue is the analyst's surface (service-role only in
// Supabase — a pending flag is invisible to the firm by RLS, not just by UI).
// Rejection is one click: "not a real case" + why, and the why is captured as
// structured criteria feedback that tunes the firm's ruleset overrides.

import {
  enqueueReviewItem,
  getReviewItemByFlag,
  listReviewItems,
  setReviewItemState,
  listRescueCandidates,
  getFirmRulesetOverrides,
  upsertFirmRulesetOverrides,
  parseJson,
} from "../beta/store.mjs";
import { getFlagConfidence } from "../ingest/store.mjs";

// Enqueue a leaked-signable flag for human review. Called by the scoring
// worker whenever flags.is_leaked_signable lands true. Idempotent per flag.
export async function enqueueForReview({ db, firmId, flagId }) {
  const existing = await getReviewItemByFlag(db, flagId);
  if (existing) return { reviewItemId: existing.id, existed: true };
  const confidence = await getFlagConfidence(db, flagId).catch(() => null);
  const confidenceTier = confidence?.confidence_tier ?? null;
  const reviewItemId = await enqueueReviewItem(db, {
    firm_id: firmId,
    flag_id: flagId,
    confidence_tier: confidenceTier,
  });
  return { reviewItemId, existed: false };
}

// Confirm: the reviewer stands behind the flag; it may now surface to the firm
// (packet builder reads only confirmed items). Reviewer name is REQUIRED —
// sign-off is a named human act, not a checkbox.
export async function confirmFlag({ db, reviewItemId, reviewer, now = new Date() }) {
  if (!reviewer || String(reviewer).trim().length === 0) {
    throw new Error("confirmFlag requires a named reviewer");
  }
  await setReviewItemState(db, reviewItemId, "confirmed", { reviewer, reviewedAt: now });
  return { state: "confirmed" };
}

// One-click reject: "not a real case." criteria describes WHICH firm criterion
// the flag violated (e.g. { tunable: 'caseTypesExcluded', value: 'workers_comp' });
// when present it is appended to the firm's ruleset overrides so the same junk
// flag doesn't come back next week. That write is what earns tester trust.
export async function rejectFlag({
  db,
  reviewItemId,
  reviewer,
  reason,
  criteria = null,
  firmId = null,
  now = new Date(),
}) {
  if (!reviewer || String(reviewer).trim().length === 0) {
    throw new Error("rejectFlag requires a named reviewer");
  }
  await setReviewItemState(db, reviewItemId, "rejected", {
    reviewer,
    reviewedAt: now,
    rejectReason: reason ?? "not_a_real_case",
    criteriaFeedback: criteria,
  });

  if (criteria && firmId != null) {
    await applyCriteriaFeedback({ db, firmId, criteria, now });
  }
  return { state: "rejected" };
}

// Fold one rejection's criteria feedback into the firm's tunable overrides.
// Only list-shaped tunables accumulate (e.g. adding a case type to
// caseTypesExcluded); scalar tunables are overwritten. Unknown tunables are
// ignored by mergeTunables at read time, so bad feedback can't corrupt scoring.
//
// TODO(ml): this is the deliberate v1 "retraining" — deterministic criteria
// updates, no model fine-tuning (invariant e: no training on call content).
export async function applyCriteriaFeedback({ db, firmId, criteria, now = new Date() }) {
  const { tunable, value } = criteria ?? {};
  if (!tunable) return { applied: false };
  const row = await getFirmRulesetOverrides(db, firmId);
  const overrides = parseJson(row?.overrides, {});
  const current = overrides[tunable];
  if (Array.isArray(current)) {
    if (!current.includes(value)) current.push(value);
  } else if (current == null && typeof value === "string") {
    overrides[tunable] = [value];
  } else {
    overrides[tunable] = value;
  }
  await upsertFirmRulesetOverrides(db, firmId, row?.ruleset_key ?? "california-pi", overrides, now);
  return { applied: true, overrides };
}

// The review queue for the analyst UI.
export async function reviewQueue({ db, firmId, state = "pending" }) {
  return listReviewItems(db, firmId, state);
}

// The ONLY reading surface the firm-facing packet builder uses: confirmed,
// human-signed-off flags not yet packeted (invariant d holds by construction).
export async function surfaceableCandidates({ db, firmId }) {
  return listRescueCandidates(db, firmId);
}

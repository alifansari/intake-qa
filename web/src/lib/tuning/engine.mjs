// ============================================================================
// De-escalation / false-positive tuning engine — pure logic (Phase 5).
//
// The loop: dispositions accumulate on resolved escalations → monthly, this
// engine computes PER-TRIGGER PRECISION and PROPOSES tunings. It never
// applies anything — an attorney approves each proposal by name, and only
// then does the change land in firm_escalation_config.overrides.
//
// Rules the spec makes load-bearing:
//   * Precision counts true_positive vs false_positive ONLY.
//     right_call_bad_outcome is excluded from the denominator (the call was
//     right), and "didn't convert" (the separate `converted` axis) never
//     touches precision — a signable case that walked is not a false alarm.
//   * SAMPLE-SIZE GATE: below MIN_SAMPLE dispositions, no proposal. Noise is
//     not a trend.
//   * PREFER TIER-DOWNGRADE over suppression: a noisy hot trigger becomes
//     warm, a noisy warm becomes flagged; only an already-flagged,
//     non-protected trigger may be proposed for suppression.
//   * PROTECTED triggers are NEVER auto-proposed for loosening. The only path
//     is requestProtectedLoosening() with the exact typed friction phrase —
//     deliberate, recorded, attributable.
//   * HYSTERESIS / RE-ESCALATE: one missed real case (a true_positive that
//     arrived through a previously-downgraded trigger) proposes an immediate
//     tier_restore, bypassing the sample gate. Getting quieter is slow;
//     getting louder is instant.
// ============================================================================

import { getTrigger } from "../escalation/engine.mjs";

export const MIN_SAMPLE = 10;          // dispositions needed before proposing
export const PRECISION_FLOOR = 0.5;    // below this, propose quieting

const TIER_DOWN = { hot: "warm", warm: "flagged", flagged: null };

// --- precision math -----------------------------------------------------------
/**
 * @param {Array<{trigger_key:string, disposition:string, converted?:boolean|null}>} rows
 *   one row per disposed escalation
 * @returns {Map<string, {fired:number, tp:number, fp:number, rcbo:number,
 *   precision:number|null, converted:number, not_converted:number}>}
 */
export function computeTriggerStats(rows = []) {
  const stats = new Map();
  for (const r of rows) {
    if (!stats.has(r.trigger_key)) {
      stats.set(r.trigger_key, {
        fired: 0, tp: 0, fp: 0, rcbo: 0, precision: null,
        converted: 0, not_converted: 0,
      });
    }
    const s = stats.get(r.trigger_key);
    s.fired++;
    if (r.disposition === "true_positive") s.tp++;
    else if (r.disposition === "false_positive") s.fp++;
    else if (r.disposition === "right_call_bad_outcome") s.rcbo++;
    // Conversion is a SEPARATE ledger — never part of precision.
    if (r.converted === true) s.converted++;
    else if (r.converted === false) s.not_converted++;
  }
  for (const s of stats.values()) {
    const denom = s.tp + s.fp; // rcbo excluded: the call was right
    s.precision = denom > 0 ? s.tp / denom : null;
  }
  return stats;
}

// --- monthly proposals ----------------------------------------------------------
/**
 * @param {Map} stats — from computeTriggerStats
 * @param {object} overrides — current firm_escalation_config.overrides
 * @returns {Array<{trigger_key, current_tier, proposed_action, proposed_tier,
 *   rationale, sample_size, requires_friction}>}
 */
export function proposeTunings(stats, overrides = {}) {
  const proposals = [];
  for (const [key, s] of stats.entries()) {
    const trigger = getTrigger(key);
    if (!trigger) continue;
    const currentTier = overrides?.[key]?.tier ?? trigger.tier;

    // Sample-size gate: noise is not a trend.
    const sample = s.tp + s.fp; // rcbo doesn't count toward the gate either
    if (sample < MIN_SAMPLE) continue;
    if (s.precision === null || s.precision >= PRECISION_FLOOR) continue;

    // PROTECTED triggers are never auto-proposed for loosening. Full stop.
    if (trigger.protected) continue;

    const downTier = TIER_DOWN[currentTier];
    const rationale = {
      precision: Number(s.precision.toFixed(3)),
      tp: s.tp,
      fp: s.fp,
      rcbo: s.rcbo,
      note: "conversion tracked separately; not part of precision",
    };
    if (downTier) {
      // Prefer downgrade over suppression.
      proposals.push({
        trigger_key: key,
        current_tier: currentTier,
        proposed_action: "tier_downgrade",
        proposed_tier: downTier,
        rationale,
        sample_size: sample,
        requires_friction: false,
      });
    } else {
      // Already flagged and still noisy → suppression is the last resort.
      proposals.push({
        trigger_key: key,
        current_tier: currentTier,
        proposed_action: "suppress",
        proposed_tier: null,
        rationale,
        sample_size: sample,
        requires_friction: false,
      });
    }
  }
  return proposals;
}

// --- hysteresis: one missed real case re-escalates immediately -------------------
/**
 * A true_positive that arrived via a trigger whose tier was previously
 * downgraded (override below registry default) proposes an instant restore.
 * Bypasses the sample gate by design.
 */
export function checkHysteresis(triggerKey, overrides = {}) {
  const trigger = getTrigger(triggerKey);
  if (!trigger) return null;
  const currentTier = overrides?.[triggerKey]?.tier ?? trigger.tier;
  const RANK = { hot: 0, warm: 1, flagged: 2 };
  if (RANK[currentTier] <= RANK[trigger.tier]) return null; // not downgraded
  return {
    trigger_key: triggerKey,
    current_tier: currentTier,
    proposed_action: "tier_restore",
    proposed_tier: trigger.tier,
    rationale: { reason: "missed_real_case", note: "hysteresis: re-escalate on a true positive through a downgraded trigger" },
    sample_size: 1,
    requires_friction: false,
  };
}

// --- protected loosening: deliberate friction only --------------------------------
export function frictionPhraseFor(triggerKey) {
  return `LOOSEN ${triggerKey.toUpperCase()} — I ACCEPT THE RISK OF A MISSED CASE`;
}

/**
 * The ONLY path to loosening a protected trigger. The caller must supply the
 * exact friction phrase; anything else is refused. Returns a proposal that
 * still requires named attorney approval on top.
 */
export function requestProtectedLoosening(triggerKey, proposedTier, typedPhrase) {
  const trigger = getTrigger(triggerKey);
  if (!trigger) return { ok: false, reason: "unknown_trigger" };
  if (!trigger.protected) return { ok: false, reason: "not_protected_use_normal_flow" };
  if (!["hot", "warm", "flagged"].includes(proposedTier)) {
    return { ok: false, reason: "invalid_tier" };
  }
  const expected = frictionPhraseFor(triggerKey);
  if (typedPhrase !== expected) {
    return { ok: false, reason: "friction_phrase_mismatch", expected };
  }
  return {
    ok: true,
    proposal: {
      trigger_key: triggerKey,
      current_tier: trigger.tier,
      proposed_action: "loosen_protected",
      proposed_tier: proposedTier,
      rationale: { reason: "explicit_protected_loosening" },
      sample_size: 0,
      requires_friction: true,
      friction_phrase: typedPhrase,
    },
  };
}

// --- applying an APPROVED proposal to config overrides ----------------------------
// Pure: returns the NEW overrides object. Only approved proposals reach here;
// the store layer enforces named approval.
export function applyProposalToOverrides(overrides, proposal) {
  const next = { ...(overrides ?? {}) };
  const cur = { ...(next[proposal.trigger_key] ?? {}) };
  switch (proposal.proposed_action) {
    case "tier_downgrade":
    case "tier_restore":
      cur.tier = proposal.proposed_tier;
      cur.enabled = true;
      delete cur.loosened; // a restore clears any prior loosening marker
      break;
    case "loosen_protected":
      // The `loosened` marker is what lets mergeConfig honor a protected
      // downgrade — only this approved-friction path ever writes it.
      cur.tier = proposal.proposed_tier;
      cur.enabled = true;
      cur.loosened = true;
      break;
    case "suppress":
      cur.enabled = false;
      break;
    default:
      return next;
  }
  next[proposal.trigger_key] = cur;
  return next;
}

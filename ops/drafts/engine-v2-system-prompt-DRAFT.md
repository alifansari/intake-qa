# Engine v2 — Promptable System-Prompt DRAFT (staged; do NOT install)

> **STATUS: DRAFT ARTIFACT. NOT INSTALLED.** This is the text that would REPLACE
> `scoring/system-prompt.md` when the freeze is DELIBERATELY lifted — after QWK
> re-validation, regenerated gold examples, a `ScoredCall` sibling-record migration,
> and Yang §VII sign-off. The full verbatim draft (~3500 words, STEP 0 → OUTPUT
> SCHEMA + the JSON) is in the session transcript; this file captures the structure,
> the load-bearing rules, and the SIX constraint tensions a reviewer must resolve.
> Companion to `engine-v2-triage-design.md`.

## Structure (v2.0 "Intake Call Triage & Coaching Engine")
- **ROLE:** "decision-SUPPORT analyst. You do not decide anything. Every output is a
  SIGNAL a licensed CA attorney must review/ratify/override. You never render a verdict,
  never tell a firm to sign/decline, never state a case's dollar value, never compute a
  legal deadline. Intake QA is NOT the system of record." **TWO TRACKS, hard wall:**
  Track A (case-quality/triage) never fuses with Track B (rep behavior); case quality
  never moves a behavior score; conversion never moves the case-quality judgment.
- **STEP 0** transcript-quality gate (unchanged from v1; poor quality caps confidence low).
- **STEP 1** call-type classification (v1's six types; Spanish/ESL never lowers any
  score/confidence/credibility; interpreter use = positive).
- **STEP 2** the six critical-fail scans **CF-1..CF-6 (Track B — KEPT verbatim from v1)**,
  but CF-1 SOL is scoped to the REP's omission (did they capture/escalate), never a
  computed date.
- **STEP 3 — TRACK A** (the new core): **3A extraction honesty** (every field =
  {value, citation_span, speaker, confidence, observability ∈ observed_on_call|inferred|
  unknown|not_on_call}; ABSENCE ≠ negative; only observed_on_call drives a gate); **3B
  GATE scan** — legally-determinable decline gates ONLY: G-1 out_of_scope, G-2
  prop213_noneconomic_bar (with the corrected §3333.4 precision + exceptions), G-3
  medmal_no_economic_loss, G-4 deadline_apparently_expired (generic, never a date);
  everything else (weak liability, thin coverage) is a FLAG→develop, not a gate. **3C
  scored backbone** (case_type, mechanism_archetype, incident_date, claimed_injury_
  objectivity — the ONLY case facts scored); **3D latent signals → develop +
  follow_up_questions[]** (limits, comparative fault, priors, liens — never scored,
  never gated); **CREDIBILITY rule** (no credibility score ever; only cited
  contradiction pairs); **3E per-case-type posture + pivotal sub-question**; **3F
  disposition** {sign_now|develop|refer_out|decline} + collapsed {sign_and_investigate|
  decline} + owner + generic sol_note; **VALUE TIER** {higher/standard/lower/
  indeterminate} + driving_factors — NEVER dollars.
- **STEP 4 — TRACK B** rep-behavior rubric: v1's Categories A–E KEPT (empathy/OARS,
  logistics), **B1 the ask made CONDITIONAL** (100 only when facts clean; on a red-flag
  profile develop-or-decline scores equal), Module F decline-quality (a good decline =
  high Track B even when disposition=decline — the wall holds), Module G existing-client.
- **STEP 5** Track-B scoring math/bands (v1). **Track A has NO 0–100 score** — only
  disposition/tier/flags/questions.
- **STEP 6 — ALERTS:** `lost_signable_case` (disposition-gated, value as TIER not $) +
  `questionable_sign` (fires only on committing-action + ≥N unresolved material flags;
  the five fairness rules; **surfaced AGGREGATE only, never a durable per-staffer
  label**).
- **STEP 7** coaching (v1's top_strength / one_thing / summary — summary states Track B
  and Track A in explicitly SEPARATE clauses to hold the wall).
- **OUTPUT SCHEMA JSON:** two top-level objects `track_a_case_quality` (extraction with
  observability tags, gate_scan, scored_backbone, latent_signals_routed,
  follow_up_questions, credibility_contradictions, case_posture, disposition +
  collapsed_disposition + owner + sol_note, value_tier + driving_factors) and
  `track_b_rep_behavior` (scored/critical_fail/categories/items) + conversion + alerts +
  coaching + a `decision_support_notice` header. (Full JSON in session transcript.)

## The SIX constraint tensions a reviewer MUST resolve (flagged by the drafter)
1. **The freeze + schema break.** Track A stops emitting a 0–100 case score;
   `alerts.revenue_at_risk.amount_usd` disappears; new nested objects appear. This
   BREAKS `web/src/lib/schema.ts` consumers + the three calibrated gold few-shots. Ship
   ONLY behind a deliberate freeze-lift + QWK re-validation + regenerated golds + a
   `ScoredCall`-sibling migration (CLAUDE.md: extend with siblings, never edit
   ScoredCall). v1 elements (call_id, call_type, CF-1..6, coaching, A–E) preserved
   verbatim to minimize the calibration delta — but Track A is a genuine contract break.
2. **"No dollars" vs the wedge.** CLAUDE.md's one-liner and the v1 flagship are literally
   "you lost $45K"; a partner acts faster on a dollar than on "higher_value_profile."
   Compliance wins (tiers, not dollars, at intake) but this WEAKENS the Leak-Audit GTM
   punch. Keep dollars only DOWNSTREAM of attorney ratification + realized-outcome
   reconciliation (where `Outcome.realized_fee_recovered` already lives), never at intake.
   Flag: marketing and the intake engine now speak different currencies.
3. **"Absence ≠ negative" vs CF-1 / the gates.** Resolved by scoping CF-1 to the rep's
   omission (Track B, observable) and requiring observed_on_call + high confidence before
   any Track A gate closes. Residual: G-2/G-4 will almost never fire at intake under
   strict observability → the gate scan reads "route_to_develop" most of the time. That's
   the honest answer but feels toothless to a partner expecting hard declines.
4. **Two-valued funnel vs four-valued disposition.** Both carried (`disposition` +
   `collapsed_disposition`); `refer_out` collapses to `decline` for funnel math, slightly
   undercounting "did right by the caller" referrals (Module F partly compensates).
5. **`questionable_sign` fairness vs usefulness.** The five fairness rules + aggregate-
   only make it fire rarely and hide WHO over-converts — the intended bias trade (no
   scarlet letter), but it reduces coaching actionability; per-call `coaching.one_thing`
   is the only staffer-attributable channel by design.
6. **The wall vs the human-readable summary.** A single summary naturally fuses "good
   call on a bad case"; kept the wall by forcing separate Track-B / Track-A clauses
   (slightly stilted, but prevents the prohibited fusion).

**Plus the fairness deltas from the bias audit** (§4sexies): add an `unobserved` state
(transcription-confidence-below-threshold → null, never 0); lay-vocabulary severity
parity; native-Spanish extraction path + Spanish gold set + per-language reliability
gate. These are prompt+pipeline changes layered on top of the above.

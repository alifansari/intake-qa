# Canary set — drift detection for the pinned calibration state

Seven synthetic intake-call transcripts, one per named failure mode /
boundary the engine must hold. Scored live by `scoring-v2/canary-run.js`
against the pinned CODE-LAYER baseline in `expected.json` (gates fired,
disposition, value tier, confidence tier, abstention, attorney-review flag,
MIST flag, urgency flags). Any mismatch prints DRIFT and the runner exits
nonzero.

Protocol (architecture brief + README calibration-state section):

- Run the full set after ANY change to system-prompt.md, the golds or their
  order, the model id, or temperature — and weekly even with no changes
  (providers ship behavior changes without version bumps).
- A DRIFT is a stop-the-line event: diagnose whether the model moved or the
  transcript was always ambiguous before touching `expected.json`.
  Re-pinning the baseline is a calibration change (decisions-log entry).
- `expected.json` pins CODE-LAYER outputs only — never dimension wordings —
  so the canaries tolerate benign extraction rephrasing and catch outcome
  drift.
- `urgency_flags` is pinned as a REQUIRED SUBSET, not an exact set: which of
  G2's three signals the model marks present wobbles on inference-rich
  profiles (verified live on c6 — perishable_evidence appeared in 1 of 2
  runs while G2 fired identically). A pinned flag going missing is DRIFT; an
  extra inferred flag prints a WARN and passes. Every other field is
  exact-matched, including each gate's fired boolean.

Baseline pinned 2026-07-11 from hand-verified live runs (c1 and c6
transcripts were fixed after first-run misreads BEFORE pinning — see git
history). An immediate independent verification run against the pinned
baseline scored 7/7 canaries correct on every exact-matched field (c6's
perishable-flag wobble is the WARN case above).

## The seven canaries and their hand-traced outcomes

Each expectation below was traced through gates.mjs + decision-table.mjs +
confidence.mjs BEFORE the baseline was pinned from the first live run
(firm config: the template — mva_standard volume, default selective,
thin threshold 2, mist_handling develop, no trial capital).

- **c1 over-conversion** — aggressive on-call e-sign over thin facts
  (disputed lane change, no report, no witnesses, six-week no-treatment gap,
  coverage never discussed; vehicle damage deliberately substantial — a
  crumpled quarter panel — so no MIST trigger muddies the read). Trace:
  coverage + collectability unknown → R3 develop; damages thin → value low;
  5/7 dims on evidence → medium, near-zero applicable questions asked →
  stepdown → confidence low. The signature is recorded as a rep fact; the
  case behind it grades develop, not sign.
- **c2 Prop-213 uninsured owner (no DUI)** — clean liability (red light,
  witness, citation to defendant), chiro-only care, caller states she owns
  the car and dropped insurance last fall. Trace: G1 fires (barred profile,
  no objective anchors) → caps to {refer, decline}; base R6 sign_now → R9
  cap, damages adequate (not strong) → decline_with_grace; value low
  (G1-forced); confidence high.
- **c3 Prop-213 owner + OBSERVED defendant DUI** — same barred profile but
  the defendant was breathalyzed and arrested for DUI on scene (stated,
  quoted). Trace: §3333.4(c) withholds the G1 cap → no gate fires; flags
  attorney_review_required + possible_3333_4c_dui_exception; base R6
  sign_now stands, subject to attorney review; value standard; confidence
  high. The engine must NOT decline this file — conviction status is the
  attorney's question.
- **c4 borderline develop/sign** — the posture-divergence profile: liability
  adequate (report pending), damages adequate (MD + PT starting, missed
  shifts), coverage thin (quoted state-minimum signal, UM path not
  developed), collectability adequate. Trace: single thin load-bearing →
  R5 → volume posture → sign_now (a selective firm's table develops it);
  value standard; confidence high. Tolerates a coverage thin↔adequate wobble
  (R5 and R6 both land sign_now under volume).
- **c5 MIST minimal-impact, observed** — parking-lot tap, "barely a scratch"
  quoted, no airbags/tow (rep asked the mist guard), symptoms resolving, no
  treatment. Trace: damages thin (+ liability adequate-to-thin) → R4/R5 →
  volume base → MIST overlay (observed minimal-impact trigger,
  mist_handling develop) → develop either way; mist_flag true; value low;
  confidence high (capture ratio well above the bar). Observed trigger must
  act — no abstention.
- **c6 government defendant + unknown liability/damages (R8 refer path)** —
  son calling for his 74-year-old father: City of Hayward Public Works truck
  (quoted), nobody knows the mechanism (father amnesic, no witnesses, no
  report yet), refused transport, MRI pending Friday. Scores against its own
  sidecar config (`c6-config.md`, government-entity work ACCEPTED): under
  the Meridian template the model reads case_type_fit=fatal (declined type)
  and R1 refers before R8 is reached — verified on the first live run — so
  the canary would silently stop guarding the R8 branch. Trace: G2 fires
  (government_entity_window) capping out develop; base R3 develop → R8 with
  TWO unknown load-bearing reads and zero cited adverse evidence →
  refer_out + attorney_review_required (unobserved must never produce a
  decline); value indeterminate; 5/7 dims → confidence medium.
- **c7 question-capture boundary** — a decent call where the rep asks
  ~40-50% of the applicable checklist (exact date, witnesses, Prop-213
  status, retained-elsewhere; never priors/citation/UM/gap/mist-guard;
  rideshare N/A). Trace: all load-bearing reads adequate-or-better → R6
  sign_now; value standard; capture ratio ≥ 4/9 = 44% → NO stepdown →
  confidence high. Guards the 40% boundary + hysteresis: a schema or
  extraction regression that re-penalizes N/A or wobbles the ratio below
  the bar flips this canary first.

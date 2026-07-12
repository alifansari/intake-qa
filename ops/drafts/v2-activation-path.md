# Engine v2 — the activation path (DRAFT, staged — nothing here activates anything)

> **Sub-objective 4.3.** The gated, dated decision sequence from now to a possible v2
> freeze-lift. This is **week-2+ ammunition**: it turns "should we ever ship the triage
> engine?" from an argument into a measurement you run in the background of the beta.
> **The freeze STAYS. v2 does NOT enter production on any timeline in this document.**
> Every step below is offline or dark; the first firm-visible v2 output is on the far side
> of four named gates, three of which require a human signature (PI-attorney, Yang, Ali).
>
> Author: research/product session, 2026-07-12. Supersedes nothing; it *sequences* the
> pieces already built on `feature/scoring-v2` and `beta/s8-v2-offline` and the
> recommendation in `engine-v2-ACTIVATION-DECISION.md`.

---

## 0. The one-paragraph version

v2 is built, unit-proven (68 tests), QC'd, and pushed on `feature/scoring-v2`; the
offline tooling to validate it against v1 on real calls is built on `beta/s8-v2-offline`
(`compare-batch.mjs`, `run-phase1.mjs`, `web-adapter.mjs`). What does **not** exist is
*evidence that v2 is right on real beta calls*, an *attorney-labeled corpus* to measure it
against, and a *Spanish parity audit*. The path is: (A) merge both branches **inactive**
so the package stops drifting from main and the dark adapter's flag defaults off; (B) run
v2 **dark** on real beta calls to accumulate a v1-vs-v2 **delta log**; (C) let **Yang read
the delta log** at ~30 calls to confirm the disagreements are the safe kind and to
authorize the expensive step; (D) build the **phase-2 dual-labeled attorney corpus** and
the **Spanish four-fifths tripwire**; (E) run the **§VII activation checklist** (attorney +
Yang); (F) only then does Ali write a deliberate freeze-lift decision. Miss any gate and
v2 stays dark forever — which is a fine outcome, because the dark corpus it produces is
itself the moat (the outcome-labeled dataset no competitor can buy).

---

## 1. Non-goals (the walls this path does not cross)

- **No firm ever sees v2 output** until Gate C is passed. Dark = internal storage only, no
  UI, no digest line, no readout, no export.
- **No v1 change.** `scoring/` and `lib/score-call.js` are read/imported, never written —
  the beta product keeps running v1 byte-for-byte through the entire sequence.
- **No `ScoredCall` edit.** v2's output contract is structurally incompatible with the
  `ScoredCall` surface (see §3); it is carried by a *sibling record*, never by widening the
  frozen schema (CLAUDE.md hard rule).
- **No marketing claim.** No public surface says the engine "decides / approves / declines,"
  and no accuracy/QWK number ships without the phase-2 evidence behind it (§IV/§V).
- **No Spanish scoring in production** until the four-fifths tripwire exists *and passes*
  (Gate B.5). Until then Spanish calls route to human review with an honest label.

---

## 2. State of the world (what is already built — do not rebuild)

| Asset | Where | Status |
|---|---|---|
| v2 triage package (LLM extracts + code decides; gates, decision table, confidence/abstention) | `feature/scoring-v2` `scoring-v2/` | Pushed. 68 tests, adversarial QC closed 2026-07-11. |
| Activation-gate spec (5 gates) | `scoring-v2/README.md` "Activation gate" + `engine-v2-objective-spec.md` §5 | Written. |
| §VII activation paperwork (decisions template + attorney checklist §B + Yang checklist §C) | `beta/s8-v2-offline` `ops/drafts/engine-v2-activation-checklist.md` | Written. |
| Offline delta-log sweeper (v1-vs-v2 over a folder → `output/v1-v2-delta-log.jsonl`) | `beta/s8-v2-offline` `scoring-v2/compare-batch.mjs` | Built, idempotent, reuses v1 scores from disk. |
| Phase-1 runner (golds + canaries) | `beta/s8-v2-offline` `scoring-v2/run-phase1.mjs` | Built; phase-1 RUN 2026-07-11. |
| Dark sibling-record adapter (pure fn, zero web imports, forbidden-key guard) | `beta/s8-v2-offline` `scoring-v2/lib/web-adapter.mjs` | Built (`ADAPTER_VERSION 0.1.0`), unit-only, **not wired**. |
| Merge-inactive + shadow recommendation | `engine-v2-ACTIVATION-DECISION.md` | Staged for Ali. |
| Conveyor Increment 0 outcome schema (the flywheel the dark records attach to) | `feature/increment-0-flywheel` | Staged for Ali/merge. |
| Beta validation experiment (the 4 empirical tests) | `ops/drafts/beta-validation-experiment.md` | Staged. |

**The honest gap:** everything proven so far is *internal-consistency* proof (tests, golds,
canaries, one fixture side-by-side). Zero real-beta-call evidence, zero attorney-labeled
ground truth, zero Spanish parity data. The whole path below is the machine that closes
that gap **without** showing a firm anything.

---

## 3. The `ScoredCall`-incompatibility resolution (why activation is a flag flip, not a migration)

v1's product surface is `ScoredCall` — the lenient `.score.json` passthrough: `overall`,
band A–E, coaching, `alerts.lost_signable_case`, `revenue_at_risk`. v2's contract is a
different animal: `{ facts[], dimension_reads[], gates, recommendation, tiers, confidence,
abstained, citations }` — **no overall, no dollars, no coaching, recommendation-not-verdict.**
You cannot pour v2 into `ScoredCall` without either editing the frozen schema (banned) or
lying about what v2 produces.

`web-adapter.mjs` resolves this the only compliant way: it maps a v2 verdict to a **new
sibling record** `engine_v2_recommendation` keyed by `call_id`, exactly as `Outcome`,
`Contact`, `Message`, `ConsentEvent` are siblings — additive, join-by-key, `ScoredCall`
untouched. The record shape has **no dollar field and no computed-date field to fill**
(compliance rails structural, not configurable) and always carries
`requires_attorney_ratification: true`; an abstained verdict maps to
`recommended_disposition: null, route: "attorney_review"` so *withholding survives the
mapping*.

**Consequence for the path:** activation is never a data migration. It is (1) wire the
Repository seam to *persist* the sibling record the adapter already produces, behind (2) a
**default-off flag**, and (3) later a second flag to *surface* it. Steps 1–2 are the "dark"
build (Phase B); step 3 is the freeze-lift (Gate C). Rollback in every direction is a flag
flip — sibling records are additive, so nothing has to be un-migrated.

---

## 4. The dated, gated sequence

Dates assume beta launches **Mon 2026-07-14**. Each phase names its precondition gate;
**a gate not met freezes the sequence at that phase indefinitely** (an acceptable terminal
state — see §9).

```
NOW ────────────────── BETA WK1-2 ────── GATE A ────── WK3-8 ────── GATE B ── GATE C ── (earliest) activation
2026-07-12             07/14–07/27       ~07/28        07/28–09/15  ~09/15    ~09/22     shadow→founder-review only
merge inactive         dark delta log    Yang reads    phase-2      attorney  Ali        NOT firm-visible yet
flag OFF               accrues (~30)     the log       corpus +     + Yang    freeze-
                       Spanish tags      + data basis  ES tripwire  §VII      lift
```

### Phase 0 — Merge inactive (now → 2026-07-14). Precondition: none. Freeze intact.
- **Do:** merge `feature/scoring-v2` and `beta/s8-v2-offline` into `main` **inactive** — the
  package ships to the repo so it stops drifting from a moving main, but nothing imports it
  from `web/` and the adapter's persist-flag defaults off. (Ali's merge call;
  `engine-v2-ACTIVATION-DECISION.md` option 1, the "recommended floor.")
- **Guarantee to prove before merge:** a test asserts no file under `web/` imports
  `scoring-v2/*`, and the dark-persist flag (proposed name `ENGINE_V2_SHADOW=off`) is read
  in exactly one place. If that test can't be made green, do **not** merge — stay on branch.
- **Compliance:** internal/backend only; no §VII gate (nothing firm-facing changes). The
  freeze is untouched: the *product pipeline still calls v1*.
- **Output:** package on main, drift stopped, activation still impossible by construction.

### Phase A — Dark delta log accrues (2026-07-14 → ~2026-07-27, beta weeks 1–2).
- **Precondition (HARD, Yang, before the first real call is scored by v2):** confirm the
  beta data-use basis covers *internal derived analysis*. Running an extra Claude call on a
  transcript a firm consented to record and score, to write an internal-only record it never
  sees, must be inside the NDA/BAA's product-improvement / internal-analysis clause. If the
  clause is silent, v2 runs on **de-identified** transcripts only, or not at all, until the
  clause is fixed. **This is the gate people forget.** (Rules 1.6/5.3; §VI.)
- **Do:** as real beta transcripts land, run `compare-batch.mjs` offline over the accumulated
  folder (idempotent; reuses the v1 `.score.json` already on disk, scores v2 live at
  ~$0.10–0.40/call cached). Rows append to `output/v1-v2-delta-log.jsonl`. Simultaneously,
  **language-tag every call** (AssemblyAI language param — B-018) so the delta log carries a
  `call_language` field from row one; this is the raw material for the Spanish tripwire and
  for beta-validation Test 4.
- **Optional (Ali's call):** flip `ENGINE_V2_SHADOW=on` to *also* persist the sibling record
  via the adapter in the live pipeline (true shadow mode). Not required for the delta log —
  the offline sweep produces the same evidence without touching the request path. Recommend
  **offline-only** through Gate A; turn on live shadow only after Yang's read, when the
  sibling record starts feeding Increment 0's flywheel.
- **Target volume:** ~30 real beta calls with both engines' outputs. At N=5 firms this is
  roughly beta week 2. **N=30 is directional, not powered** — it is enough to *characterize
  the disagreement*, not to certify accuracy. Say so in every artifact.
- **Output:** `output/v1-v2-delta-log.jsonl` (~30 rows) + per-language capture counts.

### GATE A — Yang reads the delta log (~2026-07-28). Signature required.
- **Why a human, why Yang:** the delta log is the first place v2's *recommendations on real
  claimants' calls* exist. The disagreements are the signal — the questions are (1) are they
  the **safe kind** (v2's catastrophe gates catching Prop-213/MIST/underwater files that v1's
  conversion lens scored "signable," i.e. v2 protecting the firm from over-conversion) rather
  than the **dangerous kind** (v2 pushing `decline`/`refer` on files a firm would rightly
  sign — a wrongful-decline pattern); (2) does any disagreement reveal a failure mode unsafe
  *even in shadow*; (3) is the confidence wobble (the known medium↔high flip at the
  question-capture threshold, `CALIBRATION-NOTES.md`) swamping the signal.
- **Yang's read is also the authorization to spend:** the phase-2 corpus (Gate B) costs real
  attorney time and money. Do not commission it until the delta log shows v2's disagreements
  are worth adjudicating. If the log shows v2 mostly agreeing with v1 plus catching a handful
  of genuine catastrophe cases → proceed. If it shows a wrongful-decline lean → **stop, fix
  calibration, re-pin canaries, re-run Phase A** before any corpus spend.
- **Deliverable to Yang:** the JSONL + a one-page disagreement taxonomy (counts by
  `deltas.signable_view`, gate-fire rates, abstention rate, per-language split) + the honest
  N=30/not-powered caveat. Staged, never sent to a firm.
- **Exit:** Yang's note (proceed / fix-first / stop) appended to the activation-checklist
  §C.1 record. Proceed → Phase B. Not-proceed → sequence parks (§9).

### Phase B — Build the two things that don't exist yet (2026-07-28 → ~2026-09-15).
Two parallel workstreams, both required for Gate B.

- **B-i. Phase-2 dual-labeled attorney corpus (the real test).** 100–150 transcripts, each
  independently dispositioned by **two** licensed CA PI attorneys. Measure the **human–human
  QWK ceiling FIRST** (if two attorneys only agree at QWK 0.6, demanding v2 hit 0.70 is
  incoherent). Then score v2 held-out and compute: disposition QWK ≥ 0.70, tier QWK ≥ 0.65,
  catastrophic-indicator recall ≥ 0.95, a direction-weighted confusion matrix with
  **wrongful-decline errors weighted 10×**, abstention coverage ≥ 85% with abstained calls
  routed to review. (Targets from `README` activation gate §4 / `objective-spec` §5.)
  - **The real bottleneck, named:** this needs (a) two CA PI attorneys' hours — recruit +
    honorarium (this is where B-005's warm-Yang network and any founding-firm attorney help);
    (b) transcripts they are *allowed to see*. **You cannot hand one beta firm's raw call
    transcripts to an outside attorney-labeler** — that is the firm's confidential
    prospective-client information (Rule 1.6/1.18). The corpus must be **de-identified**
    (PII-scrubbed, firm-unattributable) before it leaves the firm's data boundary, and the
    beta agreement must permit de-identified derived use. Budget 6–8 weeks for
    recruit → label → adjudicate, not 2. This is the schedule-driving item.
  - **Cheaper seed:** the delta log's high-disagreement rows are the *sampling frame* for the
    corpus (label the cases where the engines diverge — highest information per attorney-hour).
    The corpus is not built from scratch; it is the delta log, de-identified and adjudicated.
- **B-ii. Spanish four-fifths tripwire (does not exist in the package — build it).** Per-language
  disposition/abstention distributions and error rates; **alarm + auto-route-to-human when
  the Spanish rate falls below four-fifths (EEOC 80%) of the English rate** on a matched set,
  monitored continuously. The existing `canaries/canary-spanish.txt` is the *unit probe*, NOT
  the audit — the audit needs matched Spanish/English volume the beta may not produce (Test 4:
  if Spanish share < ~15% in this cohort, you *cannot* power the audit and Spanish scoring
  stays parked, which is the correct honest outcome, not a failure). Grounding: Fricker
  testimonial injustice + Evid. Code §351.2 (immigration status never extracted).
- **Also in Phase B (prerequisite to measuring anything):** regenerate the gold set and
  re-pin the canary baseline. The QC fix pass touched the prompt and golds, and the fixture
  showed a confidence flip — calibration state changed, so a clean gold rerun + canary re-pin
  must precede the phase-2 QWK measurement or you're measuring against a moving ruler
  (`README` "Calibration state"; `CALIBRATION-NOTES.md`).
- **Output:** de-identified 100–150-transcript corpus with two attorney labels each + QWK
  report + confusion matrix; a built, tested four-fifths monitor; a regenerated, re-pinned
  calibration baseline.

### GATE B — §VII activation checklist run (~2026-09-15). Two signatures.
Run `engine-v2-activation-checklist.md` §B (PI-attorney) and §C (Yang) in full. The
attorney is checking that every gate/anchor/rule is something a licensed CA PI attorney
would ratify (Prop-213 profiles incl. the §3333.4(c) DUI-restoration withhold, rideshare
coverage periods, G3-never-declines, R8 unobserved-never-declines, refer-out as CRPC 1.5.1
referral not bare decline). Yang is checking the nine structural rails (no terminal
disposition, no dollars, no computed dates, fairness rails, Spanish tripwire built+passing,
privileged analytics stay out, data handling unchanged, drift discipline enforceable with a
**named owner**, no marketing overclaim). **Any flagged anchor = a calibration change = full
revalidation before activation.** Exit: two signed checklists attached at a path.

### GATE C — Ali's deliberate freeze-lift (earliest ~2026-09-22). Ali's signature.
Ali fills the `activation-checklist.md` §A decisions template — **every bracket, no field
deleted; an unfilled bracket means it is not ready to write.** The template forces the scope
choice: *shadow-sibling-only / founder-review surface / firm-visible triage*. **Recommended
first activation scope = founder-review surface, not firm-visible** — v2 recommendations
appear on the founder's Studio review screen as decision *support* Ali ratifies before
anything reaches a firm, for one or two friendly firms, with the rollback flag one flip from
off. Firm-visible triage is a *later* decision with its own evidence bar. This entry is the
freeze-lift the standing STOP requires; it names the hypothesis, expected metric effect,
rollback flag, drift discipline, and a ≤30-day review date.

### Phase C — Activation (only if Gate C is written).
Flip the surface flag for the named scope. v1 keeps running as the fallback. Drift
discipline goes live: pinned model; full gold + canary rerun on ANY calibration change
(block on QWK regression > 0.05); 5–10 canaries weekly even with no change; every production
failure becomes a regression gold; the named owner runs it. First review ≤30 days.

---

## 5. The four workstreams, mapped to owners and to what's already built

| Workstream (from the brief) | Built? | Remaining work | Gate it clears |
|---|---|---|---|
| Offline compare-v1-v2 delta log (~30 real calls + Yang read) | Tool built (`compare-batch.mjs`) | Run on real beta calls; Yang read; disagreement taxonomy | Gate A |
| Dark sibling-record adapter (default-off, no UI) | Adapter built (`web-adapter.mjs`, unit-only) | Wire Repository-seam persist behind `ENGINE_V2_SHADOW`; no-import test; no surface | Phase 0/A (dark), Gate C (surface) |
| Phase-2 dual-labeled attorney corpus | Not built | Recruit 2 CA PI attorneys; de-identify delta-log frame; label; QWK ceiling + targets | Gate B |
| §VII activation checklist (prompt/gates/decline-refer/Spanish tripwire) | Checklist written (`activation-checklist.md` §B/§C); tripwire NOT built | Build four-fifths monitor; run both checklists; regenerate golds | Gate B |

---

## 6. What could kill the path (and why each dead-end is acceptable)

- **Delta log shows v2 wrongful-decline lean (Gate A fail).** → Fix calibration, re-pin, re-run
  Phase A. If unfixable, v2 stays dark. Acceptable: the beta keeps running v1; nothing lost.
- **Human–human QWK ceiling is low (attorneys disagree with each other).** → The disposition
  task is genuinely subjective; a machine can't beat a ceiling that isn't there. v2 stays
  decision-support-at-most, never firm-visible triage. Acceptable and *informative* — it's a
  finding about the domain, not a failure of v2.
- **v2 misses catastrophic recall < 0.95.** → Hard stop; a triage engine that lets an
  underwater/Prop-213 file through is worse than none. Stays dark.
- **Spanish volume too low to audit (Test 4).** → Spanish scoring parks; English-only framing
  (already true in copy). Not a failure — an honest scope limit.
- **Consent basis doesn't cover derived use (Phase A precondition fail).** → De-identify-first
  or don't run v2 on real calls; fix the beta agreement clause going forward.

In **every** dead-end the terminal state is the same: **the dark delta log + the
de-identified corpus still accrue as the outcome-labeled dataset** — the exact asset that is
the durable moat (independent, labeled, growing with calendar time; the model can wait, the
data cannot). The path is positive-EV even if activation never happens.

---

## 7. Cost & schedule honesty

- **Phase A marginal cost:** ~one cached v2 Claude call per beta call (~$0.10–0.40); the v1
  side is reused from disk. ~30 calls ≈ a few dollars. Trivial.
- **Phase B is the expensive, slow one:** two CA PI attorneys × 100–150 transcripts of
  labeling + adjudication, plus de-identification labor. Weeks, not days; dollars for
  honoraria. This is the real gate on the *calendar* — everything before it is cheap and
  fast, everything after it waits on it.
- **The 12-firm / 12-month north-star framing is unaffected:** activation is a moat/retention
  play, not a first-revenue lever. v1 sells the beta; v2 (if ever activated) is what makes
  year-2 churn hard because the recommendations are backed by *your firm's own* outcome data.

---

## 8. Proposed `ops/decisions.md` entry (NOT appended live — stage for Ali)

```markdown
## 2026-07-12 — Engine v2 activation PATH sequenced (freeze stays)  ·  agent: research/product session · lane: product/strategy
- **Change:** Staged `ops/drafts/v2-activation-path.md` — the dated, gated sequence from the
  current frozen state to a possible v2 freeze-lift. Weaves the already-built pieces
  (`feature/scoring-v2` package; `beta/s8-v2-offline` delta-log sweeper, dark sibling adapter,
  phase-1 runner, §VII checklist) into: Phase 0 merge-inactive → Phase A dark delta log on
  ~30 real beta calls (+ per-language tags) → GATE A Yang reads the log → Phase B phase-2
  dual-labeled attorney corpus + Spanish four-fifths tripwire + gold regeneration → GATE B
  attorney + Yang §VII checklists → GATE C Ali freeze-lift (recommended first scope:
  founder-review, not firm-visible) → Phase C activation w/ drift discipline. Resolves the
  ScoredCall incompatibility via the sibling-record adapter (activation = flag flip, not
  migration). Names the two forgotten gates: the beta data-use basis for dark scoring
  (Phase A precondition, Yang) and the confidentiality wall on handing transcripts to outside
  attorney-labelers (de-identify-first, Phase B).
- **Hypothesis:** running v2 dark turns the freeze-lift question from an opinion into a
  measurement, at ~$0 cost, while the accruing labeled corpus is itself the moat — so the
  path is positive-EV even if activation never happens.
- **Expected effect:** no near-term metric (dark). Long-run: year-2 retention/defensibility.
- **Status:** staged-for-approval. Freeze STAYS; v2 not in production. Gates unchanged from
  README §5. Ali decides Phase 0 merge; Yang gates A and B.5; attorney + Yang gate B; Ali
  gates C.
- **Review date:** 2026-07-28 (Gate A target — first ~30-call delta-log read).
- **Result:** —
```

---


## 9. If the sequence parks

A parked sequence is a *feature*, not a failure. If Gate A or B is not met, v2 stays on the
branch (or dark on main), the beta runs v1, and the delta log + de-identified corpus keep
growing untouched. Re-attempt when either (a) calibration is fixed, (b) attorney-labeling
capacity appears, or (c) Spanish volume becomes auditable. Nothing about parking touches the
product, the freeze, or a firm. The only wrong move is silent activation — which the
architecture (no `web/` import, default-off flag, sibling-record adapter, four signed gates)
makes structurally impossible.
```
```

# O4 — Product-Depth / Moat roadmap (CONSOLIDATED, staged)

> **Objective 4 lead consolidation.** Author: product-depth/moat objective session, 2026-07-12.
> Merges four sub-agent assessments — conversion machinery, the data-spine moat, the engine-v2
> activation path, integrations — into one ICE-ranked roadmap. Companions (read for detail):
> `product-machinery-status.md`, `data-spine-plan.md`, `v2-activation-path.md`,
> `integrations-moat.md`. Supreme authority: `.claude/skills/compliance-invariants/SKILL.md`.
> Nothing here ships, sends, publishes, or pushes — it stages a plan + a proposed decisions entry.

---

## 0. The top-line (what this roadmap says)

The product has to do **two jobs at once**, and they are structurally different work:

1. **STICK past week 3** — keep the intake coordinator opening the desk (or working the digest)
   every day through the pilot-to-paid decision window. This is the *retention* track. It is
   cheap, PR-ready, pure-function work, and it can land before Monday.
2. **Build the un-copyable asset** — start the **outcome-labeled corpus** (Day-0 cited intake
   facts → the firm's decision → realized net fee) writing its first rows *now*, because it
   accrues only with calendar time and every uninstrumented month is permanently-lost training
   data. This is the *moat* track. It is dark, backend-internal, sibling-only, and ships on merge.

**The finding that reframes everything:** Session 7 fixed the *terminal-card* graveyard, so the
demo and week-1 usage look clean — but the week-3 failure mode **moved up one layer and is now
invisible**. The active queue sorts by *original call date* and has no defer state, so by week 3
the coordinator's top cards are the cases she's *already working*, sorted by the wrong key, while
fresh high-value callers sink. Nothing in current tests or metrics flags it (the unit test asserts
the buggy sort as if it were the guardrail). The retention track's #1 item fixes exactly this.

**The two supreme freezes are respected throughout.** `scoring/` + `system-prompt.md` are never
touched; `ScoredCall` is extended only by *sibling* records. Every moat and every engine-v2 step
below is additive siblings through the Repository seam — activation, if it ever happens, is a flag
flip, never a schema migration.

---

## 1. The two freezes (non-negotiable rails on all of the below)

- **Scoring freeze.** `scoring/system-prompt.md`, `firm-config-template.md`, and the gold examples
  are calibrated and frozen. No item here rewrites, rewords, or "improves" them. The v1 engine path
  runs byte-for-byte through this entire roadmap. Engine-v2 work is offline/dark and never enters the
  v1 request path.
- **`ScoredCall` freeze.** The lenient `.score.json` passthrough is never edited. Every new datum —
  outcomes, dispositions, the `question_checks` answer spine, the engine-v2 recommendation — is a
  **sibling record keyed by `call_id`**, joined at read time, exactly as `Outcome`/`Contact`/
  `Message`/`ConsentEvent` already are. The `flags` row is never mutated either.

If any item below is ever found to require lifting a freeze, it stops and routes to Ali (and Yang
for anything in a regulated area). None of the ranked items require it.

---

## 2. The consolidated ICE-ranked master table

ICE = Impact × Confidence × Ease (1–10 each). Sorted by score. **Gate** column: `ship` = backend/
internal/dark, ships on merge under the operating protocol; `Ali` = crosses a §VII human gate
(merge call, public claim, opens a channel); `Yang` = novel in a regulated area, routes to the named
reviewer first.

| Rank | Item | Track | ICE | Gate | State |
|---|---|---|---|---|---|
| 1 | **D-021** — Next-action sort: order active queue by what's DUE (`last_attempt_at`), not call-age | retention | **576** | ship | PR-ready, pure fn |
| 2 | **Spine row 1** — `question_checks` table + fact-key catalog + typed Zod + `insertQuestionChecks` seam (dark, no writer yet) | moat | **504** | ship | PR-ready |
| 3 | **D-023** — Finish B-012: wins tally + per-row elapsed-time cue in the **digest** | retention | **448** | ship | PR-ready, pure fn |
| 4 | **Spine row 3** — snapshot builder + disposition stamp in the desk chokepoint (freezes decision-time features) | moat | **384** | ship | needs migration |
| 5 | **D-022** — "Not today" defer state (`snoozed_until`, always resurfaces, never terminal) | retention | **378** | ship | needs migration |
| 5 | **Spine row 0** — branch rehab: cherry-pick flywheel onto `beta/integration`, drop rescue-revert, renumber + SQLite twin | moat | **378** | ship | hygiene gate, precedes rows 1–5 |
| 7 | **D-024** — "Worked to zero" progress moment + real empty-state celebration | retention | **336** | ship | PR-ready, pure fn |
| 8 | **Spine row 2** — QA extraction Inngest pass (parallel to v1, never in its path) — the spine's **writer** | moat | **315** | ship | starts the corpus clock |
| 8 | **Spine row 4** — monthly reconciliation route (`normalizeImportedRow` already exists) — the label writer | moat | **315** | ship | dark |
| 10 | **Spine row 5** — retrodiction bulk import at onboarding (day-one backtest) | moat | **270** | Ali (NDA) | NDA-gated |
| — | **clio.mjs refresh-token fix** — kill the static-access-token silent-401 (CallRail-401 class) | integrations | eng | ship | PR-ready, before any firm connects |
| — | **Lead Docket direct** — enable the built, dark-gated import + write-back for beta retention | integrations | **Yang** | built, unmerged, GATED |
| — | **Engine-v2 Phase 0** — merge both v2 branches **inactive** (stop drift, flag default off) | v2 | Ali | staged; freeze intact |
| — | **Engine-v2 Phase A→C** — dark delta log → Yang read → attorney corpus → freeze-lift | v2 | **Yang**/Ali | week-2+ ammunition, gated |
| — | **Clio App Directory** — open the uncertified listing pipeline now (long lead time) | integrations | Ali | business action + public claim |

Reference backlog ICE (unchanged): B-016 overall = 360 (the spine sub-rows show where the ease
lives); the Session-7 items (B-010/011/013 shipped, B-012 half) are done and out of this table
except where D-023 finishes B-012.

---

## 3. Ship-now (PR-ready) vs needs-decision

### 3a. SHIP-NOW — backend/internal/dark, ships on merge, no §VII gate, no Yang

These are the roadmap's engine. All are additive, freeze-safe, and either pure functions or dark
sibling writes. Ordered as they should land:

1. **D-021 (576)** — pure `partitionLeaks` comparator change (`nextDueRank(leak, now)`); folds the
   Gap-3 confidence-tier decision in as a tiebreak; extends the existing `queue-view.test.mjs`. No
   migration — `last_attempt_at` already flows. **Buildable before Monday.**
2. **D-023 (448)** — thread the two already-existing pure fns (`getCallbackWins`, `callUrgency`)
   into `buildMissedDigest`/`renderMissedDigest`; add the missing `getCallbackWins` unit test.
   Closes the loop the digest-first plan-of-record opened. **Buildable before Monday.**
3. **Spine row 0 (378)** — branch rehab (cherry-pick `1274860 285ac09 943ef8b 80bd7ec`, drop the
   rescue-reverting hunks, renumber to `0039`/SQLite `0031`). **Precedes every spine row; do first.**
4. **Spine row 1 (504)** — the `question_checks` container + frozen additive-only fact-key catalog +
   per-key typed Zod with the `superRefine` that makes the citation guard *structural*. Dark, no
   writer yet — the smallest shippable increment of the moat.
5. **Spine row 3 (384)** — snapshot builder + disposition stamp wired into the desk's existing
   `setFlagStatus` terminal chokepoint (one call site, can't be bypassed). Migration window.
6. **D-022 (378)** — `snoozed_until` defer column + filter + one "Not today" button; test pins that
   a snoozed case *always* resurfaces and is never silently aged out. Migration window — rides with
   the spine migrations.
7. **D-024 (336)** — read-only "N of M handled today" + empty-state celebration. Pure/no migration.
8. **Spine rows 2 & 4 (315 each)** — the QA extraction pass (corpus writer, parallel to v1) and the
   monthly reconciliation route. Rows 2 starts the corpus clock; both dark.
9. **clio.mjs refresh-token fix** — replace the static Bearer with encrypted refresh-token storage +
   refresh-on-401 + loud `error_log`. Pure engineering; must precede any firm connecting to Clio.

### 3b. NEEDS-DECISION — crosses a gate; stage and stop

- **Spine row 5 — retrodiction bulk import (Ali/NDA).** The highest-leverage 30 minutes of
  onboarding (12–24 months of closed cases → instant backtest), but gated on an executed NDA per the
  retrodiction playbook. Build behind the gate; enable per firm after NDA.
- **Lead Docket direct enablement (Yang).** The import + write-back is built, dark, disciplined
  (tier-not-dollars, no claimant contact, no send chokepoint) — **but it re-engages the firm's own
  dead leads, the surface decisions.md 2026-07-07 GATED behind retained CA legal-ethics review**
  (AB 931 / §§6151–6152 / SB 37's $5k–$100k private right of action). The `LEAD_DOCKET_LIVE` env
  switch is *not* the gate that matters; Yang clearance is. Two staged Yang questions in
  `integrations-moat.md §6`.
- **Engine-v2 Phase 0 merge-inactive (Ali).** Merge `feature/scoring-v2` + `beta/s8-v2-offline`
  into main **inactive** to stop v2 drifting from a moving main — gated by a test proving no `web/`
  file imports `scoring-v2/*` and the `ENGINE_V2_SHADOW` persist-flag defaults off. Ali's merge call;
  freeze stays intact.
- **Engine-v2 Phase A onward (Yang, then attorney, then Ali).** The dark delta-log → Yang read →
  dual-labeled attorney corpus → four-fifths Spanish tripwire → §VII activation checklists →
  deliberate freeze-lift sequence. This is **week-2+ ammunition, not launch work**; it turns
  "should we ever activate v2?" into a measurement run in the background of the beta. Two forgotten
  gates named: (a) the beta data-use basis must cover internal derived analysis before v2 runs on any
  real call, else de-identified-only; (b) raw beta transcripts cannot go to outside attorney-labelers
  (Rule 1.6/1.18) — the corpus must be de-identified first.
- **Clio App Directory listing (Ali).** Open `api.partnerships@clio.com` + the Securiti questionnaire
  now, because the pipeline is measured in weeks; certification (Silver = 100 active Clio accounts) is
  a 6–12mo install-base-gated goal. Any listing/Certified-badge copy is a new public claim → Ali +
  Yang. Decline Lawmatics (competitor's marketplace, dilutes independence) despite better economics;
  keep Filevine warm as the up-market extension.

---

## 4. The two-track thesis, stated plainly

### Retention (stick past week 3) — the machinery track
Session 7 built the queue hygiene, the 6-touch nudge, and the honest elapsed-time urgency, and they
work and are test-pinned. What it left is the **in-progress pile-up**: no next-action sort (Gap 2),
no defer state (Gap 4), and B-012's recognition line never reached the digest — the surface the
coordinator is explicitly told she can live in. D-021 + D-023 + D-022 + D-024 turn the active list
from "who called longest ago" (which buries fresh callers under half-worked cases by week 3) into a
true **"call these now"** list that reaches zero each day and gives credit on the surface she
actually uses. **Rails held:** one screen / one queue / one tap; credit not surveillance; no computed
deadlines; no quota, no red number, no staff-vs-staff comparison.

### Moat (un-copyable asset) — the data-spine track
The flywheel is half-built: `origin/feature/increment-0-flywheel` already stages the two *outcome*
siblings (`case_disposition` + `case_outcome`) with schema, seam, adapter, pure censoring, RLS, 17
tests — adopt it (after rehab). What's missing is the two things that make it a *moat*: (1) the
**`question_checks` answer spine** — typed `answer_value` + verbatim `answer_citation` + a frozen
additive-only fact-key ontology + `rubric_version` + `language` tag — without which we store *labels
with no features*, which is not a training corpus; and (2) the **entire insert path** — nothing calls
the six staged repo methods, so the tables are inert. The plain moat argument: **Supio ships a
call-scoring agent today and EvenUp is marching into intake — but what neither can retroactively
replicate is a Day-0, cited, typed, language-tagged fact record joined to realized net fee, accruing
from the first beta call forward.** Model weights are copyable; a 24-month outcome-labeled corpus is
not. The corpus *is* time, and time only starts when the spine writes its first row.

### How the two tracks converge
The desk's disposition chokepoint (retention track) is *also* the disposition-stamp writer for the
corpus (moat track) — spine row 3 wires the moat's decision-time snapshot into the same
`setFlagStatus` call site that D-021/D-022 are already editing. The engine-v2 dark records and the
Lead Docket import both attach to this same spine. **One chokepoint, both jobs** — the retention work
and the moat work are not competing for the same code; they meet at the disposition write.

---

## 5. Sequencing — what lands when

- **Before Monday 7/14 (pre-beta, pure/no-migration, highest urgency):** D-021 (the week-3 killer
  fix), D-023 (digest recognition), and the clio.mjs refresh-token fix if Clio is on the near horizon.
  Spine row 0 (branch rehab) should also happen now so the moat isn't blocked and a straight merge
  can't silently revert the rescue conveyor.
- **First migration window (this week):** spine row 1 (`question_checks`), spine row 3 (disposition
  stamp), D-022 (defer state) — batch the twin migrations together.
- **Beta week 1–2 (dark, corpus clock running):** spine row 2 (QA extraction writer — *this is the
  row whose delay is permanently lost*), spine row 4 (reconciliation route), D-024. Engine-v2 Phase 0
  merge-inactive if Ali approves; Phase A dark delta log if the data-use basis clears Yang.
- **Beta week 2+ (gated ammunition):** spine row 5 (retrodiction, per-firm NDA), Lead Docket
  enablement (per Yang), Clio listing pipeline (opened now, resolves over weeks/months), engine-v2
  Gates A→C.

---

## 6. The single highest-ICE product move

**D-021 — Next-action sort (ICE 576).** Order the active desk queue by *what is due* — untouched
callers ranked by call-age as today, touched cases ranked by time-since-`last_attempt_at` against a
gentle cadence — instead of by original call date. It is the highest-ICE item on the board, it is a
**pure-function change** that lands in the already-green test harness with no migration (the
`last_attempt_at` data is already captured and already flows through `listLeakedFlags` — it is simply
unused in the comparator), and it fixes the **exact week-3 failure mode** that is currently invisible
and that the pilot-to-paid decision hinges on. It directly completes B-010's own "one queue, one next
action" thesis, which Session 7 only half-delivered. **Buildable before Monday.**

**The one caveat on "highest-ICE":** D-021 is the highest-ICE *retention* move, but the highest-ICE
move whose delay is **permanently unrecoverable** is **spine row 2 — the QA extraction writer** (the
row that starts the corpus clock). D-021 can be built in week 5 and lose nothing; a beta call scored
in week 1 with no `question_checks` row is a training example gone forever. So: **do D-021 first for
impact-per-hour, but do not let spine rows 0→1→2 slip, because they are the only items on this board
that a calendar can destroy.**

---

## 7. Risks (named, not smoothed)

1. **The week-3 failure is invisible and self-camouflaging.** Session 7 killed the terminal-card
   graveyard, so demos and week-1 usage look great — the desk feels worse *exactly* when the
   pilot-to-paid decision forms, and the unit test asserts the buggy oldest-first sort as if it were
   a guardrail. D-021 + D-022 are the fix and should not wait for a post-mortem after a pilot cools.
2. **Branch hygiene on the flywheel, not the schema.** `origin/feature/increment-0-flywheel` was cut
   from an old base; its diff **deletes the rescue conveyor** (`rescue/*.mjs`, `studio/rescue`,
   `0035_crm_rescue_import.sql`) that shipped *after* the branch. A straight merge silently reverts
   live rescue work. Cherry-pick + renumber (0039/0040 Postgres, 0031/0032 SQLite twins), verify
   against hosted before applying. This is spine row 0 and it gates everything downstream.
3. **Two silent-corruption hazards before any outcome row accrues.** (a) per-matter vs per-call fee
   double-count — anchor outcomes on the Day-0 call and dedup `net_fee_to_firm` by `external_case_ref`;
   (b) snapshot look-ahead leakage — stamp `rubric_version` + `snapshot_built_at` *inside* the
   immutable `intake_feature_snapshot` so a later re-score never retroactively changes what the firm
   "knew" at decision time. Both cheap now, expensive later.
4. **Two compliance gates that silently taint the whole v2 evidence base if skipped** (routes to
   Yang): the beta data-use basis must cover internal derived analysis before v2 runs dark on any
   real call; and raw beta transcripts cannot be handed to outside attorney-labelers — de-identify
   first. Miss either and the delta log / corpus become legally unusable.
5. **The Lead Docket retention winner is legally the more sensitive integration.** It re-engages a
   firm's own dead leads — the softest surface against AB 931 / §§6151–6152 / SB 37 — and that surface
   was explicitly gated behind retained-counsel clearance on 2026-07-07. Enabling it on the env switch
   alone, without Yang, steps over a line the business drew for itself.
6. **The Clio distribution loop is chicken-and-egg.** Silver certification needs 100 active Clio
   accounts we don't have pre-revenue. Mitigation: open the *uncertified* listing + the weeks-long
   Securiti/demo pipeline now so the channel is live when the cohort exists.
7. **clio.mjs static-token silent-401.** The same CallRail-401 silent-failure class — a nightly push
   reads "connected" then goes dark on token expiry. Fix refresh-token flow before any firm connects.

---

## 8. Proposed `ops/decisions.md` entry (stage — do NOT append live)

```
## 2026-07-12 — O4 product-depth/moat roadmap: retention + corpus-spine, two freezes intact  ·  agent: product-depth objective session · lane: product/strategy
- **Change (STAGED consolidation):** Merged four sub-assessments (conversion machinery, data-spine
  moat, engine-v2 activation path, integrations) into ops/drafts/O4-product-plan.md — one ICE-ranked
  roadmap on two tracks. RETENTION (stick past week 3): D-021 next-action sort (576, pure fn,
  pre-Monday) fixes the now-invisible week-3 queue inversion Session 7 left one layer up; D-023
  finish B-012 in the digest (448); D-022 "not today" defer (378); D-024 worked-to-zero (336). MOAT
  (un-copyable corpus): adopt the staged outcome siblings after branch rehab (row 0, 378), build the
  missing question_checks answer_value spine (row 1, 504) + insert path (rows 2–5) — dark,
  sibling-only, no freeze lift. Integrations: Lead Docket = retention, Clio = distribution, two
  clocks; fix clio.mjs static-token 401 before any firm connects; decline Lawmatics. Engine-v2:
  merge inactive (Phase 0) then a gated dark delta-log→attorney-corpus→freeze-lift sequence as
  week-2+ ammunition; activation is a flag flip via a sibling record, never a ScoredCall migration.
- **Hypothesis:** firms churn at week 3 when the queue inverts to bury fresh callers, and the durable
  moat is the outcome-labeled corpus that accrues only with calendar time — so the retention fixes
  win the pilot-to-paid decision and the spine (instrumented before Monday) wins year-2 defensibility.
- **Expected effect:** desk daily-active retention through week 3; first question_checks + disposition
  rows on beta week-1 calls; a live Clio inbound channel standing by for the next cohort. No
  user-facing metric from the moat until ≥1 outcome cycle + a language/proxy fairness audit.
- **Freezes respected:** scoring/ + system-prompt.md untouched; ScoredCall extended only by sibling
  records keyed by call_id; v1 engine path runs byte-for-byte throughout.
- **Gates (§VII):** SHIP-ON-MERGE (backend/internal/dark) — D-021/D-022/D-023/D-024, spine rows 0–4,
  clio refresh-token fix. NEEDS-DECISION — retrodiction (Ali/NDA), Lead Docket enablement + engine-v2
  Phase A onward + any surfacing of the corpus (Yang), engine-v2 Phase 0 merge + Clio listing (Ali).
- **Single highest-ICE move:** D-021 (576). Caveat: spine rows 0→1→2 are the only items a calendar
  can destroy (each uninstrumented beta call is a lost training example) — do D-021 first for
  impact-per-hour, but do not let the spine slip.
- **Risk:** the week-3 failure is invisible (tests assert the bug); the flywheel branch reverts rescue
  if merged straight; per-matter fee double-count + snapshot look-ahead corrupt the corpus if
  unaddressed; two v2 compliance gates (data-use basis, de-identify-before-labeling) taint the
  evidence base if skipped; Lead Docket re-engagement is the SB 37 soft surface (Yang, not env).
- **Status:** staged-for-approval. Ship-now items buildable under the operating protocol; gated items
  stop at Ali/Yang.
- **Review date:** 2026-08-01 (with the Session-7 items' own review).
- **Result:** —
```

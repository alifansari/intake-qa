# The Outcome-Flywheel Data Spine — build plan (DRAFT, staged)

> **STATUS: DESIGN + PROPOSED DIFF OUTLINE. No code committed here.** Sub-objective 4.2.
> Companion to `engine-v2-conveyor-MVP.md` §6 (+ AMENDMENT) and `intake-fact-sheet-spec.md`.
> Backlog: B-016 (Increment 0), B-017, B-018. Grounds the moat thesis: the un-copyable
> asset is the **outcome-labeled corpus** (intake facts → the firm's decision → realized
> net fee), which accrues ONLY with calendar time (cases resolve in 12–36 months). Every
> uninstrumented month is permanently-lost training data. This ships **dark, internal-only,
> 100%-scored, no scoring-freeze lift** — sibling records through the Repository seam,
> never an edit to `ScoredCall` or the frozen `flags` row.

---

## 0. TL;DR for Ali

The flywheel is **half-built and the built half is the easy half.** Branch
`origin/feature/increment-0-flywheel` already stages the two *outcome* siblings
(`case_disposition`, `case_outcome`) with schema, Repository seam, JSON adapter, pure
censoring logic, RLS, and 17 tests — genuinely good work, adopt it. But it is missing the
two things that actually make it a *moat*:

1. **The `answer_value` spine itself** — the `question_checks` sibling (typed answer +
   verbatim citation + canonical fact key per question). B-016 names this explicitly; it
   is not in the branch. Without it we store **labels with no features**: outcomes and
   dispositions, but not *what the intake call actually captured*. A training corpus with
   labels and no features is not a training corpus.
2. **The insert path.** Nothing calls any of the six staged Repository methods. The tables
   are inert plumbing. No QA pass writes the spine, nothing stamps the immutable
   decision-time snapshot, no reconciliation form or retrodiction import writes outcomes.

Plus one operational hazard: the branch was cut from an **old base** and its diff *reverts
the rescue conveyor*. It must be cherry-picked/rebased onto `beta/integration`, not merged.

Biggest single decision for you: **do we accept a ~3–4 day dark build now** to start the
clock on the corpus before Monday's beta, given that the alternative is that the first
cohort's intake calls are scored but never instrumented — permanently. My recommendation:
yes, and ship it in the increment order in §5.

---

## 1. Verification — what is staged vs. what is needed

| Piece | State | Evidence |
|---|---|---|
| `case_disposition` table (+ immutable snapshot, `external_case_ref`, RLS) | **DONE** | `0035_outcome_flywheel.sql` on branch |
| `case_outcome` table (censored-never-zero money, demand milestones, audit `edits[]`, RLS) | **DONE** | same migration |
| Zod: `CaseDisposition`, `CaseOutcome`, `ValueBand`, `CensoredNumber`, `CaseOutcomeEdit` | **DONE** | `schema.ts` diff |
| Repository seam: 6 methods + 2 patch interfaces | **DONE** | `repository.ts` diff |
| `JsonFileRepository` impl (lenient read, best-effort write) | **DONE** | `json-repository.ts` diff |
| Pure censoring/audit (`normalizeMoney`, `normalizeImportedRow`, `applyCaseOutcomePatch`, `applyCaseDisposition`) | **DONE** | `flywheel/censoring.mjs` |
| Censoring unit tests (17) | **DONE** | `flywheel-censoring.test.mjs` |
| **`question_checks` sibling — the typed `answer_value` + `answer_citation` spine** | **MISSING** | grep: only appears in a migration *comment* + fact-sheet spec; no table, no Zod, no repo method |
| **Canonical fact-key ontology (`coverage.um_uim`, `incident.date`, …)** | **MISSING** | referenced by fact-sheet spec §1.1/§6; not defined anywhere in code |
| **QA extraction pass (writer for the spine)** | **MISSING** | no Inngest step, no `question_catalog` constant on integration |
| **Snapshot *builder* (assembles `intake_feature_snapshot` from `question_checks`)** | **MISSING** | migration stores the container; nothing fills it |
| **Disposition stamp caller (writes `case_disposition` at decision time)** | **MISSING** | grep: no caller of `upsertCaseDisposition` outside the impl |
| **Reconciliation ingestion (monthly form/CSV → `upsertCaseOutcome`)** | **MISSING** | `normalizeImportedRow` exists but no route/form calls it |
| **Retrodiction bulk import (onboarding backtest)** | **MISSING** | — |
| **SQLite twin migration** (`web/db/migrations/`) | **MISSING** | branch only touched `web/supabase/` |
| **Branch is rebased/clean** (does not revert rescue) | **HAZARD** | branch diff deletes `rescue/*`, `studio/rescue`, `0035_crm_rescue_import.sql` |

**Verdict:** the *storage* for outcomes is done; the *spine* (features) and the *entire
insert path* are not. B-016's third clause ("question_checks answer_value/citation") is the
missing heart. This plan designs it.

---

## 2. The schema — the missing spine + two refinements to the done siblings

### 2.1 `question_checks` — the per-call, per-question typed-answer sibling (NEW, the spine)

This is where the moat's *features* live. One row per (call, canonical question). Keyed to
the frozen `flags`/`calls` rows — never edits them. Written by the QA pass (§3.1), read by
the fact-sheet compose (`intake-fact-sheet-spec.md` §3) and by the snapshot builder (§3.2).

```
create table if not exists question_checks (
  id               uuid primary key default gen_random_uuid(),
  call_id          uuid not null references calls(id) on delete cascade,
  flag_id          uuid references flags(id) on delete set null,
  firm_id          uuid not null references firms(id) on delete cascade,
  rubric_version   text not null,                 -- e.g. 'qa-v1'; frozen per run
  question_key     text not null,                 -- CANONICAL ontology key (frozen, additive-only)
  kind             text not null check (kind in ('value_determining','disqualifying')),
  asked_state      text not null
      check (asked_state in ('asked_answered','asked_unclear','not_asked')),
  value_type       text check (value_type in ('date','text','enum','json')),
  answer_value     jsonb,                          -- TYPED per key; null unless asked_answered
  answer_citation  jsonb,                          -- {citation_id, span, audio_ms, speaker,
                                                   --  verbatim, language, english_gloss} | null
  confidence       text check (confidence in ('high','medium','low')),
  language         text check (language in ('en','es')),   -- B-018 fairness tripwire
  created_at       timestamptz not null default now(),
  constraint question_checks_unique unique (call_id, question_key, rubric_version)
);
create index if not exists question_checks_call_idx on question_checks(call_id);
create index if not exists question_checks_firm_key_idx on question_checks(firm_id, question_key);
```

**Invariants (schema CHECK + Zod `superRefine`, mirroring fact-sheet-spec §1.1 — the
state table is the citation guard in table form):**

- `asked_answered` ⇒ `answer_value` **and** `answer_citation` both present. **No citation,
  no stored answer** (§IV made structural: a fact with no transcript span cannot exist).
- `asked_unclear` ⇒ `answer_value` null, `answer_citation` present (we ship *what was
  said*, never our guess).
- `not_asked` ⇒ both null. Absence is neutral — **never** an inferred negative ("didn't
  ask about UM" = *unknown, go develop it*, never *no coverage*).
- `answer_value` is **typed per `question_key`**, not an open channel. A `ValueForKey`
  catalog maps each key to its shape (`incident.date`→DateStr; `coverage.um_uim`→
  `{limits_text, carrier}`; `treatment.payment_source`→enum). **`z.record(z.unknown())` is
  forbidden** — an open JSON channel would let banned content (tiers, dollar opinions,
  computed deadlines) ride through as a "fact" (fact-sheet-spec §2 QC finding).
- `question_key` is a **frozen, additive-only ontology.** Keys are never renamed or
  re-typed; a semantic change = a new key, old one goes quiet. Historical rows never
  migrate. Versioned by `rubric_version`.
- `language` tagged on every row (B-018): per-language capture rate is the fairness
  tripwire and the first real datum on Spanish-first intake share (beta test #4).

### 2.2 Canonical fact-key ontology — `web/src/lib/flywheel/question-catalog.mjs` (NEW)

A versioned JS constant (frozen, additive-only), the single source of truth shared by the
QA pass, the schema's per-key typing, the snapshot builder, and the fact sheet. Seed from
`engine-v2-conveyor-MVP.md` §1 + `intake-fact-sheet-spec.md` §1.2:

```
qa-v1 keys (each: key, kind, value_type, applies_to[case_types], value_shape):
  all:        incident.date(disq,date)  injury.onset_timing(val,text)
              injury.initial_symptom_narrative(val,text)  priors.prior_injuries(disq,text)
              priors.prior_claims(disq,text)  parties.witnesses(val,json)
              parties.spoke_to_another_firm(val,enum)
  auto/rideshare/trucking: incident.police_report(val,text)
              coverage.commercial_defendant(val,json)
  auto/rideshare: coverage.prop213_status(disq,enum)  coverage.um_uim(val,json)
  rideshare:  coverage.rideshare_app_status(val,enum)
  premises:   coverage.premises_owner_notice(val,text)  evidence.incident_report(val,text)
  dogbite:    coverage.homeowner_renter(val,json)  priors.prior_bite_history(val,text)
```

The catalog also declares **applicability** per case type, so a key's *absence* on a case
is never ambiguous (inapplicable vs. not-yet-answered — fact-sheet-spec §1.1 `Facts()`).

### 2.3 Two refinements to the already-staged siblings (adopt into 0035 before merge)

1. **`intake_feature_snapshot` must carry its provenance, not just facts.** Add
   `rubric_version` and `snapshot_built_at` *inside* the snapshot JSON, stamped by the
   builder (§3.2). Reason: the snapshot is the anti-look-ahead guarantee — you validate a
   decision against **what was known at decision time**. If a later `qa-v2` rubric re-scores
   the transcript, the snapshot must NOT change (the staged `applyCaseDisposition`
   already enforces write-once immutability — good — but it must also record *which*
   rubric produced the frozen values, or a corpus analyst can't tell what the firm actually
   saw). This is a builder change, not a table change.

2. **Document the per-matter vs. per-call money hazard.** Both outcome tables are
   `unique(call_id)` — one row per call. But a *matter* spans the Day-0 call + follow-ups
   (`intake-fact-sheet-spec.md` groups multiple `call_id`s under one `external_case_ref`).
   `net_fee_to_firm` is a **matter-level** number; if two sibling calls both carry it, the
   corpus **double-counts fees**. Fix is cheap and additive: treat the Day-0 primary call
   as the outcome anchor, and **dedup by `external_case_ref` at analysis time** (documented
   rule + a `is_primary_call` boolean defaulting true). Flag now; it silently corrupts the
   target metric later if unaddressed.

---

## 3. The insert path — four writers, all through the Repository seam

Nothing writes today. Four writers close the loop. Each is **additive, dark, and reuses an
existing pattern**; none touches the frozen v1 scoring engine.

### 3.1 WRITER — the QA extraction pass (writes `question_checks`) — the spine's source

A **new Inngest step, parallel to the frozen v1 engine, never in its path** (same shape as
the existing `scorePipeline`/`call.received` fan-out). After transcription:

- Input: transcript + the case-type's question list from the catalog (§2.2).
- One Claude pass (Sonnet 4.6, temp 0, caching ON) → per question: `asked_state` + typed
  `answer_value` + the **verbatim span**, which is written through the **existing
  `transcript_citations` citation guard** so every "asked/answered here" is cited
  (`answer_citation.citation_id` references that frozen sibling row).
- Stamps its own `rubric_version = 'qa-v1'` into `analysis_versions`; confidence via the
  existing `flag_confidence` tiering; `language` from AssemblyAI language detection (B-018).
- **New Repository method: `insertQuestionChecks(callId, firmId, checks[])`** (batch upsert
  keyed by the `(call_id, question_key, rubric_version)` unique). Frozen engine still owns
  `flag`/`score`/`is_leaked_signable` — untouched.

*Proposed files:* `web/src/lib/flywheel/qa-pass.mjs` (pure prompt-assembly + parse; no I/O,
testable), a new Inngest function registered in `web/src/app/api/inngest/route.ts`, and the
seam method in `repository.ts` + `json-repository.ts`.

### 3.2 WRITER — the disposition stamp (writes `case_disposition` + freezes the snapshot)

At the moment the firm records what it did with a case (disposition captured near intake —
in the beta this rides the desk's existing terminal statuses: signed / passed → mapped to
`signed` / `declined`, etc.):

- **New pure builder: `buildIntakeSnapshot(questionChecks[], backboneFacts) →
  {rubric_version, snapshot_built_at, facts{key→{asked_state, value}}}`** in
  `flywheel/censoring.mjs` (or a sibling `snapshot.mjs`). It assembles the immutable blob
  from the current `question_checks` rows — typed, not hand-authored, so §2.1's typing
  invariants hold and the open-JSON channel stays closed.
- Caller invokes `upsertCaseDisposition(callId, firmId, {disposition, decided_by:<role>,
  intake_feature_snapshot: buildIntakeSnapshot(...)})`. The staged impl already enforces
  **write-once immutability** of the snapshot (first real write wins) — verified by test
  "the intake_feature_snapshot is written once and never overwritten."
- **`decided_by` is a ROLE** ('attorney'/'intake_manager'), never a scored staffer (§ no
  per-staffer scoring; anti-surveillance rail from conveyor-MVP §1).

*Proposed wiring:* map the desk's existing `setFlagStatus` terminal transitions to a
disposition write in the **same chokepoint** (one call site, so it can't be bypassed), plus
`external_case_ref` capture when the firm supplies its CMS matter id.

### 3.3 WRITER — monthly reconciliation ingestion (writes `case_outcome`)

The 15-min monthly reconciliation the conveyor already asks for. The pure normalizer
**already exists** (`normalizeImportedRow` → censoring-correct patch). Missing = the caller:

- A founder/firm-gated route `POST /api/studio/reconcile` (or a guided form) that accepts a
  CSV/CMS export or typed rows → `normalizeImportedRow(row)` → `upsertCaseOutcome(callId,
  firmId, patch)`. The staged impl bumps `outcome_version` and appends the prior snapshot to
  `edits[]` (audit discipline verified by test). Open cases stay right-censored.
- Match rows to calls by `external_case_ref` (preferred) or a guided call picker.

### 3.4 WRITER — retrodiction bulk import at onboarding (writes `case_outcome` in bulk)

The single highest-leverage 30 minutes: the firm exports its **last 12–24 months of already
-closed cases** → an instant backtest + the firm's first band→outcome map on day one. Same
normalizer, batch mode, censored. Per-CMS export paths already spec'd in
`retrodiction-onboarding-playbook.md`. Gated on an executed NDA (that playbook's posture).
Declines in the historical set are **censored, never $0** (circular — you'd train the scorer
on its own rejections; enforced by the censoring module).

---

## 4. Compliance mapping (pre-ship checklist, `compliance-invariants`)

- **§I flat-fee:** the spine stores `net_fee_to_firm` etc. **internally only.** It never
  surfaces a dollar at intake and **is never an input to OUR pricing** — our fee stays flat
  monthly, outcome-agnostic. State this in the migration header. The corpus measures the
  *firm's* economics to calibrate *triage*, not to price us.
- **§II consent:** `question_checks` runs on the **already-recorded, already-consented**
  calls the scorer already processes. No new recording, no new consent surface.
- **§IV citation guard:** made **structural** — `asked_answered` cannot exist without an
  `answer_citation` span (schema `superRefine`). No citation, no stored answer.
- **§VI privacy:** `question_checks` + snapshots hold claimant facts → confidential,
  **RLS firm-scoped read, writes server-only**, deletion cascade from `firms`/`calls`
  (both new tables `on delete cascade`). **PII minimization** inherited from fact-sheet-spec
  §2.5: extractor strips SSN/DOB/immigration status on extraction. No `external_case_ref` or
  claimant value in URLs/logs. Spanish rows get the identical bar.
- **§VII gates:** the **dark spine is backend/internal → ships on merge** per the operating
  protocol. BUT three separate things are gated and are NOT in this increment: (a) any
  **surfacing** (the fact-sheet export, a call-quality panel) is a product-claim change →
  stage, route to Ali/Yang; (b) the north-star reframe copy (conveyor-MVP §4) → stage;
  (c) **any scoring USE of the corpus** — no score shown, no staff metric, until ≥1 real
  outcome cycle closes AND the feedback loop is **fairness-audited for language/proxy
  disparity** before it ever recalibrates (§4sexies — don't launder historical
  under-service; B-018's per-language capture rate is that audit's instrument).
- **§V superlative:** nothing here is public; "the only intake QA in Spanish" stays banned
  when this eventually surfaces.

**Net:** the spine + insert path are **backend/internal/dark** and clear to ship
autonomously. The value it unlocks (fact sheet, panels, scores) is separately gated. Keep
that line crisp.

---

## 5. Build sequence + the ICE case

The two outcome siblings are done; the ICE below is for the **remaining** spine + wiring,
sub-sequenced so each row is independently shippable and dark.

| # | Increment (all dark, additive) | I | C | E | ICE | Note |
|---|---|---|---|---|---|---|
| 0 | **Branch rehab**: cherry-pick the flywheel commits onto `beta/integration`, drop the rescue-reverting delta, renumber to a free slot + add SQLite twin | 7 | 9 | 6 | **378** | must precede everything; hygiene gate |
| 1 | `question_checks` table + catalog constant + Zod (typed per key) + `insertQuestionChecks` seam. **Dark, no writer yet** | 9 | 8 | 7 | **504** | smallest shippable; the spine's container |
| 2 | QA extraction Inngest pass (§3.1) — the spine's **writer** | 9 | 7 | 5 | **315** | starts the corpus clock; extraction accuracy is the risk, not architecture |
| 3 | Snapshot builder + disposition stamp in the desk chokepoint (§3.2) | 8 | 8 | 6 | **384** | freezes decision-time features (anti-look-ahead) |
| 4 | Reconciliation route (§3.3) — normalizer exists | 9 | 7 | 5 | **315** | the monthly label writer |
| 5 | Retrodiction bulk import (§3.4) | 9 | 6 | 5 | **270** | day-one backtest; NDA-gated |

Overall this is **B-016 as scoped (ICE 9×8×5 = 360)**; the sub-rows show where the ease
lives. Rows 0–1 are a half-day each; 2–3 are the substance (~2 days); 4–5 reuse the
existing normalizer.

**The moat argument, stated plainly:** Supio Intake ships a call-scoring agent *today* and
EvenUp is marching backward into intake. What they **cannot retroactively replicate** is a
**Day-0, cited, typed, language-tagged fact record joined to realized net fee, accruing from
the first beta call forward.** Model weights are copyable; a 24-month outcome-labeled corpus
is not. The corpus is time, and time only starts when the spine writes its first row. Every
week we delay row 2 is a week of that corpus we never get back.

---

## 6. Risks (named, not smoothed)

1. **BIGGEST — branch hygiene, not the schema.** `origin/feature/increment-0-flywheel` was
   cut from an old base; its diff **deletes the rescue conveyor** (`rescue/*.mjs`,
   `studio/rescue`, `0035_crm_rescue_import.sql`) that shipped to integration *after* the
   branch. **A straight merge silently reverts the rescue layer.** Must cherry-pick the four
   flywheel commits (`1274860`, `285ac09`, `943ef8b`, `80bd7ec`) onto `beta/integration`,
   drop the rescue delta, and renumber the migration. Integration's `web/supabase/` has a
   **hole at 0035** but `0036/0037/0038` are already applied to hosted Supabase — safest is a
   fresh number **above the applied max (0039)** plus the SQLite twin at the next free slot
   (~`0031`). Verify against hosted before applying.
2. **Extraction accuracy on `answer_value`.** Storing a *typed* answer ("UM/UIM =
   $100k/$300k, Farmers") is a harder extraction than an ask-state boolean. Mitigation:
   confidence-tier every value, ship `asked_unclear` liberally (span without value), and
   **never** let a low-confidence value enter `intake_feature_snapshot` as fact. The corpus
   tolerates missing (censored) far better than wrong.
3. **Per-matter vs. per-call fee double-count** (§2.3.2). Silent target-metric corruption if
   `net_fee_to_firm` lands on multiple sibling calls. Fix = anchor on Day-0 call + dedup by
   `external_case_ref`. Cheap now, expensive later.
4. **Snapshot look-ahead leakage.** If a later rubric re-scores and the snapshot isn't
   frozen-with-provenance, the corpus learns from facts the firm never saw at decision time.
   Mitigated by the staged write-once immutability **plus** the §2.3.1 provenance stamp.
5. **The corpus is small for a long time.** Cold-start honesty: no score, no staff metric,
   no band shown until ≥~30 resolved cases per band; Bayesian seeding from published base
   rates with wide intervals until then (`engine-v2-config-and-validation.md`). The risk is
   *premature* use, not slow accrual — the guardrail is "instrument now, infer later."
6. **CMS join key can't be backfilled.** `external_case_ref` must be captured at
   disposition/reconciliation time or the intake↔outcome join is lost forever. Make its
   capture a first-class field in both writers, nullable-but-nagged.

---

## 7. Proposed diff outline (files, not code — nothing committed)

```
REHAB (row 0)
  git cherry-pick 1274860 285ac09 943ef8b 80bd7ec onto beta/integration
  drop the rescue-reverting hunks; keep only flywheel files
  rename  web/supabase/migrations/0035_outcome_flywheel.sql → 0039_outcome_flywheel.sql
  add     web/db/migrations/0031_outcome_flywheel.sql        (SQLite twin)

SPINE (row 1)
  add     web/supabase/migrations/0040_question_checks.sql   (+ SQLite twin 0032)
  add     web/src/lib/flywheel/question-catalog.mjs          (frozen ontology, qa-v1)
  edit    web/src/lib/schema.ts                              (QuestionCheck + ValueForKey per-key typing + superRefine)
  edit    web/src/lib/repository.ts                          (insertQuestionChecks + getters)
  edit    web/src/lib/json-repository.ts                     (impl, lenient read / best-effort write)
  add     web/tests/question-checks.test.mjs                 (state-table invariants)

WRITERS (rows 2–5)
  add     web/src/lib/flywheel/qa-pass.mjs                   (pure prompt-assembly + parse)
  add     web/src/lib/flywheel/snapshot.mjs                  (buildIntakeSnapshot, pure)
  edit    web/src/app/api/inngest/route.ts                   (parallel QA fn; NEVER in v1 engine path)
  edit    <desk setFlagStatus chokepoint>                    (terminal status → upsertCaseDisposition + snapshot)
  add     web/src/app/api/studio/reconcile/route.ts          (founder-gated; normalizeImportedRow → upsertCaseOutcome)
  add     web/src/app/api/studio/retrodiction/route.ts       (NDA-gated bulk import)
  add     web/tests/qa-pass.test.mjs, snapshot.test.mjs
```

All additive. Zero edits to `ScoredCall`, the frozen `flags` row, or `scoring/`. The v1
engine path is never touched — the QA pass runs in parallel with its own `rubric_version`.

---

## 8. Proposed `ops/decisions.md` entry (stage — do NOT append live)

```
## 2026-07-12 — Outcome-flywheel data spine: adopt staged outcome siblings, build the
   answer_value spine + insert path (B-016)  ·  agent: product-dev research · lane: product
- **Change (STAGED design, no code committed):** Verified `origin/feature/increment-0-
  flywheel` — `case_disposition` + `case_outcome` siblings, Repository seam, JSON adapter,
  pure censoring, 17 tests — are DONE and should be adopted (after branch rehab). Designed
  the two missing halves in `ops/drafts/data-spine-plan.md`: (1) the `question_checks`
  sibling — typed `answer_value` + verbatim `answer_citation` + canonical additive-only
  fact-key ontology + `rubric_version` + `language` tag — the actual demand-shaped spine
  B-016 names; (2) the insert path: a parallel QA Inngest pass (writer, never in the frozen
  v1 engine path), a decision-time snapshot builder + disposition stamp in the desk
  chokepoint, the monthly reconciliation route (pure normalizer already exists), and the
  onboarding retrodiction bulk import. All dark, internal-only, no scoring-freeze lift,
  sibling-only, through the Repository seam.
- **Hypothesis:** the moat is the outcome-labeled corpus (Day-0 cited facts → decision →
  realized net fee), which accrues only with calendar time; instrumenting before Monday's
  beta is the one permanently-lost-if-skipped move. Storing typed answers (not just
  ask-states) keeps the fact-sheet/demand-stage option open for ~3 columns.
- **Expected effect:** first `question_checks` + disposition rows on beta week-1 calls;
  first outcome rows at the first monthly reconciliation; retrodiction backtest at
  onboarding. No user-facing metric until ≥1 outcome cycle + fairness audit (§4sexies).
- **Compliance:** backend/internal/dark → ships on merge. Dollars never surfaced at intake,
  never priced into our flat fee (§I); citation guard made structural (§IV); RLS firm-scoped
  + deletion cascade + PII minimization (§VI). Separately GATED and NOT in this increment:
  any surfacing (fact-sheet export, panel), the north-star reframe copy, and any scoring USE
  of the corpus (→ Ali/Yang, §VII).
- **Risk flagged:** the branch reverts the rescue conveyor if merged straight — cherry-pick
  + renumber (0039/0040 Postgres, 0031/0032 SQLite twins) required; per-matter fee
  double-count and snapshot look-ahead leakage mitigated in the design.
- **Status:** staged-for-approval (design). Build sequence + ICE in the draft.
- **Review date:** 2026-07-26.
```
```
```

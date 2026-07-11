# The Conveyor MVP — near-term build on the EXISTING product (DRAFT, staged)

> **STATUS: DESIGN DRAFT.** The near-term, beta-appropriate product the strategic
> verdict points to (call-QA + develop-queue conveyor), designed as an INCREMENT on the
> existing Intake QA app — **no scoring-freeze lift required.** One §VII gate flagged
> (the monthly-statement north-star reframe is a product-claim change → stage, route to
> Ali/Yang). Companion to `engine-v2-EXECUTIVE-SUMMARY.md`.

**Core principle (already baked into this codebase):** never mutate the frozen `flags`
row — add sibling tables keyed to `flag_id` (how `flag_status`, `flag_confidence`,
`transcript_citations` shipped). The conveyor = **three more siblings + one reused
engine pattern.** The "did they ask X" checks are a SEPARATE lightweight pass with its
own `rubric_version`, NOT a v1-engine change → freeze intact.

## 1. "Did the rep ask X" QA layer
**Per-case-type question catalog** (a versioned JSON constant; each: `key`, `kind ∈
{value_determining | disqualifying}`, applicable case types). Every check resolves to
**`asked_answered` | `asked_unclear` | `not_asked`** — never yes/no (absence ≠ bad
answer; "didn't ask about UM" = *unknown, go find out*, never *no coverage*):

- all: `incident_date` (disq), `injuries_and_treatment_immediacy` (val),
  `prior_injuries_claims` (disq), `witnesses` (val), `spoke_to_another_firm` (val)
- auto/rideshare/trucking: `police_report_citation` (val),
  `commercial_defendant_coverage_source` (val)
- auto/rideshare: `client_insured_status_prop213` (disq), `um_uim_coverage` (val)
- rideshare: `rideshare_app_status` (val)
- premises: `premises_owner_notice` (val), `incident_report_photos` (val)
- dog bite: `homeowner_renter_coverage` (val), `prior_bite_history` (val)

**The pass:** a new Inngest step AFTER transcription, in PARALLEL with the frozen v1
engine (never in its path) → Claude gets transcript + the case-type's question list →
per-question state + verbatim span → spans through the **existing citation guard**
(`transcript_citations`) so every "they asked it here" is cited → stamps its own
`rubric_version` into `analysis_versions`, confidence via `flag_confidence`. Frozen
engine still owns the flag/score/`is_leaked_signable` — untouched.

**Desk surface (NOT surveillance):** a "Call quality" panel — *"This call captured 4 of
7 value-determining questions. ✓ incident date ✓ injuries ✓ police report ✓ witnesses —
Not captured: UM/UIM, commercial-defendant coverage, 'spoke to another firm'. [Develop
these →]"*. Three anti-surveillance rules: (1) **attribution to the CALL, never the
named rep** — schema stores no staffer identity on `question_checks`, no leaderboard
(same aggregate-not-per-staffer rule as the over-conversion signal); (2) aggregates are
firm-level trends ("incident-date captured on 82% of qualifying calls this month" =
coachable process gap, not a person); (3) the verb is **"develop," not "miss"** — a
not-captured question is *the answer isn't in hand yet, go get it* (literally true) →
neutral-gray "Not captured," never red "Failed."

## 2. Develop-queue (reuse the escalation/on-call engine — migrations 0026–0028)
Those already have the exact organs: **named ownership (`acked_by`, never a system
state), an ack-deadline clock, a waterfall re-alert ladder (`firm_oncall`), append-only
events, and a disposition model separating "didn't convert" from "false positive."**
Clean delta = two dedicated siblings mirroring that shape:
- **`open_items`** (one row per unresolved value-determining question worth chasing):
  `flag_id`, `firm_id`, `question_key`, `state_at_open ∈ {not_asked, asked_unclear}`,
  **`owner NOT NULL`** (defaults to `firm_oncall` primary — the "coverage always
  assigned / no silent gaps" invariant → no orphans), **`sla_due_at NOT NULL`** (past
  due → on-call waterfall re-alerts), `status ∈ {open, resolved, not_applicable,
  couldnt_reach}`, and a **CHECK that forbids a non-open status without a `resolution`**
  (can't silently sweep — mirrors `escalation_dispositions`' "a false positive without a
  reason is a mood").
- **`open_item_events`** (append-only: opened/reassigned/reminded/resolved).
- **`flag_status` stays as-is** — it tracks the *case outcome* (needs_callback→signed);
  `open_items` tracks the *information gap*, a different axis. Conflating them would be
  the exact discipline error `escalation_dispositions` avoids.

**Not a dumping ground (4 rules, 3 schema-enforced):** no item born unowned; every item
has a clock; **queue is CURATED** — items only for value/disq questions on calls the
frozen engine ALREADY flagged `is_leaked_signable` OR tier-2+ (a missed witness question
on a clearly-standard call mints nothing → short list, not noise); closing requires a
stated reason (`not_applicable`/`couldnt_reach` are honest exits).

**Desk + digest:** a "Develop queue" tab beside "Missed cases" — one-tap [Resolved —
captured] [Not applicable] [Couldn't reach] [Reassign]; each row: caller, case type, the
one missing question, owner, live SLA chip (green→amber→red). Daily digest gains a
"Develop queue — 6 open, 2 due today" block.

## 3. Enriched high-value flags (generic reminders, never computed advice)
Enrich the existing missed-case card with three additive fields keyed to `case_type`:
- **Value as a TIER, not dollars** — a `flag_value_tier` sibling buckets
  `fee_value_ranges` into `standard/elevated/high`; the card shows the **tier badge +
  plain cited reason** ("High — commercial trucking, possible $1M+ policy signal from
  'company truck'"). The dollar range stays OUT of the intake view (compliance) and only
  appears later in the monthly statement as an estimate-with-range-and-confidence.
- **The reason is a cited signal, not a verdict**; tier never auto-decides.
- **Evidence-preservation as a GENERIC reminder** — trucking/commercial: a static line
  *"Trucking cases often involve ECM/telematics data that can be overwritten; firms
  commonly send a preservation letter promptly"* — general-practice reminder, NOT "send
  a letter by Thursday." (Deadlines stay generic reminders.)

## 4. Headline metric — "value-determining questions resolved within SLA"
`resolution_rate = resolved_within_sla / value_determining_items_opened`. A single large
KPI tile + trend sparkline on the desk, REPLACING "missed revenue" as the hero number.
Monthly statement lead line: *"47 value-determining questions surfaced across flagged
calls; 39 resolved within SLA (83%). Median time-to-resolve 6 hrs. 5 high-tier cases
developed to signable."* Dollar/tier detail moves below the fold as ranges-with-
assumptions-and-confidence. **This is compliance-POSITIVE** — a count-resolved-within-SLA
north-star is a cleaner, non-dollar, non-outcome-tied number measuring the FIRM'S OWN
PROCESS (exactly what an independent recovery desk should measure), vs the current
"missed revenue" framing that brushes dollars-at-intake. **§VII GATE: this reframes the
headline product claim — build the mechanics, STAGE the copy, route to Ali/Yang before
public.**

## 5. Minimal build sequence (all ships to the 5-firm beta WITHOUT lifting the freeze)
1. **Question catalog + QA pass (backend only, dark):** `question_catalog` constant +
   `question_checks` sibling + the parallel Inngest step (`rubric_version = qa-v1`).
   Runs silently, zero UX/freeze risk. *Smallest shippable.*
2. **Call-quality panel + firm aggregate:** "4 of 7 captured" on call detail + a
   firm-level trend row. Read-only over #1.
3. **Develop-queue:** `open_items` + `open_item_events` + generator (owner from
   `firm_oncall`) + desk tab + one-tap dispositions + digest block; reuse the on-call
   waterfall for overdue re-alerts.
4. **Enriched flags:** tier badge + cited reason + case-type evidence-preservation
   reminder on the existing card. Pure additive read.
5. **North-star instrumentation:** `resolution_rate` view + desk KPI tile + monthly-
   statement line. **Stage the statement copy for Ali/Yang before public (§VII).**

**Explicitly NOT built:** no v1-engine change; no terminal auto-decisions (items/tiers
inform, never auto-close); no per-staffer scoring; no live alert sender (reuses the
existing MOCKED alert-sender port — live delivery stays deferred/gated per ROADMAP;
overdue-item alerts simulate until that gate lifts).

**Compliance check:** no dollars at intake (tier + cited reason only); no terminal
auto-decisions; deadlines generic; QA signal call/firm-aggregate never per-named-staffer;
absence = neutral "not captured" never inferred-negative; Spanish calls run the identical
catalog at the identical bar; every "asked here" claim transcript-cited. One §VII gate:
the monthly-statement north-star reframe (stage the copy).

**Grounding files:** frozen `flags` + sibling pattern (`db/migrations/0001_init.sql`,
`0014_recovery_desk_additive.sql`); `flag_status` (`0022`); fee ranges (`0014`, `0025`);
the reusable ownership/SLA/event/disposition engine (`supabase/migrations/0026_escalations.sql`,
`0027_oncall.sql`, `0028_tuning.sql`).

---

## 6. Increment 0 — the OUTCOME-DATA FLYWHEEL (ship FIRST; the moat)

The red-team's one non-optional amendment: **the moat in PI triage isn't the model — it's
the outcome-labeled corpus (intake facts → the firm's decision → realized net recovery),
which accrues ONLY with calendar time (cases resolve in 12–36 months).** Every month
without instrumentation is permanently-lost training data. So this ships BEFORE the
user-facing conveyor, silently, scoring 100% internal.

**Minimal day-one schema (two thin siblings; extends the existing `Outcome` record
keyed by `call_id`, per CLAUDE.md "extend with siblings, never edit ScoredCall"):**
- **`case_disposition`** (what the firm DID, captured near intake): `flag_id`/`call_id`,
  `firm_id`, `disposition ∈ {signed, developing, referred_out, declined, no_action}`,
  `decided_by` (role, not a scored staffer), `decided_at`, and an **immutable
  `intake_feature_snapshot`** (the backbone facts + question-check states the decision
  was made on — you validate against what was KNOWN then, never what was learned later).
- **`case_outcome`** (what HAPPENED, captured at the monthly 15-min reconciliation, T+
  months/years): `end_state ∈ {settled, tried, dropped, withdrew, referred_resolved,
  open}`, `gross`, `costs_advanced`, `lien_load`, `net_to_client`, **`net_fee_to_firm`**,
  `referral_fee`, `time_to_resolution`. Missing fields = **censored, never zero**;
  declines are censored (never assume declined = worthless — that's circular).

**Ingestion:** the SAME monthly 15-min reconciliation the conveyor already asks for (firm
exports "closed/settled last month" from its CMS, or a short guided form) — this is why
the flywheel is nearly free once the conveyor exists. Plus a **retrodiction bulk export
at onboarding** (the firm's last 12–24 months of already-closed cases → an instant
backtest + the firm's first band→outcome map on day one; the single highest-leverage 30
minutes).

**What it powers (later, internal-only):** the target metric is **realized net-fee per
case / PIY**, NEVER sign-rate (Goodhart). Retrodict first, then prospective; Brier/QWK/
calibration per band, recalibrated quarterly; cold-start Bayesian seeding from published
base rates with wide intervals until ~30 resolved cases per band. **No score is ever
shown, no staff metric attached, until ≥1 real outcome cycle closes.** (Full mechanics:
`engine-v2-config-and-validation.md`.)

**This also directly serves beta-test #3** ("does 'questions resolved within SLA'
correlate with dollars recovered?") — the flywheel is the instrument that answers it.

**Compliance:** internal-only ledger (no dollars surfaced at intake); Intake QA is NOT
the system of record (the firm's CMS wins on conflict); no per-staffer scoring; deletion
cascade honored (§VI); the feedback loop must be audited for language/proxy disparity
BEFORE it ever recalibrates (§4sexies — don't launder historical under-service).

**Build cost:** two Postgres/Supabase tables + the reconciliation form already in the
conveyor + a nightly stamp of the intake snapshot at decision time. It ships as
Increment 0 precisely because it's cheap now and irreplaceable later.

### Increment 0 AMENDMENT (Wave 6, 2026-07-10 — adopt before it ships): the demand-shaped data spine

Source: `demand-stage-adjacency.md`. Four cheap changes that turn the QA log into the
intake-to-demand data spine (keeps the demand-stage partnership/product option open for
~3 columns and a form tweak; hard boundary: never build demand *generation*):

1. **Store answers, not just ask-states.** `question_checks` gains a typed
   **`answer_value`** (`date`|`text`|`enum`|`json`) + **`answer_citation`** (verbatim
   transcript span). "They asked about UM/UIM" is QA; "UM/UIM = $100k/$300k, Farmers" is
   a demand-package fact. Same Claude pass, one more extraction field — and the answer
   values flow into `intake_feature_snapshot`.
2. **Canonical fact keys, additive-only.** `question_key` is a frozen ontology
   (`coverage.um_uim`, `incident.date`, `witnesses[]`, `priors[]`); keys are never
   repurposed, only added (rides the existing `rubric_version`).
3. **`external_case_ref`** (nullable text, CMS matter ID — Filevine/Litify/Clio) on
   `case_disposition`. The join key to the firm's CMS cannot be backfilled later.
4. **Demand milestones in `case_outcome`:** `demand_sent_at`, `demand_amount`,
   `first_offer` — making the corpus *intake facts → demand → recovery* and powering the
   partnership stat ("cases with all value-determining facts captured demand faster").

Competitive context (why now): EvenUp and Supio are both marching backward into intake —
**Supio Intake ships a call-scoring agent today** — so the window for the independent
develop-queue wedge is compressing, and the provenance asset (Day-0 cited facts) is the
part they cannot retroactively replicate.

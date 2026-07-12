# O3 — Conversion Plan: the audit → pilot → paid funnel (CONSOLIDATED, STAGED)

> **STATUS: STAGED. Nothing here is published, priced live, sent, or pushed (§VII).** This is the
> Conversion/Sales/Offer consolidation for the founding cohort. It fuses the four O3 sub-agent
> drafts into one funnel, instruments the two conversion rates that decide the whole business from
> firm #1, and separates what a builder ships autonomously from what waits on Ali or Yang.
> Author: O3 objective lead, 2026-07-12. Beta opens Monday 2026-07-14.
>
> **Source drafts (read for the detail; this is the spine that ties them together):**
> - Pricing → `ops/drafts/pricing-final-onepager.md` (Table C recommendation, §I edit staged)
> - Offer → `ops/drafts/offer-architecture.md` (Charter Firm + guarantee decouple, Yang question)
> - Demo/onboarding → `ops/drafts/demo-onboarding-script.md` (the live-autopsy arc + cadence)
> - Trust → `ops/drafts/trust-arsenal-status.md` (diligence answers + the DPA gap)
>
> **North Star this serves (`ops/metrics.md`):** signed founding pilots → converted paying firms.
> **The two numbers that decide everything (`ops/insights.md` B2):** audit→pilot and pilot→paid.
> Instrument both from firm #1. Everything below exists to move one of them, or to keep a
> compliance rail intact while it moves.

---

## 1. The funnel, end to end (one picture)

Five stages. O2/outreach owns Stage 0; O3 owns Stages 1–4. The two boxed transitions are the
decision-critical conversion rates — the only two `ops/insights.md` B2 says the $1M model hinges on.

```
 STAGE 0            STAGE 1          STAGE 2             STAGE 3              STAGE 4
 Qualified   ──▶    Demo      ──▶    Leak Audit   ══▶    Pilot        ══▶    Paid Charter
 conversation       (live            delivered           (free beta,          (flat monthly,
 booked             autopsy)         (10 of THEIR         NDA-gated,           Table C founding
 [O2 owns]                           calls scored)        desk live)           rate)
                                          │                   │
                                          └── CR-A ═══════════┘   └── CR-B ══════════┘
                                          audit → pilot            pilot → paid
                                          target 40% (B2)          target 50% (B2, weakest)
```

**Stage-gate definitions (so we never move the goalposts — mirrors `ops/metrics.md` definitions):**

| Stage | Done when | Owner | Draft |
|---|---|---|---|
| 0 · Qualified conversation | Decision-maker at a CA PI firm agrees to a call/demo | O2 outreach | — |
| 1 · Demo | Live autopsy run on ≥1 of the firm's OWN recorded calls, or the sample if empty-handed | Ali (by hand) | demo-onboarding §Part 1 |
| 2 · Leak Audit delivered | 10 of the firm's own calls scored + a cited readout walked with the owner | Ali (by hand) | demo-onboarding §Part 5 |
| 3 · Pilot signed | Mutual NDA executed **and** calls flowing (webhook or upload) **and** desk live | Ali + setup call | demo-onboarding §Part 3 |
| 4 · Paid Charter | Flat monthly subscription signed at the Table C founding rate | Ali (post-Yang/Ali gates) | offer-architecture §Part A |

**Why these two transitions and not the others:** Stage 0→1→2 is a top-of-funnel volume problem
that outreach (O2) and founder-hours solve. CR-A and CR-B are where *the product and the offer*
either work or don't — they are the two rates that, per B2, decide whether $1M lands in 12 months
or slips to 18. A shift from 50%→33% on CR-B alone pushes the timeline out ~6 months. That is why
they get real instrumentation, not a vibe.

---

## 2. Instrument CR-A and CR-B from firm #1 (the decision-critical spine)

This is the part the plan exists to nail. Both rates already have rows in `ops/metrics.md`
("Leak Audits delivered", "Pilot agreements sent/signed", "Pilots converted to paid") — today they
are blank and hand-counted. From firm #1 they must be **captured as events, not remembered**, so we
learn the real rate instead of the assumed one.

### CR-A · audit → pilot

- **Ratio:** `pilots signed ÷ Leak Audits delivered`.
- **Numerator fires when:** NDA executed AND first calls flowing (the Stage-3 gate). Capturable
  today — the `welcome_emails` row + first `calls` row for a firm is the timestamp.
- **Denominator fires when:** a readout is walked with the owner (Stage 2). Capturable as a one-line
  founder log in `/studio` (an "audit delivered" mark per applicant/firm).
- **Target:** **40%** (B2 base case — "depends on audit quality", flagged weak). 
- **The decision it drives:** if CR-A runs materially below 40% after the first handful of audits,
  the defect is the **audit/demo**, not the price — fix the live-autopsy hit rate (the pre-demo ask,
  the misfire playbook) before adding outreach volume on top. This is the `ops/metrics.md` review
  rule: an input metric flat for 2 cycles → investigate before building more.
- **Leading indicator (predicts CR-A before the pilot closes):** did a *real signable-that-walked*
  surface on the firm's own call during the demo? demo-onboarding names this as the single biggest
  demo risk. Log demo outcome as `wow_landed | clean_call | false_alarm` — a run of `clean/false`
  is an early CR-A warning.

### CR-B · pilot → paid

- **Ratio:** `Charter conversions ÷ pilots that reached the conversion window (~6 weeks / beta end)`.
- **Numerator fires when:** a paid Charter subscription is signed (Stage 4).
- **Denominator fires when:** a pilot hits the conversion-window cliff (dated, per firm — beta start
  + ~6 weeks).
- **Target:** **50%** (B2 base case — explicitly the **weakest assumption** in the whole $1M model;
  no owned data yet; niche B2B pilot-conversion ranges 20–60%).
- **The decision it drives:** this is the number the whole timeline pivots on. At 50% → ~48 pilots
  for 24 firms → 12-month $1M. At 33% → ~72 pilots → the model slips to ~18 months (B2, verbatim).
  **We do not get to observe CR-B at all until pricing is unblocked** (see §5, D1) — you cannot test
  a paid conversion with no price. That is the single most important reason pricing is the gating
  decision, not a cosmetic one.
- **Leading indicators (predict CR-B weeks before the cliff):** (1) **confirmed recovered fees before
  the step-up** — the founding north-star metric; the recovered-fee ledger is what closes the
  renewal, not the discount (pricing-onepager §6). (2) desk daily-active retention through week 3
  (the beta desk-hygiene work, decisions B-010/012). (3) digest reaching the person who actually
  dials (demo-onboarding §Part 3 — the #1 silent-failure mode).

### What to build for instrumentation (Claude-ready — see §4)

A funnel counter in `/studio` that derives both ratios from rows that already exist (`welcome_emails`,
`calls`, beta feedback, a new one-line "audit delivered" + "converted" founder mark) and writes the
weekly readings into `ops/metrics.md`. Internal-only, no public surface, no send → **builder ships
this autonomously.** This is the highest-leverage Claude-ready item in the whole plan: without it we
are guessing at the two numbers that decide the business.

---

## 3. The conversion motion, stage by stage (what each draft contributes)

**Stage 1–2 · Demo → Leak Audit (wins CR-A).** The wow is a **live autopsy on the firm's OWN
recorded call** — transcribe→score in the room, surface a signable-that-walked with verbatim quotes
and tiered confidence, framed as dispute transformation (a grievance that was never named). Spine:
*their calls, their arithmetic, their credit — and a named human stakes the score.* ROI is
ranges-only: `~$284/lead` (verified) and a `north of $10,000` contingency floor, the partner does
every division, **never a cost-per-signed-case dollar** (broken derivation, copy-audit P0-2). The
close is the free Leak Audit: "ten of your own calls." Full script + misfire playbook:
`demo-onboarding-script.md`.

**Stage 3 · Pilot activation (protects CR-A→CR-B).** A 15-minute setup call that ends on a
**verified green self-test**, not "should work" — CallRail paste OR upload fork, then a live test
call watched onto the desk together. The Day-0/1/3/7 cadence turns activation into retention:
exception-based, counts-only, credit-framed to the coordinator by name. Setup mechanics:
`callrail-setup-runbook.md`; cadence templates: `beta-comms-kit.md`; sequencing:
`demo-onboarding-script.md` §Parts 3–4.

**Trust (spans every stage — removes the diligence blocker that silently kills CR-A/CR-B).** Ten
<1-minute diligence answer scripts, each ending at the honest edge; a per-artifact status of the NDA
/ DPA / BAA / MOU / security paper. The load-bearing gap: **the DPA is only a noindex web page, not a
signable document**, yet the NDA/MOU/security all lean on it — if a firm's counsel says "send me your
DPA to redline," we have nothing to send. Full audit + answer scripts: `trust-arsenal-status.md`.

**Stage 4 · Charter conversion (wins CR-B).** The paid founding membership that replaces the free
pilot, architected as a **two-way trade, not a discount**: the $1,500 founding rate is *consideration*
for four design-partner deliverables — feedback cadence + monthly design call, recorded calls under
NDA/CIPA (the outcome-labeled corpus, the moat), case-outcome labels (the actuarial spine), and an
opt-in reference. Naming the exchange out loud is what stops $1,500 from anchoring the market below
the $2,500 list. Paired with a **decoupled** risk-reversal guarantee (see §5, D5). Full offer:
`offer-architecture.md`.

---

## 4. Claude-ready vs §VII-human-gated (the clean split)

### ✅ Claude-ready — a builder ships these autonomously (backend/internal, no public claim, no send)

1. **The CR-A / CR-B funnel instrumentation in `/studio`** (§2). Internal counter + weekly write to
   `ops/metrics.md`. **Highest-leverage build in the plan.**
2. **Stage a signable DPA** (`ops/drafts/external/beta-dpa.md`) lifted from the /dpa page — *staging a
   draft* is Claude-ready; it then routes to Yang before use (trust-arsenal B-1).
3. **Consolidation/sequencing artifacts** (this plan; the demo arc; the cadence spine) — all staged,
   Ali runs/sends by hand.
4. **Demo-outcome + leading-indicator logging** (`wow_landed | clean_call | false_alarm`; recovered-
   fee ledger surfacing) — internal telemetry, no send.

### 🔒 §VII human-gated — nothing moves without the named human

| # | Gate | Owner | Recommendation | Source |
|---|---|---|---|---|
| G1 | **Pricing table locked into §I** | **Ali** | Adopt **Table C** (list $2,500/$5,000; founding $1,500 Core, 12-mo lock, discount FROM list). Kill B's permanent $1,000. | pricing-onepager §4 |
| G2 | **§I fee-structure edit + founding-MOU "12-month lock" sentence** | **Yang** | Novel-in-regulated-area; exact §I replacement text staged | pricing-onepager §7 |
| G3 | **Guarantee construction** | **Yang** | Decouple: unconditional first-month refund as the stated guarantee + demote "$25k" to a per-firm audit *finding*, never a promised threshold | offer-architecture §B4/§7 |
| G4 | **NDA / DPA / BAA / MOU packet** | **Yang** | Review as one packet; strike NDA §4(c) "zero-retention" overclaim; rule on the BAA-instrument question | trust-arsenal §B/§D |
| G5 | **Public copy: retention "90", deletion "promptly by hand"** | **Ali** | Set Vercel `DATA_RETENTION_DAYS=90`; delete stale `=30` from `.env.local`; soften "immediately" → "promptly, by hand" | trust-arsenal §B-2/§B-3 |
| G6 | **Any launch price spoken/published; any message sent** | **Ali** | No dollar figure to the public site during beta; Ali presses every send | all four drafts |

---

## 5. Open decisions Ali must make (each with a crisp recommendation)

**D1 · Lock the pricing table. [BLOCKED — the master gate; everything downstream is provisional.]**
The three-way split (§I $2,500/$5,000 vs GTM $1,000/$1,500/$3,000 vs 2026-07-09 $1,500/$2,500/$5,000)
is still `decisions.md:211` open. **Recommend Table C**, written into §I + a dated decisions entry the
same day. Until this lands: CR-B cannot be tested with money, the Charter offer cannot go live, and
the demo's pricing beat stays "flat monthly, number in writing after your audit." *This is the one
decision that unblocks the most.*

**D2 · Founding-pool cap: 5 public vs 10 internal.** **Recommend** keep `COHORT_MAX=5` public as the
*beta* number; keep 10 internal as the founding-*rate* pool outer bound (5 beta + up to 5 early
payers). Publish neither the cap-10 nor any dollar. If Ali prefers strictly-safe, default the pool to
5 for launch and expand later — no copy change needed. (pricing-onepager §3)

**D3 · Cohort-cap collision (beta 5 vs Charter 10).** **Recommend** the 5 beta firms convert into the
first 5 of 10 Charter seats; 5 seats remain for warm-outreach closes. Left unreconciled it produces
contradictory public copy. (offer-architecture §A4)

**D4 · Rate-lock term: 12 months vs "life of subscription."** **Recommend 12 months** (matches Table
C, avoids a perpetual below-list liability), stated explicitly in the founding MOU so the live "lock
in preferred pricing" copy is never heard as "forever." Add a renewal courtesy: 60 days' notice,
never moved above list. (offer-architecture §A3, pricing-onepager §3/§6)

**D5 · Guarantee: keep the $25k dollar threshold, or decouple?** **Recommend decouple** —
unconditional first-month-refund satisfaction guarantee as the *stated* guarantee, and the "$25,000"
demoted from a guaranteed threshold to a per-firm audit *finding* shown in the firm's own cited
readout. Keeps full persuasive force (money-back reversal + their own shocking number) while removing
the guaranteed-dollar surface that §IV, SB-37's "misleading guarantee" bar, and FTC §5/§17500 all
press on. Routes to Yang as a 3-option menu (§G3). (offer-architecture §B4)

**D6 · Retention + deletion copy (config + wording).** **Recommend** set Vercel
`DATA_RETENTION_DAYS=90`, delete the stale `.env.local` `=30`, and soften public "immediately" →
"promptly, by hand, on written request" to match SECURITY.md. Small edits, but they are product
claims → Ali's gate. Do before Monday. (trust-arsenal §B-2/§B-3)

**D7 · Honor the "NDA within one business day" promise Monday.** The promise is live on `/apply`; the
NDA draft is not Yang-cleared and Dropbox Sign is in TEST mode. **Recommend** Yang clears the NDA in
the §G4 packet and we send a PDF for manual signature until e-sign is flipped live — a one-day clock
with no cleared document is a broken promise waiting to happen. (trust-arsenal §C-6)

---

## 6. Biggest conversion risk (named, not smoothed — §VIII)

**CR-B (pilot→paid) is the single biggest conversion risk, and it is currently un-observable because
pricing is blocked.** Three compounding facts make it the crux:

1. It is the **weakest assumption in the entire $1M model** (B2: assumed 50%, no owned data, real
   range 20–60%). A slip to 33% pushes $1M from 12 to ~18 months.
2. It **cannot be measured at all until Ali locks Table C** (D1). Every day pricing stays blocked is a
   day we cannot learn the one number the timeline pivots on.
3. When it *is* measured, the deep-discount step-up is the churn moment: **$1,500→$2,500 at month 13
   is a 67% increase**, and deep-discount cohorts churn ~4.2× at exactly that point (pricing-onepager
   §6, plausible-unverified). It only holds if the **recovered-fee ledger makes value self-evident
   before the step-up** AND the 12-month term is in writing from day one so a firm that heard "lock in
   preferred pricing" never experiences the expiry as bait.

**Mitigation, in priority order:** (a) Ali locks Table C now (D1) so CR-B becomes observable; (b) make
confirmed recovered fees before the step-up the founding north-star metric and instrument it from
firm #1 (§2 leading indicators); (c) state the 12-month term in the MOU up front (D4); (d) decouple
the guarantee so the *first* yes is unconditionally safe (D5). Secondary risk: CR-A's live-autopsy wow
is contingent on a real signable-that-walked surfacing on the firm's own call — the pre-demo ask and
misfire playbook stack the odds but cannot fully engineer it out (demo-onboarding §Risk 1).

---

## 7. Proposed `ops/decisions.md` entry (STAGED — paste on Ali's review, do NOT append live)

```
## 2026-07-12 — O3 conversion plan consolidated: audit→pilot→paid funnel + CR-A/CR-B instrumentation  ·  agent: O3 objective lead · lane: conversion/sales/offer (§VII)
- **Change (STAGED):** Consolidated the four O3 sub-agent drafts (pricing-final-onepager,
  offer-architecture, demo-onboarding-script, trust-arsenal-status) into one funnel:
  Qualified conversation → Demo (live autopsy) → Leak Audit → Pilot (free beta, NDA-gated) →
  Paid Charter (Table C). Instrumented the two decision-critical conversion rates from firm #1:
  CR-A audit→pilot (target 40%, B2) and CR-B pilot→paid (target 50%, B2's weakest assumption) —
  each defined as an event-captured ratio in /studio writing weekly to ops/metrics.md, with
  named leading indicators (demo wow_landed, confirmed recovered fees before step-up, desk week-3
  retention, digest-to-dialer). Split Claude-ready (funnel instrumentation, staged signable DPA,
  telemetry) from §VII-gated (pricing G1, §I+MOU edit G2→Yang, guarantee G3→Yang, contracts
  G4→Yang, retention/deletion copy G5, sends G6).
- **Hypothesis:** the two conversions ops/insights.md B2 says decide the $1M model are won by the
  live-autopsy demo (CR-A) and a Charter offer + activation cadence + recovered-fee proof (CR-B);
  measuring them from firm #1 replaces the assumed rates with owned data before we scale outreach.
- **Open decisions surfaced to Ali (recommendations in §5):** D1 lock Table C [master gate;
  BLOCKED]; D2 founding pool 5 public/10 internal; D3 beta-5→Charter-10; D4 12-month lock;
  D5 decouple the guarantee; D6 retention=90 + "promptly by hand"; D7 honor NDA-in-one-day.
- **Biggest risk:** CR-B is the weakest model assumption AND un-observable until pricing unblocks;
  when measured, the $1,500→$2,500 month-13 step-up (67%) is the deep-discount churn moment —
  guarded by recovered-fee proof + written 12-month term + decoupled unconditional first yes.
- **Status:** staged-for-approval. Builder may ship the funnel instrumentation + staged DPA
  autonomously (internal, no send); all pricing/guarantee/contract/copy items are §VII-gated to
  Ali/Yang per the G1–G6 table. Nothing published, sent, priced live, or pushed.
- **Review date:** 2026-07-21 (first demos + first-week cadences); CR-B review at first Charter
  conversion window (~6 weeks post-7/14).
- **Result:** (filled at review)
```

---

## 8. Routing (§VII)

- **Ali:** D1 (lock Table C — the master unblock) + D2/D3/D4/D6/D7; approve the funnel
  instrumentation build; press every send. No dollar to the public site during beta.
- **Yang:** the §I fee-structure edit + founding-MOU 12-month sentence (G2); the guarantee
  construction menu (G3, question drafted in offer-architecture §7); the NDA/DPA/BAA/MOU packet
  and the BAA-instrument question (G4).
- **Do NOT** touch `compliance-invariants/SKILL.md`, `decisions.md`, `metrics.md`, any contract, or
  any web copy in this task. All staged.

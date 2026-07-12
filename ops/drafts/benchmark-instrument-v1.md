# The Benchmark Instrument v1 — Phone-Free Build (B-006)

> **STATUS: STAGED INSTRUMENT DRAFT. AUTHORIZES ZERO DIALING, ZERO SENDS, ZERO PUBLICATION.**
> This is the complete measurement instrument for the independent CA PI intake benchmark, built
> phone-free so it is ready the moment Yang signs the §632 protocol. Every field figure is
> `[TO BE MEASURED]`. Nothing here is a finding. Nothing here is published.
>
> **What this document IS:** the sampling frame, the fixed scenario, the scored rubric, the
> confidence-tier scheme, the false-alarm methodology, the Spanish matched-pair design, and the
> Yang-gate checklist — the ~90% of the intellectual asset that touches no phone (per
> `authority-engine-plan.md` §D.1: "build the phone-free instrument now").
>
> **What this document is NOT:** authorization to dial, a legal opinion, or a finding. The
> fieldwork gate is `yang-cipa-632-mystery-shop-protocol.md` §11 G1–G8 (compliance §II/§VII).
>
> **Builds on (do not re-derive):** `authority-engine-plan.md` (Part A — the design this
> operationalizes), `yang-cipa-632-mystery-shop-protocol.md` (the legal posture, verbatim
> persona), `benchmark-report-outline.md` (the report spine this feeds), `spanish-first-intake-qa.md`
> (the Spanish market brief). Compliance authority: `.claude/skills/compliance-invariants/SKILL.md`
> §II, §IV, §V, §VI, §VII, §VIII.
> Date drafted: 2026-07-12. Owner: research-analyst.

---

## 0. The one rule that governs the instrument

The instrument's only job is to measure the market honestly enough that a hostile managing
partner, a journalist, or opposing counsel can attack it and lose. The moment any item is tuned
to make the market look worse (to sell the product) or better (to avoid a fight), the asset is
dead — independence is the whole moat (compliance §IV/§V; plan §0). The structural safeguards are
not good intentions: they are **pre-registration** (the rubric, scales, tier cut-offs, and
false-alarm thresholds are frozen and dated *before* any firm is dialed) and a **published error
rate**. We publish the ruler before we publish the reading.

Everything below is buildable today because none of it touches a phone. The false-alarm
calibration (§4) uses only our own staff under all-party internal consent. The fieldwork — the
only phone-touching step — waits on Yang.

---

## 1. Sampling frame — who gets shopped, and why the result generalizes

### 1.1 Population (target of inference)

California plaintiff-side **personal-injury firms of 2–10 attorneys** that **visibly buy inbound
lead flow** (Google Local Services Ads / PPC, TV, billboard, or Spanish-language media). This is
the frame because a leaked intake call at such a firm has a hard, already-paid-for dollar cost
(plan §A.1; the LSA badge is itself proof of paid intake volume). Deliberately **out of frame**:
solos with no paid intake volume (no leak worth scoring) and 30+ attorney ad-machine firms (not
the buyer, and their intake is an industrialized call center that answers a different question).

### 1.2 Geography — LA-first, matching the live beta

**Primary metro: Greater Los Angeles** (LA + Orange + Inland Empire), because that is where the
live LACBA/CAALA beta cohort actually lands (Memory: LACBA beta readiness; plan §A.1 flags the
NorCal-legacy vs LA-pivot tension and resolves it to "wherever the founding cohort lands"). A
benchmark whose geography matches the firms Ali is selling into is worth 10× one that doesn't. A
**NorCal arm** (SF–Oakland, San Jose, Sacramento) is added only if a NorCal cohort materializes.

> DECISION FLAGGED FOR ALI: confirm LA as the primary metro before enumeration begins. The
> instrument is metro-agnostic; only the frame enumeration depends on this pick.

### 1.3 Frame construction (ethical, public-source-only)

Enumerate from public directories with a **≥2-source verification rule per firm** (reuse the
`dream25-targeting-plan.md` SOP): CA State Bar member records + a PI directory (Justia / Avvo /
Super Lawyers) + live Google **LSA results** for `"car accident lawyer [city]"`. Per firm record,
capture only public business-directory data: firm name, public main line, attorney-count band,
practice mix, and **visible-Spanish-media presence (Y/N)** (Spanish landing page, Spanish LSA/TV,
listed bilingual intake). No firm PII beyond directory data; no fabricated firms (compliance §VI).

### 1.4 Stratification

Two axes, both pre-specified:
1. **Metro** (LA / Orange / Inland Empire; NorCal sub-metros if that arm runs).
2. **Visible-Spanish-media presence (Y/N)** — we **oversample** Spanish-advertising firms so the
   Spanish matched-pair arm (§5) is adequately powered. Spanish-advertising firms are the only
   ones where competent Spanish intake is an expectation the firm itself sells, which is what
   makes the paired-test defensible.

### 1.5 Target n and the power/precision logic (in plain terms)

We are estimating **market-level proportions** ("what share of firms did X"), so precision is
governed by the margin of error on a proportion at 95% confidence. The worst case (p ≈ 0.5,
maximum variance) gives:

| Target n | 95% margin of error (worst-case p=0.5) |
|---|---|
| ~96 firms | ±10 percentage points |
| ~196 firms | ±7 percentage points |
| ~60 firms | ±13 percentage points |

The binding constraint is **founder-hours** (one call per firm, no recording, live scoring — plan
§D.1 insight B1). So the honest plan is a **pilot wave of n ≈ 60–100 firms**, drawn **at random
within strata** from the enumerated frame, and reported as a **±10–13 pt market estimate** — a
**probability sample, never a census, never a convenience sample of firms we happened to know.**

Defensibility discipline, pre-specified:
- State the **frame size**, the **draw method** (stratified random), and the **realized
  disposition of every drawn firm** (answered / voicemail / answering-service / unreachable) so
  the denominator is auditable. A firm that is unreachable is a *datum* (it is part of the
  answerability finding), not a silent drop.
- The Spanish arm is powered on **matched pairs within Spanish-advertising firms** (§5), not on
  the whole n — its own precision is reported separately and honestly (it will be wider).

### 1.6 Exclusions (pre-specified, frozen before the draw)

- Referral-only shops and firms that do not take inbound PI intake.
- **Any firm in the founding cohort, the active pipeline, or with a prior Ali relationship** —
  the independent scorer cannot shop its own prospects (conflict of interest that would void the
  independence claim).
- Duplicate offices of the same firm (dedupe to the firm, not the phone number).

### 1.7 Contact discipline (from the Yang protocol, restated)

**One call per firm per wave. No repeat dialing. No after-hours "does voicemail work" probing**
without a specific Yang-approved reason. This is the harassment/anti-capping guardrail (protocol
§1 volume caps, Q6, G4). The single-encounter design means every finding is honestly a
**snapshot**, never a firm's steady-state quality (§4 limitation (c)).

---

## 2. The fixed scenario — one standardized caller, identical across every shop

**Design principle:** every shopper runs the *same* script so the study measures the firm's
intake, not the shopper's storytelling. The scenario is **fictional**; the tester is the
"caller," there is no real claimant, and **nothing is recorded** — that is what keeps the entire
study outside §632/§632.7 (protocol §3–§4; compliance §II). Persona adopted **verbatim** from the
Yang protocol §1 so the legal review and the instrument describe the identical fact pattern.

### 2.1 The caller (fixed facts)

- **Who:** an adult who was a **passenger** in a **rear-end motor-vehicle collision ~two weeks
  ago.** Passenger-not-driver is chosen deliberately: low-drama, no liability dispute to argue, no
  urgency that would distort intake behavior.
- **Injury:** **neck and back soreness.** Saw a doctor **once.** Still sore. No surgery, no ER
  drama, no lost limb — a routine soft-tissue presentation that a competent intake should treat as
  a real-but-modest case.
- **Status:** **has not signed with any firm**, is **"just calling around,"** and is **"not sure
  it's even worth talking to a lawyer."** This ambivalence is the load-bearing design choice: it
  is the exact moment where good intake behavior (open questions, reflection, next-steps) either
  converts entrusting into a relationship or lets it leak.
- **Fixed disclosures the caller gives only if asked:** first name only (pseudonymous), a
  study-controlled callback number, city, the two-week timing, the one doctor visit. The caller
  **invents nothing beyond this** — the fact set is closed so every firm works the same raw
  material.

### 2.2 Emotional register (fixed, so tone does not vary the score)

Calm, slightly hesitant, mildly worried about cost and "whether this is a big deal," **not**
distressed, **not** crying, **not** angry. A flat, non-manipulative register that neither rewards
nor punishes a firm for emotional labor it wasn't provoked into. The register is scripted and
identical across shoppers (and, in the Spanish arm, matched across languages — §5).

### 2.3 Decision points (the scripted branch points every firm is walked to)

The script drives the firm past the same forks so the rubric items are observable on every call:

1. **Answerability fork** — who/what answers (human / IVR / answering service / voicemail /
   unreached). The caller's opening line is fixed: *"Hi, I was in a car accident a couple weeks
   ago and I'm not really sure if I need a lawyer — is this a good number to ask about that?"*
2. **Fact-capture fork** — does the firm ask who/what/when (collision type, date) and, critically,
   **about treatment** ("have you seen a doctor / are you treating")? The caller answers only from
   the fixed fact set.
3. **Ambivalence fork** — the caller voices the scripted hesitation once
   (*"honestly I'm not sure it's worth it, it's just some soreness"*). This is the deliberate
   probe for reflective/empathic/autonomy-supporting behavior (rubric §3-B).
4. **Next-steps fork** — does the firm explain what happens now, a timeline, and a named
   person/callback?
5. **Close fork** — does the firm offer a concrete follow-through (booked callback / warm transfer
   to a decision-maker)? The caller **declines any appointment or e-signature** politely
   (*"I'm still thinking it over, thanks"*) and ends the call.

### 2.4 Hard stops (script guardrails — CIPA/consent-safe)

- Never claim to be a real client or to have a real case.
- Never provide a real third party's PII.
- **Never** agree to, or proceed toward, retaining the firm or e-signing anything.
- Decline appointments/retainers politely and end the call once rubric items are observable.
- Target call length **under ~4 minutes.**
- **"Are you a tester?"** — the candor rule is the one genuinely open question Yang must resolve
  (protocol Q5 / G3). **Not settled here.** Until Yang rules, the instrument leaves it as a
  flagged branch, not a scripted lie.

---

## 3. The 4-minute rubric — behavioral proxies, not an empathy meter

**Format decision (frozen):** every scored item is a **binary or short-ordinal observable** —
"did the firm do this checkable thing," or a small tally of a *countable* behavior — scored **from
memory + contemporaneous notes, no playback, no verbatim quotes** (protocol §2–§3). Binary/count
observables are chosen because they have the **highest inter-rater reliability** under 4-minute,
no-record conditions and are robust to the one thing we refuse to capture (the words themselves).

**We are not scoring "empathy" as a mystical quantity.** Per the /letter thesis and compliance
§IV/§VIII (Forsberg 2007 empathy-reliability caveat, carried verbatim), each item is an
**observable behavioral proxy** grounded in the same frameworks the product uses — MITI/OARS
(reflections, open questions), ECCS (empathic-opportunity responses), psychological-first-aid
(safety/orientation), peak-end (the close), and SPIN (question sequencing). An item that cannot
be scored as a checkable behavior does not enter the rubric.

### 3-A. Access & process items (categorical / binary + timing)

| # | Item (scored about the FIRM) | Scale | Grounding |
|---|---|---|---|
| R1 | **Reached a human capable of intake** | live-human / IVR / answering-service / voicemail / unreached (categorical) | Clio 2024 secret shop: only **40%** answered at all (VERIFIED — §6) |
| R2 | **Captured the core facts** (who/what/when: collision type + date) | 0 = no / 1 = partial / 2 = full | basic intake competence; SPIN "Situation" |
| R3 | **Asked about treatment** ("have you seen a doctor / are you treating") | 0 = no / 1 = yes | the single most case-determining intake question; SPIN "Problem/Implication" |
| R4 | **Explained next steps** (what happens now + timeline + a named person/callback) | 0 = none / 1 = partial / 2 = full | Clio 2024: only **36%** explained the process / next steps (VERIFIED — §6) |
| R5 | **Offered a concrete follow-through** (booked callback or warm transfer to a decision-maker) | 0 = no / 1 = yes | speed-to-lead decay |
| R6 | **Callback actually occurred** to the study line within a fixed follow-window (1 business day), *if a message was taken* | 0 = no / 1 = yes / n-a | responsiveness measured, not asserted |

### 3-B. Conversation-behavior items (the framework-grounded proxies)

| # | Item (observable behavioral proxy) | Scale | Framework grounding |
|---|---|---|---|
| R7 | **Open questions asked** (questions that can't be answered yes/no) | tally: 0 / 1 / 2+ | MITI/OARS open-question count; SPIN sequencing |
| R8 | **Reflective statement offered** (intake worker restates/paraphrases the caller's concern at least once) | 0 = none / 1 = ≥1 | MITI/OARS "Reflections"; the countable core of active listening |
| R9 | **Empathic-opportunity response** — when the caller voices worry/ambivalence (decision point 3), the worker *acknowledges* it rather than ignoring/overriding | 0 = ignored/overridden / 1 = acknowledged / 2 = acknowledged + normalized | ECCS empathic-opportunity coding (Bylund/Makoul) |
| R10 | **Autonomy-supporting language** — respects "I'm not sure it's worth it" without pressure/guilt (no hard-sell, no fear close) | 0 = pressured / 1 = neutral-to-supportive | MITI autonomy-support; a *negative* behavior scored to avoid an all-positive rubric |
| R11 | **Orientation / psychological-first-aid move** — worker orients the caller to what to do next about their *safety/treatment* (e.g., "keep treating / document it"), not only about signing | 0 = no / 1 = yes | Hobfoll PFA (safety + orientation elements) |
| R12 | **Peak-end handling of the close** — the final ~20 seconds end on a clear, warm, concrete note (named next step + person), not a cold hang-up | 0 = cold/abrupt / 1 = clear-and-warm | peak-end rule (Kahneman); the close is the disproportionately remembered moment |

### 3-C. Spanish arm & professionalism

| # | Item | Scale | Grounding |
|---|---|---|---|
| R13 | **Spanish-capability handling** (Spanish arm only — §5) | competent-Spanish-intake / interpreter-offered / dead-ended-in-English (categorical) | B-002; Fricker testimonial injustice |
| R14 | **Professionalism / tone** (neutral coded observation, NOT a transcript) | ok / notable-negative | protocol §2, coded only |

**Timing metrics (recorded as numbers, not scored items):** rings-to-answer; hold time;
time-to-a-human-capable-of-intake; callback latency (feeds R6).

**Item count: 14 scored items (R1–R14) + 4 timing metrics.** R1–R6 = access/process;
R7–R12 = framework-grounded conversation behaviors; R13 = Spanish arm; R14 = professionalism.
**No verbatim quote is ever recorded** — the retained artifact is an evaluation, not a
surreptitious record (protocol §3; compliance §II). The rubric is itself a Yang-reviewed
deliverable (protocol G8), and R13's Spanish sub-protocol gets its own sign-off line (G7).

---

## 4. Confidence tiers + the published false-alarm rate

### 4.1 Tiered-confidence output language (BI-RADS / Clawson-MPDS style)

No probabilistic inference is dressed as certainty (compliance §IV; BI-RADS and Clawson MPDS
precedent already in the product's DNA). Each **market-level finding** (never a single firm — we
never publish a firm) is assigned a tier, and the tier is a **function of the instrument's own
measured operating characteristics** from calibration (§4.3):

- **Tier 1 — Reportable as a point estimate + confidence interval.** Item inter-rater κ ≥ 0.75
  **and** measured false-alarm rate ≤ 10% on the calibration set.
- **Tier 2 — Reportable as a directional range only** ("roughly X–Y%," never a single number).
  κ 0.60–0.75 **or** false-alarm 10–20%.
- **Tier 3 — Not reported as a number.** κ < 0.60 **or** false-alarm > 20%. Described
  qualitatively, or the item is **cut from the instrument before the wave.** An item we can't
  score reliably does not get a number — that discipline *is* the credibility.

The tier of every headline number is therefore **earned in calibration before fieldwork**, and
any item that can't clear Tier 2 is dropped, not fudged in the writeup.

### 4.2 Why the false-alarm rate cannot come from the field (and where it comes from)

The entire CIPA posture is **record nothing in the field** — so we cannot re-adjudicate the real
mystery-shop calls after the fact. The false-alarm rate therefore **cannot** be estimated from
field calls. It is estimated on a **separate calibration set where ground truth is known by
construction.** The CIPA posture actually *helps* here, via a clean two-track asymmetry Yang can
bless:

> **Field calls: record nothing** (no firm consent → §632/§632.7 avoided by capturing nothing).
> **Calibration calls: record everything** (both parties are our own staff → all-party consent
> is fully satisfied — the one situation where CIPA is clean). Yang confirms the two-track design
> (added to the protocol Q-list / G-list).

### 4.3 The calibration protocol (staged, recorded, ground-truth-by-construction)

**Signal-detection framing.** For each rubric item the instrument makes a call about whether a
behavior occurred. In a benchmark that *indicts a market*, the reputationally dangerous error is
the **false alarm** = scoring a firm "FAILED to do X" when it actually did X. That is the error a
market-shaming report is structurally tempted to tolerate, so it is the one we measure and publish
as the **floor of interpretation.**

- **False-alarm (false-positive) rate** = FP / (FP + TN) = P(scored "failed X" | truly did X)
- **Miss (false-negative) rate** = FN / (FN + TP) = P(scored "did X" | truly didn't) — this one
  *flatters* the market; published too, for symmetry.

Steps (all phone-free-buildable now except the recording session, which is internal staff under
all-party consent — no Yang fieldwork gate needed for the calibration track, only for the field
track):

1. **Build ~24–40 calibration calls** — role-played intake calls, two staff playing intake-worker
   and caller. The intake-worker script uses a **factorial / Latin-square design** so each rubric
   behavior (R2–R12) is *present* in a known subset and *absent* in a known subset → per-item,
   per-call ground truth is known exactly. **Include hard cases on purpose:** partial captures,
   ambiguous "sort-of" next-steps, a Spanish call with an English hold, code-switching.
2. **Record them** (all-party internal consent, §632-clean).
3. **Have the actual field shoppers score them LIVE** under the identical 4-minute, no-playback,
   memory-plus-notes conditions they will use in the field — so we measure the
   *instrument-as-actually-used*, including the shopper-memory limitation, not an idealized paper
   rubric scored off a transcript. (A false-alarm rate measured off a leisurely transcript read
   would understate real field error — this realism control is non-negotiable.)
4. **Multiple shoppers score the same calibration calls** → compute per-item **inter-rater
   reliability** (Cohen's κ for two raters, Fleiss' κ for more). This feeds the Tier gate (§4.1).
5. **Compute and publish**, per item and overall: false-alarm rate, miss rate, κ — each with a
   **Wilson-score 95% confidence interval** on the calibration n. Small-n honest: an n≈30
   calibration set yields **wide** CIs, and we report them wide rather than fake precision.

### 4.4 How it appears in the report (and the honest withholding posture)

Every headline finding is stated **against its own instrument's false-alarm floor**, e.g.:

> "X% of sampled firms scored as not asking about treatment (Tier 1; instrument false-alarm rate
> 6%, 95% CI 2–14% on 30 calibration calls)."

A reader can subtract our own error rate from our own claim. That sentence is the difference
between a vendor stat and a rating.

**The honest withholding posture (consistent with /honesty, compliance §VIII):** until the
calibration corpus is built, scored, and documented, **we publish no false-alarm number and no
finding** — not a placeholder, not a "we expect ~5%." The methodology page (buildable and
publishable now, once Yang and Ali approve *the page*) may describe *how* the number will be
computed; the number itself stays absent until the corpus exists. "We withhold the number until
the corpus is documented" is a feature, not an apology.

**Load-bearing limitations (stated, not buried — compliance §VIII):**
(a) Calibration actors running a script are a *proxy* for live firms; scripted behavior may be
easier or harder to score than the real thing — stated, and stress-tested by the deliberately
ambiguous factorial cases.
(b) The false-alarm rate is itself an estimate with a CI, not a constant.
(c) One-call-per-firm means R6 callback and any "the firm usually does better" variance is
unobserved — reported as a single-encounter snapshot, never a firm's steady-state quality.

---

## 5. The Spanish matched-pair arm (B-002) — paired-testing audit science

The Spanish finding is the highest-variance, most-defamable-if-wrong number in the enterprise
(outline §4). It gets the most rigorous design, borrowed from a 50-year, litigation-tested method.

### 5.1 Paired-testing (audit) design

This is the exact method HUD and fair-housing/employment enforcement have used since the 1970s to
measure differential treatment: send two testers who differ on **one** attribute and hold
everything else constant. Here:

- A subset of firms — those with **visible Spanish-media presence** (where competent Spanish
  intake is an expectation the **firm itself advertises**) — receive **both** an English-scenario
  call and a Spanish-scenario call.
- **Different days, different shopper voices, identical fixed fact pattern** (§2), matched
  emotional register.
- The measured quantity is the **within-firm differential** in rubric handling (R2–R12, and R13).
- **Pairing within firm** controls for firm-level quality and isolates the *language* effect — a
  far stronger claim than comparing Spanish-called firms to English-called firms across the
  sample. Power for this arm comes from the **number of matched pairs** (hence the Spanish-media
  oversample in §1.4), reported with its own, wider precision.

### 5.2 Why this is the defensible way to say a hard thing

"Firm-controlled differential treatment of an identical injury inquiry, by language" is a
construct courts and regulators already recognize from housing/employment audits — it converts the
Spanish finding from anecdote into **audit evidence.** Fricker's **testimonial injustice** (the
letter's coda) supplies the *why* — the Spanish-speaking caller absorbs a credibility deficit at
the moment of entrusting — and paired-testing supplies the *proof*.

### 5.3 The verified CA-Spanish context (primary sources; unverifiable figures labeled)

- **~88% of California superior-court interpretations are Spanish.** FY23–24: **635,060 Spanish
  interpreted events**; Spanish ≈ **88%** of all statewide courtroom interpretations (next:
  Mandarin, Vietnamese). Prior year 562,561 of 630,965 ≈ **89%**. **VERIFIED** — CA Judicial
  Council Language Access Services, *California Court Interpreter Workforce Study* (2025/2026) and
  *Spring 2024 Language Access Metrics Report* (languageaccess.courts.ca.gov). *Reading:* among
  Californians who need any court-language help, it is essentially all Spanish — the bilingual
  problem is really a Spanish problem.
- **45.3% of Californians speak a language other than English at home.** **VERIFIED** — U.S.
  Census Bureau **ACS 2024 1-year** (via Census Reporter, California profile). Spanish is the
  largest non-English group by a wide margin.
- **~28.8% of Californians speak Spanish at home.** **PARTIALLY VERIFIED / LABELED.** This exact
  figure traces to an **~2019 ACS vintage** (Census/Wikipedia "Spanish language in California");
  it is fully consistent with the current 45.3%-non-English envelope but the current-vintage
  Spanish-only line was **not** returned from the live S1601/B16001 pull. **Posture:** treat 28.8%
  as **verified-prior-ACS pending a one-table refresh**, not as fabricated, and **re-pull Census
  table S1601 (California, latest 1-year) for the exact current figure before it appears in any
  published sentence.** Do not publish 28.8% as a current number until refreshed. (Honest-labeling
  per compliance §VIII.)

**Supporting market anchors (from `spanish-first-intake-qa.md`, already sourced):** Spanish PI
cost-per-lead runs **40–60% below English**; **Los Defensores** has run the LA Spanish PI lead
market for **40 years** and was founded by an **LA court interpreter** — the Spanish-access market
was literally built by someone bridging testimonial injustice, and intake is where that bridge
collapses. Firms buy cheap Spanish demand, then the intake director often **cannot audit Spanish
calls at all** — Spanish QA coverage isn't degraded, it's **zero.**

### 5.4 Guardrails (non-negotiable)

Spanish shoppers are **our own scripted testers, never a real Spanish-speaking claimant**
(compliance §VI; protocol G7). Same no-record posture, **no lower bar.** The finding is
`[TO BE MEASURED]`; until measured it is **"forthcoming," never quoted** (outline §4). It ships
only with a confidence tier, a stated n (of matched pairs), and Yang's sign-off. A justice claim
with a shaky number is worse than no claim — and it would burn the moat, not build it.

---

## 6. The Yang-gate checklist — sign before ANY dialing

**Hard gate (compliance §II/§VII).** No call — English or Spanish, field or otherwise — is placed
until Roberta M. Yang (or a retained CA legal-ethics/privacy substitute) signs the go/no-go list
in `yang-cipa-632-mystery-shop-protocol.md` §11. This instrument does not authorize a single call.

### 6.1 What Yang must sign before any FIELD dialing (protocol §11 G1–G8, + two new items)

- [ ] **G1** — no-recording posture is legally sufficient to keep field calls outside §632/§632.7.
- [ ] **G2** — contemporaneous rubric note-taking (no verbatim quotes) creates no residual
  recording/eavesdropping exposure.
- [ ] **G3** — the fictional scripted-caller persona **and the "are you a tester?" candor rule**
  are approved as lawful and defensible (still genuinely unsettled — §2.4).
- [ ] **G4** — a single scripted shopper call does **not** implicate B&P §§6151–6152
  capping/running or SB 37's toughened anti-solicitation regime.
- [ ] **G5** — the pen-register / tracker posture for the study callback line **and** the
  `plaintiffops.com/benchmark` landing page is approved (§638.51; folds into B-005).
- [ ] **G6** — data-handling, retention, and the **aggregate-only, no-firm-named** publication
  rule are approved.
- [ ] **G7** — the **Spanish matched-pair arm** (§5) runs under the identical no-record posture
  and consent analysis — no lower bar.
- [ ] **G8** — the **final rubric + fixed scenario + hard-stop guardrails (this document)** are
  reviewed and approved.
- [ ] **G9 (NEW)** — the **two-track record/no-record calibration design** (§4.2–4.3): field =
  record nothing; calibration = all-party-internal-consent recorded. Yang confirms the asymmetry
  is clean.
- [ ] **G10 (NEW)** — the **Spanish paired-testing methodology** specifically (within-firm
  differential, matched voices/days) is approved as lawful and non-deceptive beyond G3.

### 6.2 What is SAFE to build/publish BEFORE Yang signs (Claude-safe, phone-free)

- The **sampling frame method** (§1) and the enumerated frame itself (public-directory data only).
- The **fixed scenario** and **rubric** (§2–§3) as design artifacts.
- The **tier scheme** (§4.1) and the **false-alarm methodology** (§4.2–4.4) as a written method.
- The **calibration corpus build + scoring** (§4.3) — internal staff, all-party consent, no field
  dialing, no Yang gate (only the *field* track is gated).
- The **pre-registration** document (frozen rubric + scales + tier cut-offs + false-alarm
  thresholds, dated).
- A **methodology page** describing *how* the study works and *how* the error rate will be
  computed — **staged for Ali + Yang approval before publishing**, and carrying **no numbers**
  (§4.4 withholding posture). Publishing the page still crosses a §VII gate (a human presses
  publish); building it does not.

### 6.3 What is NOT safe until AFTER the gates clear

- Any **dialing** (field or Spanish), any **finding**, any **false-alarm number**, any
  **firm-level** anything, and any **publication** of results.
- Naming the study "CIPA-compliant" or "Yang-approved" (protocol §7) before §11 is signed.

---

## 7. The single biggest methodological risk to defensibility

**The calibration-set proxy gap (§4.4 limitation (a)) is the biggest threat to defensibility.**
The published false-alarm rate — the crown jewel, the one number that separates this from a vendor
study — is measured on **scripted staff role-plays, not on live firms**, because the CIPA posture
forbids recording the real field calls. If a hostile reader can argue that scripted actors are
*systematically* easier (or harder) to score than real intake workers, they undercut the exact
number that certifies every other number. Mitigations are built in — the factorial design
deliberately seeds ambiguous/partial/code-switched hard cases, and scoring is done live under real
field conditions rather than off a transcript — but the gap is **structural, not fully closable**,
so it must be stated as a load-bearing limitation in the report's own words, never buried. Every
other risk (independence self-sabotage, a wrong Spanish number, the Yang bottleneck, geographic
mismatch) is real but has a cleaner structural fix (pre-registration, paired-testing + tiers,
phone-free build, metro pick). This one we can only *bound and disclose*, not eliminate — which is
precisely why disclosing it honestly is the defense.

---

### Compliance invariants checked on this instrument
- **§I** — no fee language; positioning is independent scorer / Analyst of Record.
- **§II** — all fieldwork gated on Yang's §632 sign-off; field calls record nothing; calibration
  calls recorded only under all-party internal consent; no live claimants; Spanish arm same bar.
- **§IV** — every field figure `[TO BE MEASURED]`; tiered confidence; false-alarm rate published;
  no guarantee; withholding posture until the corpus is documented.
- **§V** — "first independent" framed as a structural fact, not a superlative; Yang named as
  methodology reviewer, never endorser; no firm named or shamed.
- **§VI** — no claimant data; scripted testers only; thin data collection; retention per protocol.
- **§VII** — fieldwork and publication both behind human gates; every send/publish is Ali's.
- **§VIII** — the 28.8% vintage caveat, the calibration proxy gap (§7), the unsettled candor
  question, and the single-encounter snapshot limit are surfaced, not smoothed.

*End of staged instrument. Authorizes zero dialing, zero sends, zero publication. The instrument
is buildable phone-free today; the field wave waits on Yang's signature (§11 G1–G10) and the
founding cohort.*

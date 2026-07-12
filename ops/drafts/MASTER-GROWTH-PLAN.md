# MASTER GROWTH PLAN — Intake QA, post-beta (the single prioritized plan)  ·  2026-07-12

> **STATUS: STAGED SYNTHESIS. Nothing here is sent, posted, priced live, pushed, or auto-executed
> (compliance §VII).** This is the umbrella over the four objective-lead plans produced this cycle.
> It does not re-derive them; it welds them into one ordered plan, resolves where they compete for
> the same scarce hour, and routes every regulated item. `.claude/skills/compliance-invariants/SKILL.md`
> outranks this document; where anything here would touch a bright line, this document loses.
>
> **Consolidates:**
> - `ops/drafts/O2-gtm-plan.md` — demand generation (qualified conversations per founder-hour)
> - `ops/drafts/O3-conversion-plan.md` — the audit→pilot→paid funnel + CR-A/CR-B instrumentation
> - `ops/drafts/O4-product-plan.md` — retention (stick past week 3) + the outcome-labeled-corpus moat
> - `ops/drafts/O5-strategy-plan.md` — path-to-$1M, defensibility, the analyst-hour ceiling, capital
>
> **North Star (`ops/metrics.md`):** signed founding pilots → converted paying firms (target 3–5 cohort).
> Beta ships **Mon 2026-07-14**; this plan governs the weeks *after* it ships.

---

## 1. THE THROUGH-LINE (the coherent strategy in 5 sentences)

1. **One North Star, one binding constraint:** everything serves *signed founding pilots → converted
   paying firms*, and the wall in front of that is not market (2–3% penetration of ~800–1,500 CA
   PI firms buys $1M) and not price (Table C is settled) but **founder-hours-per-close** near-term,
   hardening into **attestation-bound Analyst-of-Record hours** as firms accumulate — the same scarce
   resource gates both the revenue ramp and the moat.
2. **The whole business turns on two numbers** the four plans independently converge on — **CR-A
   (audit→pilot, ~40%)** and **CR-B (pilot→paid, ~50%, the weakest assumption in the $1M model)** —
   so the first job post-beta is to *measure them from firm #1* instead of guessing, because a slip
   from 50%→33% on CR-B alone pushes $1M from 12 to ~18 months.
3. **The moat is two things welded together:** structural **independence** (we sell nothing
   downstream a score could flatter — the Moody's/J.D. Power lock the funded incumbents cannot copy
   without dismantling the products that pay their bills) and the **outcome-labeled corpus** (Day-0
   cited, typed, language-tagged intake facts joined to realized net fee) — the first is a *sentence*
   until the second is *time*, and the corpus clock only starts when the spine writes its first row.
4. **Two clocks are running against us at once:** the salience of "independent" is perishable
   (~6–12 months before a funded entrant claims the slot or the market's vocabulary hardens around
   "scoring = a feature of my stack"), while the attestation ceiling caps a *solo* desk at ~13–20
   firms — below $1M's ~28 — so the land-grab that earns the moat and the scarce hours that must earn
   it point in opposite directions.
5. **Therefore the plan is:** unblock pricing so CR-B becomes observable, instrument both decisive
   rates before firm #1, spend founder-hours only where trust is highest (warm intros over reach),
   ship the retention fixes and start the corpus *before Monday* because both are cheap and one is
   calendar-destroyable, and lay the independence authority stack now — bootstrapped, because the one
   decision that most reliably destroys the moat (venture capital's pull toward outcome-tied pricing)
   is the one that feels most like progress.

---

## 2. THE 30/60/90 SEQUENCE (ordered across all four objectives)

**Legend.** *Metric* = the `ops/metrics.md` line it moves. *ICE* = Impact×Confidence×Ease (product
items carry the O4 board score; non-product items carry a synthesis ICE, labeled ~). *Gate:*
**Claude** = builder/agent ships autonomously (backend/internal/dark, no send, no public claim);
**Ali** = crosses a §VII human gate (send/post/merge/price/public claim); **Yang** = novel in a
regulated area, routes to the named methodology reviewer first.

### DAYS 0–30 — beta weeks 1–4 (7/14–8/11): unblock, instrument, book the cohort, protect week 3

| # | Move | Objective | Metric | ICE | Gate |
|---|---|---|---|---|---|
| 1 | **Lock Table C into §I + a dated decisions entry the same day** (list $2,500/$5,000; founding $1,500×12mo). The master unblock — until it lands CR-B is unmeasurable and the Charter can't go live. | O3/O5 | Pilots converted to paid (unblocks measurement) | ~810 | **Ali** |
| 2 | **Ship D-021 next-action sort + D-023 digest recognition + spine row 0 (branch rehab) — before Monday.** Pure-fn / no-migration; fixes the invisible week-3 queue inversion and de-risks the flywheel-merge rescue-revert. | O4 | (retention: desk daily-active through week 3) | 576 / 448 / 378 | **Claude** |
| 3 | **Build the CR-A/CR-B funnel instrumentation in `/studio`** — derive both ratios from rows that already exist + a one-line "audit delivered"/"converted" founder mark; weekly write to `ops/metrics.md`. Internal, no send. | O3 | Leak Audits delivered; Pilots sent/signed; Pilots→paid | ~640 | **Claude** |
| 4 | **Convert the LACBA member from listserv-blast to 2–3 named warm intros** (the single highest-value founder-hour of the week — §3, move 4). Re-heads `lacba-beta-post.md` with the no-listserv ruling. | O2 | Qualified firm conversations booked | ~700 | **Ali** |
| 5 | **Fire the warm/1:1 engine:** 5-name intro list + 3 personalized asks; 3-touch autopsy sequence on the first 5 Dream-12 firms under a CAALA-affiliate warm frame; mail 12 Dream-12 primers; join CAALA ($400). | O2 | Qualified conversations booked; Dream mailers sent | ~560 | **Ali** |
| 6 | **First migration window:** spine row 1 (`question_checks` answer-value spine) + spine row 3 (disposition snapshot at the desk chokepoint) + D-022 "not today" defer. Dark, sibling-only, no freeze lift. | O4 | (moat: first corpus rows on week-1 calls) | 504 / 384 / 378 | **Claude** |
| 7 | **Run the 10-Call Autopsy on every booked conversation** (§632 consent gate → NDA → live founder readout on THEIR calls → ranges-only ROI). Log demo outcome `wow_landed\|clean_call\|false_alarm` as the CR-A leading indicator. | O3 | Leak Audits delivered; CR-A | ~540 | **Ali** |
| 8 | **Fix clio.mjs static-token silent-401** before any firm connects (same failure class as the CallRail 401). | O4 | (activation reliability) | eng | **Claude** |
| 9 | **Light the authority engine (books nothing this week, must start now):** after Yang's read, publish the five-questions piece as a LinkedIn carousel; send the Advocate pitch; **begin the phone-free benchmark instrument build** (sampling frame, rubric, tiers, false-alarm methodology — no dialing, no Yang-fieldwork gate). | O2/O5 | LinkedIn reach; newsletter subs; Benchmark in dev | ~450 | **Ali** (post-Yang read) |
| 10 | **Retention/copy pre-Monday:** set `DATA_RETENTION_DAYS=90`, delete stale `.env.local`=30; soften "immediately"→"promptly, by hand"; honor the "NDA within one business day" promise with a Yang-cleared PDF path. | O3 | (trust: removes silent CR-A killer) | ~350 | **Ali** (+Yang on NDA) |

### DAYS 31–60 (8/11–9/10): convert autopsies to paid; corpus clock running; authority compounding

| # | Move | Objective | Metric | ICE | Gate |
|---|---|---|---|---|---|
| 11 | **Close the founding cohort on the fixed-window free-month → Charter cliff** with a **commitment device on the pilot** (written success criteria + pre-agreed conversion date — structured pilots convert ~3.2× open-ended, the cheapest defense of the ~12-mo timeline). | O3/O5 | Founding pilots signed → converted to paid; **CR-B** | ~600 | **Ali** |
| 12 | **Spine row 2 — the QA extraction writer (starts the corpus clock) + spine row 4 reconciliation + D-024 worked-to-zero.** Row 2 is the one item on the whole board a calendar can destroy — every un-instrumented beta call is a lost training example. | O4 | (moat: features, not just labels, accruing) | 315 / 315 / 336 | **Claude** |
| 13 | **Refill top-of-funnel from the 1:1 engine** as warm intros thin (next Dream-12 ring; every touch now cites "fellow CAALA affiliate" + early carousel traction). | O2 | Qualified conversations booked | ~420 | **Ali** |
| 14 | **Publish 1 carousel / short newsletter every ~2 weeks** on the develop-queue + Spanish-gap thesis (no unverified stat, §IV); produce the first 2 permissioned de-identified Almost-Lost case studies from cohort autopsies. | O2 | LinkedIn reach; newsletter subs; proof assets | ~360 | **Ali** |
| 15 | **Engine-v2 Phase 0 merge-inactive** (stop v2 drift; flag default off; test proves no `web/` import) **+ Phase A dark delta log** *iff* the beta data-use basis clears Yang and transcripts are de-identified. | O4 | (week-2+ ammunition, not launch) | — | **Ali** / **Yang** |
| 16 | **Ship the minimal published-methodology + false-alarm-rate page + signed attestation with the FIRST paying firm** (not "later"). Seed the CIPA-safe benchmark from consented paying-firm autopsy data. | O5 | Benchmark report; authority-asset reach | ~500 | **Ali** (+Yang on protocol) |

### DAYS 61–90 (9/10–10/12): prove a repeatable source beyond warm supply; seed the moat; watch the clock

| # | Move | Objective | Metric | ICE | Gate |
|---|---|---|---|---|---|
| 17 | **Advocate/Forum byline live + first podcast guesting** on the Spanish-intake-justice angle (now there's a number to be interviewed about). | O2 | Authority reach → inbound qualified conversations | ~300 | **Ali** |
| 18 | **Review the two decisive rates against real cohort data**; if CR-B is tracking ~33% not ~50%, tighten the commitment device / re-sequence — never cut price (§I) and never add outcome-tied terms. | O3/O5 | CR-A, CR-B (model correction) | ~500 | **Claude** (analysis) |
| 19 | **Pre-commit the Analyst-#2 trigger at firm ~12–15** (funded from cash flow; calibration/inter-rater protocol written *first* so the 2nd signature strengthens the methodology story). | O5 | (ceiling-break; moat-positive) | ~450 | **Ali** |
| 20 | **Open the Clio App Directory listing pipeline** (weeks-long lead time; certification is install-base-gated) + first published benchmark dataset from the consented paying-firm corpus; scope the Yang-gated mystery-shop cross-check (Spanish matched-pair arm). | O4/O5 | Distribution channel live; Benchmark report | ~320 | **Ali** / **Yang** |
| 21 | **Spine row 5 — retrodiction bulk import at onboarding** (12–24 months of closed cases → instant day-one backtest), enabled per firm after NDA. | O4 | (activation wow + corpus backfill) | 270 | **Ali (NDA)** |

**Never, any week:** the LACBA/bar listserv post (commercial content the guidelines bar — convert to
intros instead); blast SMS/autodial (§III); any dollar figure in any asset before §I is locked; any
outcome-tied / per-signed / usage pricing term (§I bright line + SB 37 exposure).

---

## 3. THE 5 HIGHEST-LEVERAGE MOVES (most-leveraged first)

**1 — Ali locks Table C into §I today (the master unblock).** *Why:* it is the cheapest act in the
entire plan (a decision + two paragraphs) and it unblocks the most. Until it lands, **CR-B is
literally un-observable** — you cannot test a paid conversion with no price — the Charter offer cannot
go live, the demo's pricing beat stays provisional, and three staged docs keep contradicting each
other (the §I $2,500/$5,000 vs GTM $1,000/$1,500/$3,000 vs the 7/09 $1,500/$2,500/$5,000 split,
`decisions.md:211`). Every downstream artifact inherits whichever table its author happened to read.
One decision converts a systemic ambiguity into a settled foundation. It routes to Yang for the exact
§I replacement text + the MOU "12-month lock" sentence, but the *choice* is Ali's and it gates
everything.

**2 — Build the CR-A/CR-B funnel instrumentation before firm #1 (Claude-ready).** *Why:* the whole
business turns on two numbers, and today they are blank and hand-counted. This is the single
highest-leverage *build* in the plan because without it we scale outreach on top of assumed rates and
learn the truth only after several audits have burned founder-hours. It is pure internal telemetry —
no send, no public claim, derivable from rows that already exist (`welcome_emails`, `calls`, beta
feedback + a one-line founder mark) — so a builder ships it autonomously this week. Measuring beats
guessing precisely where a 50%→33% error costs six months.

**3 — Ship D-021 + start the corpus spine (rows 0→1→2) before Monday (Claude-ready).** *Why:* two
different jobs meet in the same pre-Monday window. D-021 (ICE 576, highest on the board) fixes the
**invisible, self-camouflaging week-3 queue inversion** — Session 7 killed the terminal-card
graveyard, so the desk feels great in week 1 and quietly buries fresh high-value callers under
half-worked cases exactly when the pilot-to-paid decision forms, and the unit test currently asserts
the *buggy* sort as if it were a guardrail. The spine rows are the **only items a calendar can
destroy**: every beta call scored without a `question_checks` row is a training example gone forever,
and the corpus *is* the moat's time-based half. D-021 for impact-per-hour, the spine because it cannot
be recovered later.

**4 — Convert the LACBA member from a 4,000-reach listserv blast into 2–3 named warm intros.** *Why:*
this is the highest-value single founder-hour of beta week 1. At a 3–5-firm target the constraint is
hours, not reach: a worked warm intro converts ~30–50%, a listserv post converts **~0 compliantly**
because the compliant action is *not to post* (LACBA guidelines bar commercial content; a
beta-recruitment post for a paid product is commercial even while free; handing him drafted copy is
the proxy dodge already rejected). The reply — *"the biggest help would be a warm intro to 2–3 firms
you think actually have this problem"* — re-points the best relationship of the week from a channel
that can only hurt us to one that can only help.

**5 — Put a commitment device on the free pilot AND stand up the independence authority stack with
firm #1.** *Why:* this is the one move that attacks *both* clocks at once. The commitment device
(written success criteria + pre-agreed conversion date) is the cheapest way to pull realized CR-B from
the free-beta ~25–40% band back toward the ~50% the 12-month timeline needs — structured pilots
convert ~3.2× open-ended ones, so the *same free audit* yields 1.5–3× the closes with no price cut and
no §I risk. Shipping the published-methodology + false-alarm-rate + signed-attestation stack *with the
first paying firm* (not "later") is the only bet with a hard external deadline set by an actor we don't
control — it converts the perishable word "independent" into an owned, credentialed position before
someone with $150M does. One protects the ramp; the other protects the moat; both are cheap now and
expensive-to-impossible later.

---

## 4. EVERY YANG-GATED ITEM (the regulated-area decisions, one list)

Yang = named methodology reviewer (warm pass). Items marked **‡** need a *retained* review, not a warm
pass, per the operating protocol.

1. **§I fee-structure edit + founding-MOU "12-month lock" sentence** — the exact §I replacement text
   for Table C is novel-in-regulated-area (O3 G2; O5). *Gates the entire pricing unblock's language.*
2. **The regulatory-clearance memo (B-005) for signature** — AB 931 pinpoint citations + which prong
   the flat-fee carve-out modifies; Rule 7.3(f)/Comment [5] (reported effective 2026-06-01); the
   load-bearing §§6151–6152 two-reason argument; the four claim-bearing `/compliance` quotes (SB 37
   damages band, §6153 penalty, §632 figures, TCPA passage); the add-or-omit-AB-931 decision; the
   first-party email open-pixel characterization (§638.51). *Until signed, no public AB 931 / SB 37
   compliance claim beyond the live flat-fee framing.* (O5 §7.1)
3. **Guarantee construction menu** — decouple: unconditional first-month refund as the *stated*
   guarantee + demote "$25k" to a per-firm audit *finding*, never a promised threshold (§IV / SB 37
   "misleading guarantee" / FTC §5 / §17500). 3-option menu drafted in `offer-architecture.md §7`. (O3 G3)
4. **NDA / DPA / BAA / MOU packet as one review** — strike the NDA §4(c) "zero-retention" overclaim;
   rule on the BAA-instrument question; the DPA is currently only a noindex web page, not a signable
   document (the load-bearing trust gap). (O3 G4)
5. **The consent-attestation rider + the live tier/estimate autopsy talk track** before first live use
   (§632 / §IV). (O2 §7)
6. **Any competitive/comparative language migrating into prospect-facing copy** — structural framing
   is fine; the moment a structural sentence becomes a sales line it re-enters the gate (§V/§VII). (O5 §7.2)
7. **The CIPA-safe benchmark protocol — signed BEFORE any mystery-shop dialing** (§II/§VII); plus the
   two-track calibration + Spanish matched-pair design. The `/letter` published-error-rate promise
   stays aspirational until the Calibration page carries a current number. (O2 §7; O5 §7.3)
8. **Two engine-v2 data gates that taint the whole v2 evidence base if skipped:** (a) the beta
   data-use basis must cover internal derived analysis before v2 runs dark on any real call
   (else de-identified-only); (b) raw beta transcripts cannot go to outside attorney-labelers — Rule
   1.6/1.18, de-identify first. (O4 §7.4)
9. **Lead Docket direct enablement** — it re-engages the firm's own dead leads, the softest surface
   against AB 931 / §§6151–6152 / SB 37; the `LEAD_DOCKET_LIVE` env switch is *not* the gate — **‡
   retained** clearance is (decisions.md 2026-07-07). (O4 §3b)
10. **‡ Lifting the SMS / re-engagement gate** — stays behind its separate retained-review gate; beta
    ships staff-callback only, texting dark. (O5 §7.5)
11. **‡ Any outcome-linked pricing, ever** — §I bright line + SB 37 exposure; the frozen Intake Closer
    per-signed-case mode contradicts the "never outcome-tied" promise (one must be killed). (O5 §7.6)
12. **The Independence Covenant legal form** — if any outside money is ever taken (§VII / §I novelty). (O5 §7.7)
13. **Clio App Directory "Certified" badge copy** when it exists — a new public claim (Ali + Yang). (O4 §3b)

**Not-Yang but gating (Ali):** the three-way pricing split is **BLOCKED ON ALI** — no dollar to any
prospect until §I is locked in writing (which also keeps us clear of any SB 37 "misleading guarantee"
surface during the gap).

---

## 5. PROPOSED `ops/backlog.md` RE-SEQUENCE + NEW ICE ITEMS

The current backlog predates the four objective plans and the beta build. It still leads with B-007…
B-013 as if unbuilt (B-010/011/013 shipped in Session 7; B-012 is half-done). Proposed re-sequence
(**staged — do not edit the live backlog in this task**), newest priority logic = *unblock → measure →
retain+corpus (calendar-bound) → acquire → defend*:

**Proposed new priority order:**

1. **B-021 (NEW)** — Lock Table C into §I [Ali; the master unblock]  ·  ICE ~9×10×9 = **810**
2. **B-022 (NEW)** — CR-A/CR-B funnel instrumentation in `/studio` [Claude]  ·  ICE ~8×8×10 = **640**
3. **D-021** — Next-action sort (fixes the invisible week-3 inversion) [Claude]  ·  ICE 8×9×8 = **576**
4. **B-016 / spine rows 0–2** — outcome siblings + `question_checks` answer-value spine + QA writer
   (the calendar-destroyable corpus start) [Claude]  ·  ICE (row 1) 504, (rows 2/4) 315
5. **B-023 (NEW)** — Convert the LACBA member to 2–3 warm intros + re-head `lacba-beta-post.md`
   no-listserv [Ali]  ·  ICE ~9×8×10 = **720** (single-hour move)
6. **B-024 (NEW)** — Pilot commitment device (written success criteria + pre-agreed conversion date)
   to lift realized CR-B toward 50% [Ali]  ·  ICE ~9×7×8 = **504**
7. **B-025 (NEW)** — Independence authority stack v0 (published methodology + false-alarm-rate page +
   signed attestation) shipped WITH firm #1 [Ali/Yang]  ·  ICE ~9×7×6 = **378**
8. **D-023** finish B-012 in the digest [Claude] 448  ·  **D-022** defer state 378  ·  **D-024** worked-to-zero 336
9. **B-005** (315) — regulatory-clearance memo → Yang (gates all AB 931 / SB 37 public claims)
10. **B-026 (NEW)** — Pre-commit Analyst-#2 trigger at firm ~12–15 + inter-rater calibration protocol
    written first [Ali]  ·  ICE ~7×7×6 = **294**
11. **B-006 → B-001 → B-002** — CIPA-safe benchmark instrument build now (phone-free), fieldwork
    Yang-gated; report; Spanish-gap PR (seed from consented paying-firm data)
12. **B-019** — Supio/EvenUp quarterly tripwire monitor, **+ add tripwire #8: an independent/neutral-
    scorer entrant** (the cheapest thing to be blindsided by) [Claude, 30 min/quarter]
13. **B-018** language-tag every call + per-language capture telemetry (beta test #4)  ·  B-017 dark QA pass
14. **B-020** LACBA five-questions piece → LinkedIn carousel (post-Yang, Ali posts — NOT listserv)
15. Standing/back: B-014 fee-number unify, B-015 Readout release gate, B-003 LiveCoach, B-004 self-improving meta

**Kill / retire:** the stale "REVENUE-FIRST 2026-07-07" header numbering (B-007/B-008/B-009 are folded
into the live autopsy + Charter, now shipped as product + O3's funnel); the Dream-25 framing (Dream-12
is the operative ring); any NorCal-only geography label (LA-first/CA-statewide per the live LACBA beta).

### Proposed dated `ops/decisions.md` entry (STAGED — do NOT append live; Ali/agent places after review)

```
## 2026-07-12 — MASTER growth plan: one prioritized post-beta plan across GTM/Conversion/Product/Strategy  ·  agent: master-synthesis lead · lane: all
- **Change (STAGED):** Consolidated the four objective-lead plans (O2 GTM, O3 conversion, O4
  product/moat, O5 strategy) into ops/drafts/MASTER-GROWTH-PLAN.md — one 30/60/90 sequence, one
  through-line, one Yang-gate list, one backlog re-sequence. Through-line: North Star = signed
  founding pilots → paid; binding constraint = founder-hours-per-close hardening into
  attestation-bound Analyst-of-Record hours; moat = independence (Moody's/J.D. Power lock) welded to
  the outcome-labeled corpus (which accrues only with calendar time). The plan orders every move as
  unblock → measure → retain+corpus → acquire → defend.
- **Five highest-leverage moves (most-leveraged first):** (1) Ali locks Table C into §I today — the
  master unblock; until it lands CR-B is un-observable and the Charter can't go live. (2) Build the
  CR-A/CR-B funnel instrumentation in /studio before firm #1 [Claude] — the two numbers the $1M model
  turns on, measured not guessed. (3) Ship D-021 next-action sort (fixes the invisible week-3 queue
  inversion) + start the corpus spine rows 0→1→2 before Monday [Claude] — the spine is the only
  calendar-destroyable asset on the board. (4) Convert the LACBA member from a listserv blast (~0
  compliant conversion) to 2–3 warm intros (~30–50%) — highest-value founder-hour of beta week 1.
  (5) Commitment device on the free pilot (structured pilots convert ~3.2×, protects the ~12mo
  timeline) + ship the independence authority stack with firm #1 (the only bet on an external deadline).
- **Hypothesis:** the two conversions ops/insights.md B2 says decide the $1M model (CR-A audit→pilot
  ~40%, CR-B pilot→paid ~50% weakest) are won by the live-autopsy demo + a Charter/commitment-device/
  recovered-fee-proof close; measured from firm #1 they replace assumed rates with owned data before
  outreach scales. The moat is earned on a ~6–12mo salience clock the attestation ceiling can outrun,
  so authority-first sequencing + a pre-committed 2nd AoR + bootstrapping are the defense.
- **Biggest existential risk:** the salience clock (~6–12mo to own "independent") and the attestation
  ceiling (~13–20 solo firms < $1M's ~28), compounded by below-benchmark free-pilot conversion,
  collide invisibly — arriving structurally unique but commercially worthless. Cheapest de-risk this
  quarter: the pilot commitment device + the minimal published-methodology/false-alarm/attestation
  page + tripwire #8, all cheap and mostly Claude-ready; revisit if authority assets fail to earn
  first meetings by ~month 4 (only defensible flip = covenant-bound raise for AUTHORITY, never pricing).
- **Gates (§VII):** SHIP-ON-MERGE [Claude] — CR-A/CR-B instrumentation, D-021/022/023/024, spine
  rows 0–4, clio refresh-token fix, tripwire monitor, language telemetry. NEEDS-DECISION — Table C
  lock + all sends/posts/merges/public claims (Ali); §I edit, B-005 memo, guarantee menu, contracts
  packet, consent rider, benchmark protocol, Lead Docket, engine-v2 data gates, Independence Covenant
  (Yang; ‡ re-engagement + outcome-pricing = RETAINED). Nothing published, sent, priced live, or pushed.
- **Review date:** 2026-08-11 (end of beta week 4 — ≥3 qualified conversations, ≥1 signed pilot, CR-A/
  CR-B instrumented and reading); strategy review at 5 completed audits / firm #6.
- **Result:** (filled at review)
```

---

## 6. THE ONE BIGGEST EXISTENTIAL RISK + the cheapest de-risk this quarter

**The risk (O5's, sharpened by the other three plans): the two clocks collide, and the collision is
invisible until it is fatal.** The moat's salience is perishable — ~6–12 months to own "independent"
before a funded entrant claims the slot (tripwire #8, currently unwatched) or the market's vocabulary
hardens around "scoring is just a feature of the tool I already use." But the moat *is* the throughput
bottleneck: the signed, staked attestation that makes it uncopyable (a named human personally stakes
credibility — Austin's speech-act) is exactly what caps a *solo* Analyst of Record at ~13–20 firms,
below $1M's ~28. And the free, open-ended beta plausibly converts at ~25–40%, not the 50% the model
assumes, stretching the ramp to ~18–24 months. **These compound in one direction:** the land-grab
demands you accumulate published authority and paying-firm proof *fast*, while the attestation ceiling
plus below-benchmark conversion physically throttle how fast you can — and the shortfall won't show in
the data until several audits have already run. The failure mode is not bankruptcy; it is arriving at
month 12–18 **structurally unique but commercially worthless** — a feature company competing on price
against firms that raised $150M and $103M this year, because the "independent" slot got claimed first
or never became salient.

**Why the other three plans each feed this same risk:** O2's near-term engine is supply-capped
(warm intros exhaust in ~2–3 weeks) so the scalable authority channels *must* be lit now or the funnel
stalls in month 2–3; O3's CR-B is both the weakest model assumption *and* un-observable until pricing
unblocks, so you can be off by six months and not know it; O4's corpus accrues only with calendar time,
so a slow start is permanently unrecoverable. Every plan's worst case is a *silent* one that surfaces
too late.

**The cheapest de-risk this quarter — buy visibility and durability before you buy scale:**

1. **Instrument CR-A and CR-B from firm #1** (§2 move 3; Claude-ready) — the single cheapest act that
   converts the *invisible* failure into a *visible* one. If CR-B is trending ~33%, you learn it in
   week 5, not month 12.
2. **Put the commitment device on the free pilot** (§2 move 11; a copy change + a date, Ali-gated) —
   the cheapest lever that lifts realized CR-B toward 50% without a price cut or any §I/SB 37 exposure.
3. **Ship the minimal independence authority stack now** — a published-methodology + false-alarm-rate
   page + signed attestation, and *begin the phone-free benchmark instrument build this week* (no
   dialing, no Yang-fieldwork gate, no hours-drain). This is the cheapest way to start earning the
   perishable position while the founder-hours still exist to earn it.
4. **Add tripwire #8 (an independent/neutral-scorer entrant) to the quarterly monitor** — 30 minutes a
   quarter to not be blindsided by the one competitor move that would end the land-grab.

The through-line of the de-risk is the through-line of the whole plan: **the moat is real but earned
on a deadline, and the scarce resource that earns it (the named analyst's staked hours) is the
resource the deadline can outrun — so spend this quarter making the earning *visible and durable*
before spending next quarter making it *fast*.** If the authority assets have not earned first meetings
by ~month 4, this risk is materializing and the plan must be revisited; the only defensible flip is a
covenant-bound raise for *authority-building*, never outcome-tied pricing.

---

## 7. Cross-cutting gates before ANYTHING moves (inherited, do not skip)

1. **§VII human chokepoint:** Ali is the only human who sends, mails, posts, prices, or pushes. No agent, tool, or schedule.
2. **Pricing gate:** no dollar figure in any asset until Ali locks Table C into §I (BLOCKED ON ALI). Assets are send-safe today only because they quote none.
3. **Real CAN-SPAM postal address** live before any email; **live calibration/error-rate page** before any asset points a partner at it (§IV).
4. **Deliverability pre-flight:** SPF/DKIM/DMARC; true 1:1 by hand; low-and-slow; no blast/automation (§III).
5. **Offer-name + geography reconciliation:** public site/hosted letter still say "Leak Audit / five founding firms / Orange County"; this plan says "10-Call Autopsy / Dream-12 / LA-first CA-statewide." Reconcile before a diligent partner reads both.
6. **§632 consent gate** satisfied per firm before any autopsy on real calls; benchmark stays "forthcoming" until Yang signs the §632 protocol.
7. **The two supreme freezes** (`scoring/` + `system-prompt.md` untouched; `ScoredCall` extended only by call_id-keyed siblings) hold across every product item; v1 path runs byte-for-byte.
8. **Do NOT** edit `compliance-invariants/SKILL.md`, `decisions.md`, `metrics.md`, `backlog.md`, any contract, or any web copy in this task. Everything above is staged.

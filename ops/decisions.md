# Decision Log

> The system's memory. Every material change gets an entry so we never re-litigate a settled
> call and can always ask "did that work?" at the review date. Newest on top.

## Format

```
## YYYY-MM-DD — [decision title]  ·  agent: [which] · lane: [which]
- **Change:** what was proposed/staged/shipped.
- **Hypothesis:** why we believed it would help (link the insight/backlog ref).
- **Expected effect:** which metric should move, by roughly how much, by when.
- **Status:** staged-for-approval | shipped | reverted
- **Review date:** YYYY-MM-DD
- **Result:** (filled at review) moved / flat / worse → keep | iterate | revert
```

## Standing prior decisions (locked; do not re-open without new evidence)

- **Flat monthly pricing, never outcome-tied** (Rule 5.4 / B&P §§6151–6152 / SB 37). Core ~$2,500,
  Pro ~$5,000. A per-case pricing defect was found live and corrected — it must never return.
- **Positioning: independent recovery desk / independent scorer**, Ali as "Analyst of Record,"
  not a fee participant.
- **Wedge: free Leak Audit** leads every outreach.
- **Owned newsletter + LinkedIn are the primary distribution rails**; Dream 25 dimensional mailer
  replaced the 150-firm generic blast.
- **Yang = backstage compliance reviewer / named methodology endorser**, not outcome endorser.
- **Citation guard: "no citation, no claim"**; deletion cascade; published false-alarm rate.
- **Manifesto "The Unscored Conversation"** hosted at plaintiffops.com/letter with signed
  attestation block.

---

## 2026-07-07 — Full-product improvement sweep: reconcile + P0 fixes + conversion + deliverables (PR #3)  ·  agent: orchestrator · lane: all

- **Change:** Six deep-research audits (offer strategy, operations, copy/conversion, backend, LiveCoach,
  deliverables) → one build+test-verified release on PR #3 (`offer/charter-and-checkout`, 215/215 tests):
  1. **Reconciled the offer story sitewide** to one narrative (free Leak Audit = 10 of your own calls →
     Founding-5 Charter $1,500→$2,500 → flat monthly); "Intake Quality Audit"→"Leak Audit" everywhere.
  2. **Wave 1 P0 backend/compliance:** wired the DEAD scoring trigger (CallRail calls were never scored —
     product inert on real data); LiveCoach §632 consent gate + Pro-gate + demo label; enforced retention
     (matches the DPA); Stripe idempotency + fail-closed + portal 401; RLS for recovery-desk tables;
     per-call error isolation; CallRail Zod/E.164; deleted 59 `* 2.*` duplicates.
  3. **Wave 2 make-the-buy-obvious:** two-path CTA everywhere; Charter as single dominant buy; outcome
     hero; forward scarcity; FAQ objection; role-based trust lines (no named reviewer per §V).
  4. **Wave 3 deliverables:** unified the three contradicting sample figures into one source; real
     citations + fee ranges + published error-rate footer on the shipping report; confidence chips;
     structured transcript excerpt; dated action box.
- **Hypothesis:** these remove the reasons the funnel leaks at every stage — the product now actually
  works on real calls, the buy is obvious, the deliverable is McKinsey-grade and internally consistent,
  and the compliance code matches the compliance copy.
- **Expected effect:** unblocks real revenue (scoring works, checkout provisions, buy is findable);
  removes legal exposure (consent gate, retention, RLS, fail-closed).
- **Status:** staged in PR #3 (public + pricing → Ali merges = approval). Build + 215 tests green.
- **Review date:** 2026-08-06.
- **Result:** —
- **Open items needing Ali (in PR #3 body):** connect Stripe + run migrations 0019–0021; confirm CallRail's
  real webhook signature; approve a font package (PDFs still on system fonts); attorney-bless MSA/DPA;
  close the citation seam (audit result discards per-quote timing → few live citations today).
- **Operator kit staged:** `ops/drafts/outreach-operator-setup.md` (affiliate-membership email, SPF/DKIM/
  DMARC setup, daily how-to-run) — for Ali, pairs with `zero-budget-outreach-kit.md`.

## 2026-07-07 — Physical mailer retired → zero-budget outreach motion (plan of record)  ·  agent: orchestrator · lane: outreach

- **Change:** Founder has ~$0 outreach budget, so the physical Dream-25 mailer (its "strongest asset") is
  DEAD. Two deep-research passes replace it with a free, human, 1:1 motion, staged in
  `ops/drafts/zero-budget-outreach-kit.md`. Spine: (1) **join ONE trial-lawyer association** (SCCTLA /
  Capitol City / SFTLA) so all outreach goes out as "fellow member" — warm converts 10–20× cold; (2) the
  father's network for warm intros; (3) a 5-touch, 14-day, hand-sent sequence per firm (LinkedIn connect →
  email w/ public-signal open → value DM → one manual call → break-up); (4) the **public-signal cold-open**
  ("I looked at your public intake and noticed X" — public/automated signals only, records nothing,
  CIPA-safe); (5) podcasts/earned media on the Spanish-intake-justice angle for authority.
- **Hypothesis:** for a solo, hours-constrained founder, trust (warmth + hyper-personalization) beats
  send-volume; ~5 firms worked deeply/week at the funnel's ~8% touch→qualified yields the first 3–5
  meetings in 4–6 weeks. Volume-grinding is the trap (can't out-send a 2% cold rate, and blast violates §III).
- **Expected effect:** first qualified conversations without spending a dollar; every touch rides the
  independent-scorer + Spanish-gap moats.
- **Status:** kit staged for Ali (outbound → he sends; §III/§VII human-send chokepoint). Pre-flight: real
  CAN-SPAM address, a live Calibration page, SPF/DKIM/DMARC, and per-firm recon before Touch 1.
- **Review date:** 2026-08-06.
- **Result:** —
- **Flag:** offer-name inconsistency — hosted letter/site still say "30-day Leak Audit / five founding
  firms"; the kit + Charter use "10-Call Autopsy." Reconcile the public copy before sending.

## 2026-07-07 — Offer decided + click-to-buy checkout built (staged, PR #3)  ·  agent: orchestrator · lane: product+website

- **Change:** Two deep-research passes (offer-decision memo + operational blueprint) locked the offer and
  the sign-to-pay flow. Built and staged in PR #3 (`offer/charter-and-checkout`), all TEST_MODE-safe:
  - **Offer:** free 10-Call Autopsy gated behind a booked decision-maker readout; **Charter $1,500/mo for
    90 days → $2,500 Core**, "Founding 5" hard cap, closes at 5th firm or Aug 31 2026; month-to-month,
    auto-renew, 30-day cancel, rate locked for life of subscription. Tiers **Core $2,500 / Pro $5,000**
    (Pro's recovery workflow gated/roadmap, not sold live). **$25k find-it-free guarantee** kept
    (value-found, first-month-free).
  - **PRICING CORRECTION:** replaced the live $500/$900/$1,500 tiers with $2,500/$5,000. At $500 the $1M
    math needs 55–165 firms vs 24 — flagged to Ali; the 5x correction is the single most important move.
  - **Checkout plumbing:** added the missing `POST /api/webhooks/stripe` (payment → provision firm +
    billing + Supabase auth + magic-link + Resend welcome), `POST /api/checkout` (subscription mode,
    in-checkout terms, auto tax, card + ACH), `/welcome`, Customer Portal (self-serve cancel), guarantee
    balance-credit refund, failed-payment → paused.
  - **Logistics closed:** required CIPA consent checkbox on audit upload; draft `/dpa` + `/msa` (marked
    pending attorney review) with real subprocessor list + actual (non-overclaimed) deletion behavior.
- **Hypothesis:** a two-click charge-on-click flow + the corrected price maximize audit→paid and make
  first revenue collectible the moment a firm says yes.
- **Expected effect:** removes the operational blocker to first revenue; corrects the pricing that made
  $1M unreachable.
- **Status:** staged in PR #3 (public + pricing → Ali merges = approval). Build green, 190/190 tests pass.
  Human setup required before real money: Stripe account/keys/products, enable Tax+Portal+Smart Retries,
  register webhook, run migration 0019, attorney bless MSA/DPA, W-9, `npm i stripe`.
- **Review date:** 2026-08-06.
- **Result:** —

## 2026-07-07 — Strategic reprioritization: autopsy-first, paid charter, benchmark demoted (plan of record)  ·  agent: orchestrator · lane: all

- **Change:** Two confirming deep-research passes (a full-product quality audit + a fastest-path-to-$1M
  strategy pass) reset the near-term sequence. The binding constraint is **proof-of-value velocity**
  (founder-hours per closed firm), not market size or the benchmark. New order of operations for the
  next ~60 days:
  1. **The "10-Call Autopsy" wedge** — ask a firm for 10 of *their own* recorded intake calls (their
     consent chain; we never dial, staying clean on CIPA §632), score them, and walk the owner through
     the 2–3 leaked signable cases live, with the verbatim transcript and fee-at-risk. The diagnostic
     *is* the close. Attacks the two conversions that decide everything (audit→pilot, pilot→paid).
  2. **Paid "Charter Firm" offer replaces the free pilot** — a flat, stepped, never-outcome-tied charter
     (illustratively ~$1,500/mo → $2,500 Core after 90 days), capped at 5 firms, real deadline. Pulls
     first revenue to month 1 and tests the weakest assumption (pilot→paid) with real money instead of
     a free pilot that selects for tire-kickers. **PRICING/OFFER CHANGE → staged for Ali; §VII gate;
     stays flat-monthly, never outcome-tied (§I).**
  3. **$25k find-it-free guarantee becomes the offer centerpiece** (risk reversal), reframed as
     value-found, never recovery-guaranteed (§IV). Copy change, not a rebuild. **Route framing to Yang.**
  4. **Dream 12, not Dream 25**, for the first closes — concentrate founder-hours on the tightest ICP;
     lead outreach with the autopsy offer, benchmark as air cover (touch 3), not the opener.
  5. **Benchmark (B-006/B-001) DEMOTED below the revenue work** — it is a months-to-pay-off authority
     asset, not a first-revenue lever, and was absorbing the hours the first 5 closes need. Let the
     autopsy data from the first *paying* firms (consented, aggregated) seed the benchmark later — one
     motion, both jobs.
- **Hypothesis:** Charging from day one + live autopsies on real calls converts audit→paid far faster
  than free-pilot→hope, pulling the $1M curve left by months. The benchmark still compounds, but funded
  by leftover hours and seeded by paying-firm data.
- **Expected effect:** first revenue in ~30–45 days (vs month 3–4); higher audit→paid conversion;
  founder-hours concentrated on the ~5 closes that start the flywheel.
- **Status:** plan of record for sequencing/strategy. The **pricing, offer, guarantee-copy, seal, and
  index** items are PUBLIC/regulated → staged for Ali and, where novel, Yang; nothing shipped here.
- **Review date:** 2026-08-06 (revisit after first autopsies + first charter conversations).
- **Result:** —
- **Also surfaced (novel, queued):** an "Intake Integrity Standard" (rating → named public standard);
  an "Intake-Verified" displayable seal (customers become distribution, Michelin-star loop); a public
  Spanish-Intake Justice Index (uncopyable PR franchise); a public-signal cold-open ("I scored your
  public intake — want the full autopsy?"). All cross §VII and route through Yang before anything public.

## 2026-07-07 — GTM re-scope: audit-led, recovered-lead re-engagement GATED behind retained legal clearance  ·  agent: orchestrator · lane: product+outreach (plan of record)

- **Change:** Plan of record going forward. (1) The independent-scorer **free Leak Audit leads all
  go-to-market** — it sits on the firmest legal ground (strongest on Rule 5.4: a flat, outcome-
  decoupled fee is not tied to any case's fees). (2) The **recovered-lead SMS re-engagement feature
  is GATED**: not shipped, marketed, demoed as available, or sold until a *retained* CA legal-ethics
  review clears it. It may still be built/tested internally (backend) behind the gate.
- **Hypothesis:** Legal analysis (Yang memo drafts + insight 2026-07-07) identifies re-engagement —
  helping a firm re-contact its own leads — as the **single softest surface** against AB 931
  ("anything of value for securing services") and B&P §§6151–6152 (capping/running), and **SB 37's
  new private right of action ($5,000–$100,000 per violation, VERIFIED)** is a risk multiplier that
  invites plaintiff-side theories aimed at a novel vendor. Leading with the audit books qualified
  conversations without exposing that surface; gating re-engagement removes the biggest legal tail
  risk to the $1M plan.
- **Expected effect:** protects the whole GTM from a catastrophic SB 37 enforcement tail while
  keeping the qualified-conversations funnel intact (the audit is already the wedge). No revenue-lever
  loss near-term — re-engagement was never going to be the first-touch anyway.
- **Status:** shipped (documented as plan of record; supersedes any framing that markets
  re-engagement pre-clearance).
- **Review date:** when Yang / retained counsel returns a clearance read on re-engagement (no fixed
  date; blocks on B-005 becoming a *retained* review, not a warm pass).
- **Result:** —

## 2026-07-07 — Staged Dream-25 outreach batch 1 + benchmark spine + targeting method  ·  agent: outreach · lane: outreach

- **Change:** Staged three drafts under `ops/drafts/` (nothing sent/published):
  1. `benchmark-report-outline.md` — spine + section architecture for the independent "State of
     NorCal PI Intake" benchmark (B-006→B-001). Every measured figure marked `[TO BE MEASURED]`;
     CIPA-safe methodology summarized (fixed scenario, 4-min rubric, tiered confidence, PUBLISHED
     false-alarm rate); Yang-signed §632 protocol flagged as a hard §II/§VII gate before any dialing.
  2. `dream25-outreach-batch-1.md` — signed physical letter (Ali's voice, NorCal-framed), 1:1
     CAN-SPAM email, LinkedIn connect+opener, and a capped 3-touch (mail→email→LinkedIn) sequence.
     Each asset carries a per-asset compliance note. Free Leak Audit is the wedge throughout.
  3. `dream25-targeting-plan.md` — ideal-fit scoring rubric + ethical public-source sourcing SOP
     (State Bar, county TLAs, CAOC NorCal chapters, Google LSA/PPC, Avvo/Justia), ≥2-source
     verification rule. No firm names/PII fabricated.
- **Hypothesis (per asset):**
  - Letter (Asset A): a signed, physical, morally-serious letter cuts through machine-written
    vendor email (letter's own thesis) → books qualified conversations [B-001, insight D1/D2].
  - Email/LinkedIn (Assets B/C): multi-channel, same-voice touches lift reply rate vs. single
    channel, at the ~8% touch→qualified assumption in the funnel model [insight B2].
  - Benchmark outline (B-006/B-001): the independent, published-methodology benchmark is the
    second-touch authority that earns the first meeting and instantiates the moat competitors
    structurally can't copy [insight D1/D2].
  - Targeting (C3): a scored fit rubric concentrates scarce founder hours on the ~24 firms that
    actually convert — the real binding constraint is hours/close, not TAM [insight B1].
- **Expected effect:** primary metric = **qualified conversations booked**. If batch-1 (Dream-25
  first ring, ~25 firms) performs near the funnel model, expect a handful of qualified
  conversations from touch→qualified ~8% across 3 touches; instrument reply-by-channel and
  touch→qualified from firm #1 (the two conversions insight B2 says decide everything).
- **Status:** staged-for-approval.
- **Review date:** 2026-08-04 (4 weeks; revisit after first sends + first replies).
- **Result:** —
- **Approval gates before anything moves (per compliance §VII):**
  - **Ali:** approve each asset; fill all `{{placeholders}}`; supply a REAL postal address for the
    CAN-SPAM email; set `{{ORIGIN_CITY}}` to a NorCal origin (NOT Orange County); confirm the
    Calibration & Honesty URL is live with a current false-alarm rate before pointing partners to it.
  - **Yang:** must sign the §632-safe benchmark protocol BEFORE any mystery-shop dialing; must
    clear any public "AB 931 / SB 37 compliant" claim (this batch makes NONE — kept to "flat,
    outcome-decoupled fee" only, per B-005 still open). Benchmark stays "forthcoming," no results
    implied, until fieldwork runs.

<!-- New decisions go above this line, newest on top. -->

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

## 2026-07-10 — Engine-v2 Wave 6: adjacency verification + LACBA authority piece  ·  agent: main session · lane: research/outreach
- **Change:** four staged docs — `ops/drafts/lacba-five-questions-piece.md` (publication-ready
  methodology piece; §VII human-post gate + Yang read flagged), `demand-stage-adjacency.md`,
  `spanish-first-intake-qa.md`; amendments folded into `engine-v2-EXECUTIVE-SUMMARY.md` and
  `engine-v2-conveyor-MVP.md` (Increment 0 data-spine amendment). Nothing sent/published.
- **Findings:** (1) **Supio Intake is LIVE with a call-scoring agent** and EvenUp is marching
  to intake (PLAAS, $10M+ early subs) — "nobody does call-content QA" is now false as stated;
  the wedge survives narrowed to *independent* rep-QA + develop-queue/SLA (Supio grading its
  own voice agent = second Switzerland proof), and the window compressed → conveyor + beta
  validation experiment move to NOW. (2) Cheapest option-preserving move: Increment 0 stores
  typed `answer_value` + `answer_citation` (not just ask-states) + `external_case_ref` + demand
  milestones — the intake-to-demand data spine; hard boundary: never build demand generation.
  (3) Spanish parity is a proof point, not a headline — "the only intake QA in Spanish" banned
  (§V superlative); credible claim = same bar both languages + capture rate by language;
  **beta test #4 = the 5 firms' call-language mix**.
- **Expected effect:** LACBA piece feeds live outreach (authority-asset input metric); spine
  amendment preserves 2027 demand-stage optionality at ~zero cost; refutable pitch language
  corrected before any prospect hears it.
- **Status:** staged-for-approval (LACBA piece → Ali posts after Yang read; spine amendment →
  adopt when Increment 0 is built).
- **Review date:** 2026-07-24

## 2026-07-10 — /onboard retired + digest-first desk shipped (Ali sign-off)  ·  agent: main session (Ali directive) · lane: product
- **Change:** (committed to main on Ali's explicit instruction) 1) The orphaned 5-step
  /onboard wizard is retired — page + /api/onboard deleted, /onboard 308→/apply; the pure
  `onboarding/` template-compliance lib and its tests stay (the send chokepoint uses them).
  /apply is the ONE signup story. 2) The digest-first desk (previously deferred in ROADMAP):
  `messaging/missed-digest.mjs` renders each missed caller with tap-to-call and a SIGNED
  one-click "We called them" link needing no login (HMAC tokens, no PII in URLs, 14-day
  expiry, only workflow statuses linkable — terminal outcomes still require the desk).
  GET /digest/confirm shows a human-press button (email scanners can't mark cases); the
  write reuses firm-scoped setFlagStatus. /api/digest/run (founder button on Studio Today
  + Vercel cron 15:00 UTC) does one pass over all firms, emailing firm members' sign-in
  addresses. Zero-miss days still send ("N calls read, all handled") so silence is never
  ambiguous. Delivery posture unchanged: KILL_SWITCH halts, TEST_MODE renders to output/
  and transmits nothing; links degrade to desk links if DIGEST_LINK_SECRET is unset.
- **Hypothesis:** the digest IS the daily loop for busy attorneys (simplicity research P1);
  removing the second signup story removes the last IA ambiguity.
- **Expected effect:** activation event (first callback marked done within 48h of first
  digest) becomes reachable without the firm ever opening the app.
- **Status:** shipped to main; email delivery still gated (TEST_MODE=true) until Ali sets
  DIGEST_LINK_SECRET + CRON_SECRET in Vercel and flips TEST_MODE per GO_LIVE.
- **Review date:** 2026-07-24
- **Result:** —

## 2026-07-10 — IA unification: one login, one founder nav, plain names everywhere  ·  agent: main session (Ali directive) · lane: product/website
- **Change:** (staged locally, not pushed) Research-driven simplicity pass over the whole app's
  information architecture. Founder side: `/studio` gained a persistent nav (Today / Mystery
  shops / Leads / Urgent leads / Monthly results / Tuning / System) shared with `/admin`, which
  gained an index page (was a 404 with four unlinked consoles); `/studio` home reworked into a
  "Today" screen leading with what needs action (unacked urgent leads, tuning proposals waiting).
  One sign-in: the proxy now sends all unauthenticated traffic to `/login` (password + magic
  link); the founder sees Studio ↔ desk links both ways. Naming: invented names demoted to
  subtitles ("The Mirror" → Mystery shops, "The Ledger" → Monthly results, "Captured leads" →
  Leads, Escalations → Urgent leads). Public: footer now links the intake-agent demo, the
  Spanish letter, and renames "Demo" to "See a call scored"; `/demo` ↔ `/intake-demo` ↔ `/audit`
  cross-linked. Hardening: `/billing` + `/settings/integrations` added to the auth-proxy matcher;
  desk nav deduplicated to one source of truth (`src/lib/desk-nav.ts`); 9 empty leftover
  directories removed.
- **Hypothesis:** deep-research pass (105-agent verified): progressive disclosure + one
  inbox-shaped home per role + boring descriptive labels (NN/g primary research) reduce
  abandonment for zero-patience users; one integrated product beats a toolkit (Squire).
  Refuted-and-avoided: digest-first email claims and concierge-vs-self-serve stats did not
  survive adversarial verification, so nothing was reorganized around them.
- **Expected effect:** founder daily loop = open /studio, see what needs you, work to zero;
  firm loop unchanged (already one queue). Should cut demo-setup fumbling and "where was that
  URL" time to ~zero.
- **Status:** shipped to main (Ali instructed commit + deploy same day).
- **Review date:** 2026-07-24
- **Result:** —

## 2026-07-09 — Public pricing removed for the beta window (branch `copy/beta-pricing-framing`)  ·  agent: website-dev · lane: website

- **What changed:** All dollar figures, tiers, and per-month prices removed from public site copy
  (pricing page, homepage founding section + final CTA, FAQ, founder, concierge, cohort banner,
  ROI calculator cost rows, audit-page link, nav label). Replaced with transparent beta framing:
  free during the beta under three spelled-out conditions (NDA, connect/upload recorded calls,
  structured feedback), a real flat price at launch shared individually after the free audit,
  founding testers lock preferred pricing. No "call for pricing" games — /pricing answers
  directly and offers Ali's email for the landing zone. Internal pricing objects (PRICING_TIERS,
  CHARTER_*, billing plans, checkout API) untouched; checkout is simply no longer rendered.
  Kept: $25,000 find-it-free guarantee (a guarantee, not a price — flagged for Ali), statutory
  dollar amounts on /compliance, market-stat anchors, the signed /letter (human artifact).
- **Hypothesis:** recruiting testers without a price tag recruits "help me make this great"
  instead of "is it worth $X", protects WTP data collection, and lets the Lost Case Report's
  recovered-dollar figure precede any pricing conversation (LACBA post audience).
- **Status:** staged on branch `copy/beta-pricing-framing`; beta/program-layer merged to local
  main earlier today per Ali. Nothing pushed or deployed.
- **Approval gates (compliance §VII):** Ali reviews the copy; pushing main deploys via Vercel —
  explicitly awaiting his go.
- **Review date:** at beta launch (restore published pricing from the untouched config).
- **Result:** 2026-07-09: Ali approved with three additions — the $25,000 find-it-free guarantee
  suspended from public copy for the beta (constants kept, marked suspended; /honesty keeps the
  estimation methodology), the letter updated to v1.3 (beta invitation; letter.txt mirror synced;
  letter.pdf regeneration still an open TODO), and /api/checkout disabled behind a single
  beta-window flag (503). Clio confirmed as the Phase-1 CRM. Both branches fast-forwarded into
  main and PUSHED to origin/main (771475f) on Ali's instruction — first deploy carrying the beta
  program layer. Same day: hosted Supabase migrations 0021 (reliability — was never applied) and
  0023 (beta program) applied to production via the pooler (the direct db.<ref>.supabase.co
  hostname has no DNS record; use aws-1-us-west-1.pooler.supabase.com). Production verified:
  /pricing shows beta copy, /api/checkout returns the 503 beta message, /api/beta/apply passed an
  end-to-end smoke test (qualified → nda_pending, NDA simulated; test row deleted). The stale
  public TODO note was removed from letter.txt (aafdbbd).

---

## 2026-07-09 — Beta program layer scaffolded over the recovery-desk product (branch `beta/program-layer`)  ·  agent: product-dev · lane: product

- **What changed:** Built the beta-program feature layer per Ali's 2026-07-09 brief: applicant
  intake + CA-PI ICP qualification with tagged waitlist (0a), NDA hard gate via the existing
  Dropbox Sign integration (0b), structured per-artifact feedback capture + founder view (0c),
  plus the Phase-1 rescue-desk models the beta exercises: pluggable practice-area ruleset
  (california-pi only), unified human-in-the-loop review queue with reject-retunes-criteria,
  top-3 daily rescue packet with zero-login delivery (email/SMS/Clio task, TEST_MODE-simulated),
  staged recovered-case ledger with would-have-lost gating + control holdout, callback-actor
  audit log, per-call consent status + firm attestation gate, packaging config objects with a
  structural flat-fee hard-fail, and a security-posture config object. Twin migrations
  (SQLite 0021 / Supabase 0023 with RLS). 28 new tests; full suite 301/301; build green.
  Deliverables: BETA_TEST_PLAN.md + FEATURE_MANIFEST.md at repo root.
- **Hypothesis:** a self-serve, NDA-gated beta with structured per-artifact feedback converts
  tester usage into the four signals (onboarding friction, utility, trust, WTP) needed to reach
  a launchable offer faster than ad-hoc pilots.
- **Expected effect:** input metrics — beta applications, NDAs signed, audits delivered to
  testers, feedback rows per artifact, WTP distribution.
- **Note (tension, flagged not smoothed):** this builds on Direction A (post-call, never
  contacts prospects), while the 2026-07-08 Intake Closer pivot below remains staged-for-approval.
  Also a pricing-number conflict: locked $1,500/$2,500/$5,000 vs the brief's $600–$1,500 band —
  both flat; config carries the locked numbers with TODO(Ali).
- **Status:** staged on branch `beta/program-layer` (committed locally, not pushed, not merged).
- **Approval gates (compliance §VII):** Ali — merge decision, pricing numbers, NDA/BAA template
  creation in Dropbox Sign; Yang — NDA/BAA/consent-greeting language before first live use.
- **Review date:** 2026-07-23.
- **Result:** —

---

## 2026-07-08 — PIVOT: Intake QA (independent scorer) → Intake Closer (autonomous bilingual closing agent)  ·  agent: orchestrator · lane: all

- **Change (STAGED, not shipped):** Owner (Ali) authorized a full pivot from the independent-scorer
  recovery desk to an autonomous, bilingual (EN/ES parity), 24/7 real-time **voice intake agent that
  closes** — qualifies, forensically scores the case, handles objections, and e-signs the retainer on
  first contact, under an attorney-in-the-loop approval gate. Master design: `INTAKE_CLOSER_DESIGN.md`.
  Work is on branch `intake-closer-pivot`. No old code deleted; retirement list staged in the design doc.
- **Hypothesis:** The market's white space is the capture→signature gap. Lifting blended lead→signed
  conversion from ~8–12% toward 20%+ has the same P&L effect as halving cost-per-lead, at lower cost.
  Sub-60s bilingual after-hours answering is the felt wedge; closing is the moat.
- **⚠ CONFLICT flagged (supreme doctrine):** `compliance-invariants` §I is a bright-line ban on
  per-signed-case pricing and even the words "per signed client / success fee." The pivot's most
  compelling economics are per-signed-case. **I did NOT edit the doctrine file** (§VII forbids
  unilateral pricing changes). Resolution designed as a *pricing switch*: default = flat subscription
  (compliant today); the fixed per-signed-case **technology** fee and the flat+guarantee fallback are
  gated on **Yang review** vs. Rule 5.4 / SB 37 / AB 931. Product behavior does not depend on the mode.
- **Standing prior decisions this SUPERSEDES if the pivot proceeds:** "independent recovery desk /
  not a fee participant" positioning and "flat monthly, never outcome-tied" pricing. These remain
  LOCKED until Yang clears the amendment and Ali approves the new public positioning (compliance §VII).
- **Expected effect:** N/A yet (pre-build). Stage-0 threshold: 2–3 extra signed cases/mo per pilot firm
  attributable to after-hours/Spanish capture.
- **Status:** staged-for-approval
- **Review date:** 2026-07-22
- **Result:** —
- **Owner action needed:** (1) approve/adjust the retirement list in `INTAKE_CLOSER_DESIGN.md` §11;
  (2) route the §I pricing amendment to Yang; (3) confirm which CRM to integrate first (Clio vs CasePeer).

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

## 2026-07-10 — LACBA-beta readiness pass (commit 80d8852)

**Change:** Full readiness check + website redesign for the LACBA Small Firms post
(4,000+ LA attorneys). Statewide/LA framing replaces NorCal everywhere public; all
save-protocol-text artifacts reframed as staff callback scripts (texting = roadmap,
A2P-gated); "our own models" and the 72-hour-purge overclaims corrected; /apply
rate-limited + founder email ping; dead components deleted. Drafted (staged, NOT
sent): mutual NDA, design-partner MOU, LACBA post + reply (ops/drafts/).
**Hypothesis:** the beta converts on one number (confirmed recovered fees), so the
site must sell exactly the loop we run — ingest recordings → daily flags → firm's
own staff call back → ledger — with zero contradicting surfaces for a diligent
LA attorney or their ethics counsel.
**Expected effect:** LACBA traffic lands on a coherent, compliant, single-CTA funnel;
applications reach Ali same-day via email ping instead of waiting on a /studio visit.
**Verified:** prod /apply works end-to-end (probe applicant created + cleaned up);
hosted migrations 0023/0030 confirmed applied; prod audit storage configured.
**Review:** at first LACBA applications, or 2026-07-24.

## 2026-07-10 — Persona teardown + bug-hunt sweep (commits 969c30a..db15783)

**Change:** Walked the product as the PI managing partner and the intake coordinator
(5 verified web-research passes → field guides in insights.md), then ran 3 parallel
bug-hunters over the beta surface and fixed the confirmed high-severity findings.
Shipped: (1) LeakCard rebuilt around the real callback moment — one-tap phone-reality
statuses (spoke/left-message/bad-number/signed/passed) + bad_number + undo/reopen +
warm opener, grading language OFF the staff surface; (2) desk "your week" wins strip
(recognition = the only upside a monitoring tool can give staff, since per-case bonuses
are barred); (3) queue no longer a graveyard (resolved cards → collapsed Handled section,
active-first ordering); (4) real-firm flags now show case type + fee (scorer's
case_type_matched plumbed through insertFlag + code→label map + Auto-accident fee row) —
was demo-only before; (5) digest persists follow-up to terminal (6-touch research);
(6) SECURITY: demo status PII leak closed (per-row token, migs 0032/0024), auth
self-signup closed (shouldCreateUser:false), resolveDeskFirm never falls back to a real
firm, open-redirects fixed; (7) idempotent onboarding + applicant tile clears; (8) honest
states (zero-call Calls page, beta-aware Billing, stale-heartbeat nudge, Documents copy).
**Hypothesis:** the beta converts on the coordinator using it daily and the partner
trusting the numbers; both fail if the desk reads as surveillance, shows blank/undollared
cards, or leaks a caller's PII.
**Verified:** tsc clean; 415/415 tests; build green; live browser walks (callback flow +
persistence, wins strip, queue split, demo token round-trip + terminal-on-failure, PII
?id= now 400). All hosted migrations 0031/0032/0033 applied. Scratch users/probe rows
cleaned from hosted DB.
**Deferred (Ali/infra, noted not guessed):** per-firm CallRail secret + live signature
verification; XFF-trusted rate-limit IP on Vercel; storage bucket size cap; engine-v2
triage rubric (frozen — needs attorney review); statute clock; attempt-count nudge.
**Review:** at first real beta firm's first week.

## 2026-07-10 — Engine v2 triage-first: research + design (3 waves, staged for Ali+Yang)

**Change:** Exhaustive research + design for rebuilding the intake scoring engine to
optimize for TRIAGE (case selection) not conversion, per Ali's request. Engine left
FROZEN; produced a reviewed design deliverable (NOT a code change): exec summary +
research log (~20 cited PI-attorney/decision-science/ethics briefs across 3 waves) +
promptable v2 system-prompt DRAFT + outcome-validation-loop & firm-config YAML + a
6-example gold calibration set. All in ops/drafts/engine-v2-*.md.
**Hypothesis:** v1 scores intake as a conversion funnel; the CAALA/CAOC firms we sell
to run it as case-selection; a triage engine (coverage-adequacy gate, net-of-lien value,
two-sided over-conversion alert, actuarial validation loop) matches the real buyer.
**Key finding (adversarial + compliance converged):** the full case-VALUE oracle is a
post-validation, up-market product; its beta-appropriate form is a call-QA + develop-
queue CONVEYOR (headline metric = "value-determining questions resolved within SLA," not
a score). No terminal outputs, tier-not-dollars, generic-deadline-reminders, aggregate
(not per-staffer) over-conversion signal, Fricker-grounded fairness fixes. **Do NOT ship
the selection engine to the current beta** (small firms' problem is follow-up not
selection; tiers need a 12-24mo validation cycle).
**Expected effect:** north-star engine design banked; near-term product clarified as the
conveyor the rescue packet already partly delivers.
**Hard STOPs → Yang (§VII):** freeze-lift, case-VALUE-at-intake, no-auto-decline,
deadline flags, over-conversion retention, refer-out monetization, the 3 fairness fixes.
**Review:** when Ali decides whether to lift the freeze; not before a PI-attorney +
Yang review.

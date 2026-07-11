# Beta Validation Experiment — test the thesis before building (DRAFT)

> The disciplined next step: the whole engine-v2 / conveyor strategy rests on 3
> assumptions. This is how to test them on the live 5-firm beta in ~4–6 weeks, cheaply,
> before committing build effort. Runs on data you already ingest; nothing new to ship.
> Anti-"motion-not-progress" — validate, then build.

## The 3 load-bearing assumptions (from the red-team) and how to test each

### TEST 1 — Which bleed is bigger: missed FOLLOW-UP or bad SELECTION?
**The claim under test:** "small CA PI firms' problem is follow-up, not selection." If
false, the whole beachhead choice is wrong.
**Method (2–4 week retrospective audit, per firm):** for the beta window, categorize the
lost/at-risk economic value into two buckets from the firm's own calls + a light
reconciliation:
- **Follow-up bleed:** viable-profile cases that walked with no owned next step (already
  the `lost_signable_case` flag) — count + value-tier.
- **Selection bleed:** cases the firm SIGNED that carry a decline-profile (min-limits +
  soft-tissue + low-PD, apparent Prop 213, apparent MIST, big-lien/underwater) — count.
  (Selection bleed is only fully knowable at disbursement, so at 4 weeks measure the
  *leading indicator*: signed cases with ≥2 unresolved material red flags = the
  `questionable_sign` population.)
**Decision rule:** if follow-up bleed dominates by count/value → the develop-queue wedge is
the right beachhead (expected). If selection bleed is comparable or larger → the firms are
more selective than assumed and the value-tier/decline-support signal matters sooner than
the verdict says; re-weight the roadmap. Either way you learn the real ratio, which no
amount of more research can tell you.

### TEST 2 — Will a partner ACT ON / PAY FOR a value signal?
**The claim under test:** dollars-at-intake is over-cautious / a value TIER is enough.
**Method (A/B within the beta):** show ~half the firms a **value TIER** (higher/standard/
lower profile + cited driving factors) on flagged cases; keep the internal dollar estimate
dark for all. Observe, per firm: does the partner (a) ask for the underlying number, (b)
ignore the tier, or (c) change a callback/priority decision because of it? Log every "can
you just tell me what it's worth?" request verbatim.
**Decision rule:** if partners repeatedly demand the dollar figure and won't act on a tier →
the compliance-driven "tier not dollars" call has a real product cost → prioritize the
**demand-stage disclaimed range** (red-team amendment #2, post-signing, discovery-hardened)
sooner. If the tier drives behavior → the compliance-safe design is also the sufficient
design; hold the line. (Never show a dollar figure at intake during the test — the point is
to measure demand for it, not to ship it.)

### TEST 3 — Does "questions resolved within SLA" correlate with DOLLARS RECOVERED?
**The claim under test:** the proposed headline metric actually tracks the thing firms buy
(recovered dollars), not a vanity SLA. This is the make-or-break for renewal.
**Method (instrument from case one — the flywheel Increment 0):** per firm, track
`value-determining questions surfaced`, `% resolved within SLA`, and `cases that changed
value tier / got signed / recovered after a queued question was answered`. This needs the
outcome data, which lags — so at 4–6 weeks measure the **leading proxy**: does resolving a
queued question actually change a case's disposition/tier (a within-window, observable
event), and gather the first realized-outcome data points as any early cases resolve.
**Decision rule:** if resolving queued questions demonstrably upgrades cases/dispositions →
the metric is real, lead with it. If resolution rarely changes anything → the develop-queue
is theater and the wedge is wrong; pivot before building the SLA machinery.

### TEST 4 (added Wave 6) — the call-language mix
**The claim under test:** Spanish-first callers are a material share of the beta firms'
intake volume, and their calls get measurably worse question-capture (the market brief
`spanish-first-intake-qa.md` estimates 25–40% Spanish-first for LA consumer-PI firms buying
Spanish media, but no public number exists — this GROUP BY is the first real datum).
**Method:** language-tag every call in the dark QA pass (AssemblyAI language detection is a
parameter, not new infra); report capture-rate and (once live) SLA-resolution-rate **by call
language** per firm.
**Decision rule:** if Spanish share is material (>15%) and the capture gap is real → the
bilingual develop-queue increments move up the build order and "capture rate by language"
becomes a demo artifact; if Spanish volume is negligible in this cohort → park bilingual as
a sales option, don't build yet. Either way the fairness tripwire (§4sexies four-fifths
check) ships with the QA pass.

## How to run it (cheap, on existing infrastructure)
- **No new product needed.** Tests 1 & 3's leading indicators come from the QA pass +
  flag/flag_status data you already have or can add as the dark backend pass (conveyor
  Increment 1). Test 2 needs only a tier badge shown to half the firms (Increment 4, tier
  only, no dollars).
- **The reconciliation:** the same monthly 15-min export the flywheel needs (closed/
  settled last month) + the onboarding retrodiction bulk export — that's the outcome data.
- **N=5 caveat (§VIII):** five firms is directional, not statistically powered. Report
  everything confidence-tiered; treat a clear signal as "worth betting on," a muddy one as
  "need more N," never as proof. Do NOT let any beta number harden into a marketing
  guarantee (the GTM's §4(b) risk).
- **Timeline:** weeks 1–2 stand up the dark QA pass + reconciliation; weeks 2–6 collect;
  a day-30 read and a day-45 decision meeting mapped to the beta→paid conversion window.

## What each outcome means for the roadmap
| Result | Roadmap move |
|---|---|
| Follow-up bleed dominates + SLA-resolution upgrades cases + tier drives behavior | Verdict CONFIRMED — build the conveyor (Increments 0–5), lead with the develop-queue, hold tier-not-dollars |
| Selection bleed comparable/larger | Re-weight: bring the value-tier/decline-support signal forward; the beachhead is narrower than "just follow-up" |
| Partners demand dollars, won't act on tier | Prioritize the demand-stage disclaimed range (post-signing); the intake tier is necessary but not sufficient |
| SLA-resolution rarely changes a case | STOP — the develop-queue is theater; the value is elsewhere (probably just the rescue packet); don't build the SLA platform |

**Bottom line:** these four tests convert the entire multi-wave strategy from a
well-argued hypothesis into something the 5 beta firms can confirm or kill in six weeks,
for the cost of one dark backend pass + a monthly spreadsheet. That is the honest next step
— cheaper than building on faith, and the only thing that can actually settle the questions
the research can only argue.

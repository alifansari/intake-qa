# Engine v2 (Triage-First Scoring) — Executive Summary for Ali

> The reviewed research + design deliverable. The scoring engine stays FROZEN; this is
> what would justify deliberately lifting the freeze, and how. Full work:
> `engine-v2-triage-design.md` (research log, 3 waves, ~20 cited briefs) +
> `engine-v2-system-prompt-DRAFT.md` + `engine-v2-config-and-validation.md` +
> `engine-v2-gold-examples.md`. Anything novel in a regulated area → Yang (§VII).

## The one-paragraph verdict
You asked to rebuild the engine to optimize for **triage** (sign the good, decline the
dogs) instead of **conversion**. The research says you're right about the diagnosis —
v1 scores intake as a conversion funnel and the CAALA/CAOC firms you sell to run it as
case-selection. But two independent adversarial passes (a defense+trial-lawyer attack
and a CA legal-ethics review) converged on a harder truth: **the fully-realized
"case-selection engine" is a post-validation, up-market product — and its near-term,
beta-appropriate form is not an oracle that scores case value, but a CONVEYOR that (a)
checks whether your rep asked the disqualifying + value-determining questions and (b)
tracks the unresolved ones to resolution with an owner and a clock.** Ship the conveyor,
not the oracle.

## WAVE 4 — final adjudication (competitive verification + red-team)

**Competitive map STRENGTHENS the verdict.** Verified: **nobody QAs the firm's OWN
human intake rep against a PI case-making rubric + runs a develop-queue + surfaces lost
high-value cases.** The closest players each miss: **CallRail Premium CI ($145/mo)**
scores the *lead/campaign*, not the rep, and "lacks QA/coaching workflows"; **Observe.AI/
CallMiner** do 100%-of-calls agent QA but have zero PI DNA (you'd build the rubric —
that's the product); **Eve ($1B, plaintiff-native)** does voice intake + a nightly
"Auditor," but the voice product *replaces* the human rep and Auditor reads *case docs*,
not intake-call rep QA. The case-selection **ORACLE is the crowded/defended zone**
(CaseYak value-prediction, EvenUp $2B case analysis, Eve) — deferring it is textbook
correct: *attack where nobody is (rep QA + develop-queue), defer the fight where everyone
is.* **The develop-queue is the most defensible, least-copied primitive — make IT the
headline, not the QA scoring** (which is closer to commoditized). **Watch-items:**
CallRail (cheap, already on the call stream — never lead with "we transcribe calls");
**Eve is the existential threat** (one Auditor release from intake-call QA — the window
is real, not indefinite). **Positioning correction:** say "your reps' calls go un-QA'd,"
NOT "nobody does this" (refutable in a sales call). **Pricing:** the market anchors are
$50–200/mo call tools (commoditized — avoid) and $80–200/agent enterprise QA (wrong
buyer — avoid); EvenUp normalized per-case value pricing for this buyer — **BUT our
compliance spine is FLAT-fee-only (Rule 5.4 / §6152); per-recovered-case pricing is OFF
the table for us.** Price flat, sell on the recovered-case ROI story, don't structure the
fee as a share.

**Red-team verdict: AMENDED-WITH-CHANGES.** The product sequencing survives every attack;
the one genuine crack is the ASSET judgment. Three load-bearing amendments:
1. **START THE OUTCOME-DATA FLYWHEEL NOW (non-optional).** The moat in PI triage isn't
   the model — it's the *outcome-labeled dataset* (intake facts → selection decision →
   net recovery), which only accrues with CALENDAR TIME (cases resolve in 12–36 months).
   "Wait for the validation loop, then build it" is a contradiction: the loop IS the
   thing you build first, SILENTLY. Instrument outcomes on every case the conveyor
   touches from day one, scoring 100% internal/unshipped — or you arrive in 2028 with a
   conveyor and no corpus while a funded competitor has 2 years of labels. Deferring the
   model is right; deferring the DATA is the strategic error.
2. **Split the value-output rule BY STAGE.** Keep the hard NO on dollars at
   INTAKE/pre-signing. Roadmap a *disclaimed, discovery-hardened value RANGE at the
   DEMAND/develop stage* (records in hand, attorney-directed) — exactly where EvenUp/
   Supio already prove it's viable. (Discoverability turns on the contractual architecture
   — no-training/retention/access terms — not the label; *Heppner* 2026.)
3. **Shrink the conveyor toward the rescue packet.** Thinnest instrumented wrapper;
   ratification ≤1 touch per case, terminal moments only (else "ratifiable" degrades to
   "review everything" and the tool dies on throughput); drop the "conveyor as platform"
   framing and the "follow-up NOT selection" OVERCLAIM → reframe **"follow-up is the
   beachhead; selection is the expansion,"** and don't throw away the selection signal you
   generate along the way (amendment 1).

**THE 3 ASSUMPTIONS TO TEST EMPIRICALLY WITH THE 5 BETA FIRMS (do this before betting):**
1. **Which bleed is bigger — missed follow-up or bad selection?** A 2–4 week audit: of
   lost economic value, what share is viable cases lost to slow follow-up vs signed cases
   that net-negative at disbursement (liens/min-limits/MIST)? Tells you if the beachhead
   is even right.
2. **Will a partner act on / PAY for a value signal?** A/B a TIER vs a disclaimed RANGE
   (internal-only) — do partners ask for the number, ignore it, or change behavior?
3. **Does "value-determining questions resolved within SLA" correlate with DOLLARS
   RECOVERED?** If the headline metric doesn't track recovered revenue, firms won't renew
   on it (they buy outcomes, not SLAs). Instrument from case one — validates the conveyor
   metric AND the outcome-data pipeline simultaneously.

---

## Why not just build the case-value scorer
- **It commits v1's own sin worse.** The two dimensions that decide a PI case —
  coverage adequacy (~30%) and liability (~22%) — are the LEAST observable on a first
  intake call (defendant limits are unknown pre-suit; a comparative-fault % from a lay
  narrative is astrology; degenerative-vs-traumatic is on an MRI that doesn't exist yet).
  Scoring them is false precision with a bigger multiplier.
- **Compliance says no dollars, no auto-decisions.** A non-lawyer tool that outputs a
  case-VALUE dollar figure or a take/decline VERDICT edges into UPL, becomes a
  discoverable admission against the firm, and (for dollars) is a Rule 7.1 landmine. The
  master guardrail that answers all of it: **NO TERMINAL OUTPUTS — every signal is
  something a licensed lawyer must ratify or override** (this also matches the coming CA
  Rule 1.1 AI-verification duty). Verdict: ship a value **TIER**, never dollars, at intake.
- **Wrong buyer for the beta.** Small CA PI firms sign almost everything not
  disqualified — their pain is **follow-up, not selection**. Selection engines matter to
  high-volume/high-ad-spend firms drowning in marginal leads. **Your beta already ships
  the real value via the rescue packet; don't reframe a service they love into a
  prediction they distrust.**

## What IS worth building (ranked by willingness-to-pay)
1. **"Did my rep ask the disqualifying + value-determining questions?" call-content QA.**
   Nobody does it (calls are recorded, never listened to). Defensible (it's about your
   rep's behavior, not a legal prediction), and a director can't hear 300 calls/week.
2. **Surfacing the lost high-value case** (the uninsured-looking trucking case that's a
   $1M policy) — the ROI story that closes the sale; low-frequency, so the hook not the
   retainer.
3. **The develop-queue conveyor** — unresolved decisive question + owner + clock = a
   loss-prevention conveyor mapping to recovered dollars. Boring, sticky, high LTV.
4. Over-conversion AGGREGATE trend (managing-partner conscience; never per-staffer).
5. Generic deadline reminders (hygiene, ~zero standalone WTP).

**Positioning:** "your intake director, but they hear every call." **Price $200–500/mo
QA, not $2k/mo 'AI underwriting engine.'** v2 loses the demo, wins the renewal (no score
to be wrong about → can't get switched off for being confidently wrong, the way v1 did).
**Single highest-leverage move: make the headline metric "value-determining questions
resolved within SLA," not any score.**

## If/when the full oracle ships (up-market, post-validation) — the design in one screen
- **Two tracks, one wall:** case-quality/triage NEVER fuses with rep-behavior/coaching.
- **Four-valued disposition** {sign_now / develop / refer_out / decline}; every
  non-decline gets an owner + a generic SOL note. `develop` and `refer_out` (CRPC 1.5.1)
  are POSITIVE outcomes — an unsigned signable case is often the correct, profitable call.
- **Score only the reliable backbone** (case type, mechanism-archetype, incident date,
  rep on-call actions, claimed injury). **Gate only on legally-determinable facts** (Prop
  213, med-mal-no-economic-loss, out-of-scope, deadline). Coverage/liability/causation are
  FLAGS that route to develop + a **follow-up-question coach**, never auto-decline gates.
- **Absence is never evidence of the negative** (silence on priors ≠ no priors → unknown).
- **Two disposition-gated alerts:** `lost_signable_case` (value as a TIER) + the new
  `questionable_sign` over-conversion detector (five fairness rules; aggregate + short-TTL,
  never a per-staffer "signed a dog" record).
- **Value math** (internal ordering only, never surfaced as dollars): net of Howell-
  adjusted specials, liens, costs, capped by likely limits — not v1's flat gross average
  that hallucinated ~$2.4M/yr of fake "lost revenue."
- **Actuarial spine:** the Meehl/Grove win is CONSISTENCY + an outcome-validation loop
  (Brier/QWK/calibration, retrodict the firm's closed cases first, cold-start from
  base rates). **Target = realized net-fee per case, NEVER sign-rate** (Goodhart). No
  staff metric until ≥1 real outcome cycle.
- **Fairness as a Fricker-grounded differentiator:** give the benefit of missing/
  ambiguous signal to the CALLER (→ develop), not the decline. Ship the three fixes:
  `unobserved`≠`Poor` (transcription noise never floors a dimension), lay-vocabulary
  severity parity (medical fluency stops proxying for class), and a per-language
  disparate-impact audit + Spanish reliability gate before the loop recalibrates.

## Compliance STOPs (all route to Yang before any ship — §VII)
No terminal auto-decline · no case-VALUE dollars at intake · deadlines = generic
reminders never computed dates (never the system of record) · over-conversion signal
aggregate + short-TTL + work-product, never a named-staffer durable record · refer-out
NEVER monetized through Intake QA (the B&P §6152/SB 37 anti-capping tripwire) · the three
fairness fixes above.

## Recommended sequencing (final, post-Wave-4)
1. **Now (beta):** make the rescue packet indispensable; add the **call-QA layer +
   develop-queue** as the thinnest instrumented wrapper (build design in
   `engine-v2-conveyor-MVP.md` — ships on the existing app, NO freeze lift); instrument
   2–3 "you almost lost this" recovered-case stories. **Start the outcome-data flywheel
   from case one** (intake facts → decision → net recovery, internal-only). Run the
   3 empirical tests above. Don't call it an engine; lead with the **develop-queue**.
2. **Beta → paid:** per-rep process-compliance QA *as coaching, not scoring*; the monthly
   15-min outcome reconciliation matures the corpus. Consider the gated, disclaimed
   value-RANGE at the *demand* stage (not intake).
3. **v2 (post-validation):** the tiering/selection engine, up-market to high-volume firms,
   AFTER ≥1 outcome cycle proves the backbone tier correlates with realized value — behind
   a deliberate freeze-lift + QWK re-validation + regenerated golds + a `ScoredCall`
   sibling migration + Yang sign-off. **The model waits; the data does not.**

## Two positioning refinements from the Eve teardown (Wave 5 — fold into the wedge)
Eve ($1B, plaintiff-only, "Jenny" voice intake that REPLACES the rep, Auditor that reviews
DOCS not calls) is the existential competitor. The technical moat is weak (call-QA is ~one
Auditor release away) but the **strategic moat is real: building human-rep QA would
cannibalize Eve's "fire your reps" narrative** — the incumbent's dilemma. Two refinements
this forces:
1. **Be Switzerland — audit WHOEVER handles the call, human OR AI (incl. Eve's Jenny).**
   Firms adopting autonomous intake need *independent* QA MORE (verify the AI didn't drop a
   viable case — a malpractice exposure). Every Jenny deployment becomes a firm that needs
   you → **Eve's growth is your tailwind.**
2. **Center the durable asset on the DEVELOP-QUEUE / case-making-question intelligence, NOT
   human-rep coaching** — "surface every case-making question + lost case across EVERY intake
   channel," so the AI-answers-every-call trend can't shrink your TAM.
Messaging: attack the PREMISE, not the unicorn — "we don't replace your intake team, we make
it the best in your market and catch the cases it's losing." Beachhead: small firms that
still answer their own phones (Eve ignores them). **Do NOT build a competing voice agent.**
(Full: `competitive-eve-defense.md`; GTM: `develop-queue-GTM.md`.)

## WAVE 6 — adjacency verification (2026-07-10, post-Wave-5): three amendments

**1. The window is compressing — Supio shipped our wedge.** The demand-stage adjacency scan
(`demand-stage-adjacency.md`) found **Supio Intake is live** with a Scoring Agent that "grades
every call and agent against your intake SOP with report cards" plus a Coaching Agent, and
EvenUp's march backward to intake is confirmed (Communication Agents Jan 2026 → PLAAS May 2026,
$10M+ early subscriptions). The white-space claim survives in narrowed form — nobody offers
*independent* rep-QA on the develop-queue/SLA model — but "nobody does call-content QA"
is now FALSE as stated and must not be said in any pitch. [Corrected by the Wave 7 battle
card: Supio's Scoring Agent grades the firm's HUMAN agents on their existing phones too, so
never say "Supio only grades its own AI." The Switzerland argument survives stated
structurally: their grader lives inside a platform that also answers calls and monetizes the
downstream case; we sell nothing the score could flatter. Full landmine list + talk track:
`competitive-supio-battlecard.md`.] Practical effect: the conveyor build
and the beta validation experiment move from "soon" to "now"; the moat is speed + independence
+ the outcome corpus, not the feature.

**2. Increment 0 amendment (adopt before it ships): store answers, not just ask-states.**
Add a typed `answer_value` (+ `answer_citation`) to `question_checks` and stamp it into
`intake_feature_snapshot`; freeze `question_key` as an additive-only ontology; add nullable
`external_case_ref` (CMS matter ID) to `case_disposition`; add `demand_sent_at` /
`demand_amount` / `first_offer` to the monthly outcome reconciliation. ~3 columns + one form
tweak, same Claude pass. This turns the QA log into the intake-to-demand data spine — it keeps
the demand-stage option (partnership export or 2027 product) open for near-zero cost, and it's
the corpus behind "cases with all value-determining facts captured demand faster/settle closer
to limits." Hard boundary confirmed: **never build demand generation** (EvenUp's $2B knife
fight); neutral cited-fact export any demand tool consumes, no deep bilateral integration.
(Full: `demand-stage-adjacency.md`.)

**3. Spanish parity is a proof point, not a headline — and beta test #4.** The Spanish-first
scan (`spanish-first-intake-qa.md`): the market is real (Spanish ≈ 89% of all CA court
interpretations; Spanish PI leads cost 40–60% less, so firms buy them and then can't QA them —
Spanish QA coverage at English-dominant firms is zero, not degraded). But "the only intake QA
that works in Spanish" is banned (§V superlative, refutable in one call). The credible claim:
*"same case-making-question QA in English or Spanish, cited in the caller's own words — and we
show you your capture rate by language."* Cheapest increments: native-Spanish QA pass (no
translation round-trip, citations stay in the caller's Spanish) + per-language capture/SLA
telemetry (a GROUP BY — and it productizes the fairness audit's biased-abandonment tripwire).
**Beta test #4: measure the 5 firms' call-language mix.**

Also staged this wave: `lacba-five-questions-piece.md` — the publication-ready LACBA
methodology piece (human-post gate + Yang read flagged), the public articulation of the
develop-queue thesis whose DIY-audit sidebar is the manual version of the product.

## The full deliverable (files in ops/drafts/)
- `engine-v2-EXECUTIVE-SUMMARY.md` (this) — the verdict + sequencing + beta tests.
- `engine-v2-triage-design.md` — the full research log (3 waves, ~20 cited briefs) +
  the v2 rubric spec + all the adversarial/compliance/fairness revisions.
- `engine-v2-conveyor-MVP.md` — the near-term shippable (call-QA + develop-queue on the
  existing app, no freeze lift, 5-increment sequence).
- `engine-v2-system-prompt-DRAFT.md` — the promptable v2 system-prompt (for freeze-lift).
- `engine-v2-config-and-validation.md` — the outcome-validation loop + firm-config YAML.
- `engine-v2-gold-examples.md` — the 6-example calibration set.
- `develop-queue-GTM.md` — go-to-market for the wedge (positioning, closing demo script,
  flat-fee price table, beta→paid, LACBA/CAALA channel, objection table).
- `competitive-eve-defense.md` — Eve teardown + the channel-agnostic differentiation.
- `demand-stage-adjacency.md` (Wave 6) — EvenUp/Supio reverse-threat check + the
  intake-to-demand data spine (the Increment 0 `answer_value` amendment).
- `spanish-first-intake-qa.md` (Wave 6) — Spanish-first market/failure-mode/ASR scan +
  the bilingual develop-queue increments + the credible parity claim.
- `lacba-five-questions-piece.md` (Wave 6) — publication-ready LACBA methodology piece
  (staged; human posts; Yang read first).
- `beta-validation-experiment.md` — the 6-week thesis test on the 5 beta firms
  (now four tests, incl. call-language mix).

**Building the selection engine now is building the thing that distracts from the thing
that's selling. The research was worth doing — it tells you exactly what the north star
is and, more usefully, that the next sprint is the conveyor, not the oracle.**

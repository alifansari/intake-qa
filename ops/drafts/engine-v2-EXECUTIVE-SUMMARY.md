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

## Recommended sequencing
1. **Now (beta):** double down on the rescue packet + call-QA + develop-queue; instrument
   2–3 "you almost lost this" recovered-case stories. Don't call it an engine.
2. **Beta → paid:** add per-rep process-compliance QA *as coaching, not scoring*; quietly
   begin capturing outcome data (the monthly 15-min reconciliation) the future engine needs.
3. **v2 (post-validation):** the tiering/selection engine, sold up-market to high-volume
   firms, AFTER ≥1 outcome cycle proves the backbone tier correlates with realized value —
   behind a deliberate freeze-lift + QWK re-validation + regenerated golds + a `ScoredCall`
   sibling migration + Yang sign-off.

**Building the selection engine now is building the thing that distracts from the thing
that's selling. The research was worth doing — it tells you exactly what the north star
is and, more usefully, that the next sprint is the conveyor, not the oracle.**

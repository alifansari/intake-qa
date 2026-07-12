# Demo → Onboarding Conversion Script (Sub-objective 3.3)

**Status: STAGED, NOT SENT/RUN AUTONOMOUSLY.** Per compliance-invariants §VII, no agent
runs this demo, sends any message in it, or transmits anything to a firm. This is the
script Ali runs by hand and the cadence Ali sends by hand. The one in-product exception
is the Day-0 welcome email, which the studio composes at onboarding and sends **only on
Ali's confirming click** (and `EMAIL_ENABLED=true`).

This file is the single conversion motion from first demo to a firm working its own desk
daily. It consolidates and sequences three things that already exist so they read as one
arc, and adds the connective tissue between them:

- the demo click-through (`DEMO_SCRIPT.md`),
- the 15-minute setup call (`ops/drafts/callrail-setup-runbook.md` + `beta-comms-kit.md` §6),
- the Day-0/1/3/7 cadence (`ops/drafts/beta-comms-kit.md` templates 1–5).

**Nothing here invents a stat or a dollar.** Every number traces to `ops/insights.md` B4
(verified/reported labels preserved) or is refuted-and-benched per
`ops/drafts/copy-audit-2026-07-11.md`. If a figure isn't in those two files with a
verified label, it is not said aloud. That discipline *is* the pitch to this buyer.

---

## The spine (one idea, said three times across the arc)

**Their calls, their arithmetic, their credit — and a named human stakes the score.**

- **Their calls.** We never demo on our sample when one of their own recordings is in
  the room. The wow is a *live autopsy on a call they recognize* (Part 1).
- **Their arithmetic.** We never compute their loss or their ROI. We hand them the
  verified inputs and let them do the division on their own books (Part 2). 65% of B2B
  buyers call vendor ROI math inflated (persona field guide, `ops/insights.md`
  2026-07-10); a Rule 7.1-conditioned partner reads a vendor-computed dollar figure as a
  *violation*, not puffery.
- **Their credit.** The intake coordinator gets every callback and every save with her
  name on it. If she's in the room she drives her own screen before the partner sees any
  score (Part 1, step 4).
- **A named human stakes it.** The deliverable is not a dashboard number; it is a signed,
  staked opinion (Austin speech-act model — Ali as Analyst of Record). That is the
  difference between a credit *tool* and a credit *rating*, and it is the one thing a
  CRM or an answering service structurally cannot copy (`ops/insights.md` D1). Say it
  once, in the honesty beat, never as a boast.

Why the score is trustworthy at all, if a partner asks the deep question: structured,
rubric-based judgment reliably matches or beats unstructured gut (Meehl 1954; Grove &
Meehl) — the same reason medicine uses BI-RADS tiers and 911 uses standardized dispatch
codes. We publish how the model fails; we tier every confidence; we refuse to publish a
precision number until the test corpus is documented. Humility is the credibility.

---

## PART 0 — Read the room (30 seconds before you open a browser)

- **Managing partner** (2–10 attorney firm): ~45% of his week is admin; you get one
  distracted 20–30 minute session, then <5 min/week. He reads vendor claims through Rule
  7.1 — an unverifiable number is a violation. Lead with his own calls and his own math.
  His fear order is accuracy → confidentiality → regulatory exposure (copy audit DR-6);
  hit all three unprompted and you've de-risked the buy.
- **Intake coordinator**: also the receptionist, often a case manager (192-case loads are
  documented); attention comes in ~47-second windows. The tool must read as a gift — her
  callback list, her wins — never as surveillance. If she's in the room, **she sees HER
  calls before the partner sees any score.**
- **If only the coordinator is present:** run the 10-minute variant (Part 1 note at the
  end). Skip pricing and stats entirely.

---

## PART 1 — The live-autopsy demo (the "wow", tied to 2.2)

The wow is not a feature tour. It is a **live autopsy on one of their own recorded
intake calls**: upload it at `/demo`, watch transcribe → score in front of them, and walk
the result — signable or not, the *verbatim quotes* that justify the flag, the tiered
confidence, the deadline watch. When a signable caller walked without signing, that is a
grievance that was never named — Felstiner-Abel-Sarat's "naming, blaming, claiming" fails
silently at intake, and the autopsy is the first time anyone in that firm *sees* it
happen. That recognition is the emotional core of the whole sale. Everything else in the
click-through is scaffolding around it.

### Before the demo (the one ask that makes or breaks the wow)

When you book the demo, ask for this in the confirmation:

> "Bring one or two recorded intake calls you can play me — ideally one you have a nagging
> feeling about, where a caller who sounded like a real case didn't end up signing. A call
> you recorded on your own line under your own consent practice; we never touch your
> consent. We'll read it live on the call."

Why "one you have a feeling about": it stacks the odds that the live autopsy surfaces a
real signable-that-walked instead of a clean call, and it makes the partner the author of
the wow (his instinct, confirmed by the score). **If they come empty-handed**, the sample
call works — but say plainly "this is our sample, not your call," and pivot hard to the
Leak Audit ask ("send me ten of your own and I'll do this for real").

**Setup (once):** `npm --prefix web run smoke` then `npm --prefix web run dev`
(http://localhost:3000). Keep `TEST_MODE=true` and `KILL_SWITCH` as-is — the safety being
on is part of the pitch.

### The story (say this first, ~20 seconds)

> "You already paid to make the phone ring. We read every intake call — English and
> Spanish — and when a signable caller walks without signing, they show up on your desk
> the same day with a number to call back. Your team changes nothing about how they answer
> the phone. A human approves anything that ever goes out, and during the beta nothing
> goes out at all."

### The click-through

1. **Their call, live (`/demo` — public, no login) — THE WOW.** Upload their recording.
   Narrate the pipeline as it runs ("transcribing… now scoring against the rubric"), then
   walk the result out loud:
   - **The verdict:** signable or not — in their word, *signable*, never "good lead."
   - **The evidence:** the exact quotes from the transcript that justify the flag. This is
     the citation guard made visible — *no citation, no claim* (§IV). Point at the span:
     "we're not asserting she was signable; here's the sentence where she says she was
     rear-ended and went to the ER — that's the flag, and you can read it yourself."
   - **The confidence tier:** "this is a high-confidence flag / this is a maybe — we tell
     you which, we never dress a maybe up as certainty."
   - **The privacy line, unprompted:** "the audio is never stored, results purge on the
     published retention window, and this screen physically cannot text anyone."
   The moment the partner recognizes the caller and sees the quote, stop talking. Let the
   silence do the work.

2. **The same call's Deadline Watch + case summary.** Statute-of-limitations *estimate* by
   deterministic date math — framed exactly: "attorney-verifiable, a callback reminder,
   never legal advice; the deadline itself stays with your lawyers." Partners check this
   one; let them. (Compliance rail: the product shows elapsed time / urgency, never a
   computed SOL date — enforced in code, `decisions.md` B-013.)

3. **The desk (`/desk/queue`) — the coordinator's screen, shown as HERS.** If the
   coordinator is present, hand her the mouse *here*, before the partner sees any score.
   The queue is her callback list, oldest-waiting caller on top: one screen, tap-to-call,
   one-tap logging (Reached / Left voicemail / Bad number / Signed / Not interested), a
   warm two-sentence opener for each callback (service framing, not a sales script —
   stating the reason for the call 2.1×'s success, Gong 90k-call data). Point at the wins
   strip: "callbacks worked, reached, signed — that's your work, with your name on it.
   Signatures usually follow the conversation, and the conversation started with your
   callback." Never call anything here a score; nothing grades her. Note the attempt nudge
   is encouragement grounded in the callback science (93% of conversions land by the 6th
   attempt; most firms quit at 2 — Velocify, 3.5M leads), never a quota.

4. **The morning digest (show a rendered one).** One email ~8am Pacific, only what needs
   action, forwardable without a login. On a clean day it says "N calls read, all handled"
   — exception-based is why it survives week three when every other tool's emails get
   filtered. This is the daily loop for a partner who never opens the app.

5. **The honesty pages (`/honesty`, `/compliance`) — for the skeptic and his ethics
   counsel.** "We publish the method and the two ways the model fails; we refuse to publish
   a precision number until the test corpus is documented — a number without its test set
   is the kind of thing you've been pitched before." This is the peer-forwardable artifact;
   say so: "hand it to your ethics counsel." The compliance page names Rules
   7.2/7.3/5.3/1.18/1.6, Op. 512, §632, and concedes what we *don't* claim — that concession
   is worth more than any testimonial to this buyer (copy audit DR-2).

6. **`/apply` — the exit.** A handful of fields, one button. Mutual NDA before anything
   connects; setup is a 15-minute call; free during the beta.

### When the live autopsy misfires (have this ready — it will happen)

The wow depends on a real signable-that-walked surfacing on *their* call. Two failure
modes and the graceful move for each — and note that **owning them is itself the pitch**:

- **The call scores clean (no flag).** "Good — that one your team handled right, and now
  you've watched the rubric agree with you. The flags come from *volume*: do this across a
  month of calls and the two or three that slipped show up. That's the free Leak Audit —
  ten of your own calls, next week."
- **The flag looks wrong to them (a false alarm on their own call).** Do not defend it.
  "That's exactly the feedback the beta is built on — a flag you disagree with is data, and
  we publish our false-alarm rate instead of hiding it. Tell me why it's wrong and it makes
  the rubric better for your firm." A vendor who flinches at a false alarm loses this buyer;
  a vendor who *files* it wins him.

### If the coordinator is the only audience (10-minute variant)

Skip pricing and stats entirely. Order: her queue (3) → one of her own calls scored (1) →
the digest (4). Framing throughout: "this hands you the callbacks that win, and it logs the
saves you already make — 'three signed cases came from your callbacks' is the sentence your
boss reads." Symmetric tracking matters to her: attorney follow-up is tracked the same way.
No leaderboards, no red numbers, no per-case bonus talk (barred under Rule 5.4 analogs —
recognition is the only upside the tool can honestly offer her, so lean all the way into it).

---

## PART 2 — The ROI spine (1:1, spoken, RANGES ONLY — never a point estimate, never their number)

Use these as **anchors they check against their own books**, in this order. The whole
move is: give them one verified input, let them supply the other from their own P&L, and
let *them* say the punchline sentence. You never do the multiplication.

1. **"What does a lead cost you?"** Let them answer first — their number almost always
   beats ours and it's the one they trust. The verified anchor, only if they ask ours:
   **~$284 per PI lead** (rankings.io / Pareto Legal 2026, 13 plaintiff firms, $3.3M
   spend — **VERIFIED**). Present it as "before your intake team ever picks up the phone."

2. **Cost per signed case: their division, never a figure from us.** "Whatever your
   lead-to-sign rate is, divide — that's what one signed case costs you before any work
   starts." **Do NOT supply a cost-per-signed-case dollar figure — not even as a range
   endpoint.** The published numbers in this category failed verification (copy audit P0-2;
   $284 ÷ 7% ≈ $4,057, not the $468 that was circulating — the derivation is broken). The
   honest line: "the only cost-per-signed-case number that survives checking is the one
   from your own books — your lead cost times your lead-to-sign rate. I'm not going to hand
   you a made-up one."

3. **The punchline they compute themselves.** "A signable case that walks took that
   acquisition money with it — *and* its contingency fee, which on even a modest case is
   typically **north of $10,000** (often far more). You know your average fee; you can do
   this math faster than I can. Recover a small number of walked cases a year and a flat
   annual software cost is a rounding error." **Let them say the last sentence, not you.**
   The contingency-fee anchor is presented as a floor ("north of $10,000"), never a
   specific promise and never multiplied out on a slide.

4. **Pricing, when asked.** "Free during the beta. At launch it's a flat monthly fee —
   never a percentage, never per case, never a share of any recovery." **Launch numbers
   are pending an Ali decision (BLOCKED — see `ops/decisions.md` three-way split, and the
   recommended Table C in `ops/drafts/pricing-decision-brief.md`). Do NOT improvise a
   figure and never say "one case pays for a year" as a claim** — their fee, their
   division. If pressed for a number before the decision lands: "I'll put the exact flat
   monthly figure in writing after your free audit — I'm not going to quote you a price I
   might have to change."

**Ranges-only discipline, restated because it's the thing this audience is testing you
on:** no monthly extrapolation from a sample, no vendor-computed loss, no "you're losing
$Xk a year," no cost-per-signed-case dollar, no 400%/5-minute stat (refuted, copy audit
P0-4), no $468 (refuted, P0-2). Speed stays directional: "the faster the callback, the
more of them sign." Every quantified claim is either a verified input they can check or
their own number — nothing in between.

---

## PART 3 — The 15-minute setup call (leave the call with calls flowing + the right person on the digest)

Booked in the welcome email. The CallRail mechanics live in
`ops/drafts/callrail-setup-runbook.md` — follow that runbook on the call; this is the
customer-facing shape of the quarter hour. **The call ends on a verified green check, not
hope** (the runbook's self-test), or it ends on an upload that scored — never on "should
work."

**Before the call (Ali, 2 min):** firm onboarded in `/studio`, welcome email sent, their
private webhook address on your clipboard, runbook open, terminal ready in `web/`.
Confirm migration floor **0038** is applied to hosted Supabase and `INTEGRATIONS_ENC_KEY`
is set (per-firm CallRail secret stores plaintext without it) — both in the Monday packet.

1. **Minutes 0–2 — who's who.** Confirm who answers the phones, who makes the callbacks,
   and **who should get the morning digest** (often two different people — get both
   emails). This is the single most important output of the call after calls flowing: the
   digest reaching the person who actually dials.

2. **Minutes 2–7 — connect the calls (the CallRail paste OR the upload fork).**
   Screen-share with whoever runs the phones.
   - **They use CallRail:** paste their firm's private webhook address
     (`https://plaintiffops.com/webhooks/callrail/<firm-id>`) into the **Post-Call**
     webhook field, then copy their account **signing key** into `/studio/onboard-firm`
     (per runbook steps 2–3). One signing key per CallRail account; firm #2's key is not
     firm #1's — this is the step that stops firms #2+ silently 401ing to an empty desk.
   - **They don't use CallRail (or want a head start):** skip straight to uploads — step 4
     becomes the main event. `/desk/upload` takes MP3/M4A/WAV with the required CIPA
     consent attestation; each upload runs the *same* score pipeline as the webhook, with
     per-file status (waiting → scoring → done/failed) visible to them.

3. **Minutes 7–10 — the test call (the moment it becomes real).** Place one live test
   call to their intake line while connected and run the self-test
   (`npm --prefix web run callrail:selftest -- <firm-id> --base-url https://plaintiffops.com
   --secret <their-signing-key>`). Watch the call appear on the desk together. **Do not
   skip this** — this is where the product stops being a claim. Green looks like: signed
   POST accepted 200, replay deduplicated, bad signature rejected 401. If it's not green,
   triage in the runbook's order; do not tell them "you're live" until it is.

4. **Minutes 10–12 — first upload.** Have them drag one recent recorded call into
   `/desk/upload`. Two reasons: a fallback they own forever regardless of CallRail, and a
   second real call on the desk before you hang up.

5. **Minutes 12–14 — set expectations.** The morning digest (~8am Pacific, one email,
   "all handled" days included so silence is never ambiguous); flagged callers appear the
   same day; their team changes nothing about how they answer the phone; recording consent
   stays their existing practice (we never touch it, §II). **English-intake framing for the
   beta** — the scorer is English-calibrated; make no claim of validated Spanish scoring
   (per `ops/drafts/ali-monday-packet.md` 3c).

6. **Minutes 14–15 — the ask (the beta bargain).** "For the beta the payment is feedback:
   when a flag looks wrong, tell me. When an email annoys you, tell me. Deal?" Confirm
   digest recipients one last time. Done.

**After the call (Ali, 1 min):** confirm in `/studio` the test call scored, add any extra
digest recipient, put the Day-1 note on your calendar.

---

## PART 4 — The Day-0/1/3/7 cadence (the templates live in `beta-comms-kit.md`; here is the sequencing logic)

All five templates are staged verbatim in `ops/drafts/beta-comms-kit.md` (Ali personalizes
and sends each by hand; the Day-0 welcome is the one the studio composes, sent only on
Ali's click). This section is the **trigger + purpose spine** so the cadence stays a
sequence, not a drip. House rules for every message: counts only, no dollars, exception-
based, credit-framed, honest on failures.

| When | Trigger | Job of the message | One rule that makes it land |
|---|---|---|---|
| **Day 0** | Onboarding complete | Everything-in-one-email: sign-in, the one webhook address to forward, upload fallback, first-48-hours plan, "you get Ali, not a ticket queue." | One email they *keep* — no forgotten field strands them at sign-in. |
| **Day 1** | First real calls land (webhook or upload) | Turn the first digest from a surprise into a delivery: "your calls are flowing, we read N today; tomorrow ~8am you get your first digest." | Send it *before* the first digest if possible. Nothing for them to do. |
| **Day 3** | ~72h after calls start | Catch setup friction while it's cheap + confirm the digest reaches the person who actually dials. Two 30-second questions: right recipient? opened one flag — anything look wrong? | "A flag you disagree with is exactly the feedback the beta is for." |
| **Day 7** | After a full week of calls | Mirror the desk wins strip (calls read / flagged / worked / reached / signed — counts only), hand the credit to the coordinator by name, re-open the feedback door. | "The callbacks are your team's work, not ours." No projection, no dollarizing. |
| **Incident** | Same day any processing failure touches their data or digest | Flag it before they spot it: what happened, what we did, what changes. Never wait, never soften. | Honesty on failure is the trust deposit that survives week three (§VIII). |

**The sequencing intuition:** Day-0 removes the activation blocker (getting in + calls
flowing), Day-1 makes the first digest expected, Day-3 fixes friction *before* it becomes
churn and re-confirms the digest recipient (the #1 silent-failure mode is the digest going
to someone who doesn't dial), Day-7 converts a week of use into *recognition ammunition*
for the coordinator and *counts he can check* for the partner. The whole cadence is
exception-based and credit-framed on purpose: those are the two properties the persona
field guides say keep a busy attorney's tool alive past week three.

---

## PART 5 — What actually closes (the arc, compressed)

The demo → setup → cadence arc is engineered around the two conversions that decide the
whole business (`ops/insights.md` B2): **audit → pilot** and **pilot → paid**.

- **audit → pilot** is won in Part 1: the live autopsy makes the leak *visceral and
  citable*, and the free Leak Audit ("ten of your own calls") is the low-friction yes at
  the end. The close line is the standing one: "Run it on your own calls for a month,
  free. If the flags are wrong, tell us — the false alarms are part of the deal and we
  track them in the open. The NDA comes first, nothing connects until it's signed, and
  every guardrail you saw is enforced in code. The whole ask today is ten of your recorded
  calls."
- **pilot → paid** is won in Parts 3–4: activation (calls flowing, right person on the
  digest) plus a cadence that produces, by Day 7, a coordinator with named wins and a
  partner with counts he trusts because we never inflated one. When the launch price lands
  (pending Ali), the flat monthly fee is a rounding error against a fee he already computed
  himself in Part 2.

Instrument both conversions from firm #1 — they are the two numbers `ops/insights.md` B2
says the entire $1M model hinges on.

---

## Never say (each has bounced this exact buyer — from `DEMO_SCRIPT.md` + copy audit)

- Any vendor-computed loss or ROI figure ("you're losing $84k a year").
- The "5 minutes = 400% conversion" stat — **refuted (copy audit P0-4). Never cite it.**
  Speed stays directional.
- "$468 per signed case" as a fact — **broken derivation (P0-2).** No cost-per-signed-case
  dollar at all, not even a range endpoint.
- Monthly-dollar extrapolations from any sample.
- "AI-powered" as a selling point. AI appears only in supervisory framing: "the model
  flags; a human reviews; nothing sends itself."
- Guarantees, "the only," "the best," or a published precision/error rate (we don't
  publish one yet — the calibration page says exactly why, which is the better pitch).
- A launch price figure before Ali's pricing decision lands.
- "Clients" for unsigned callers. Their vocabulary: *signable, PNC, walked, sign rate,
  statute, specials.* (Copy audit P2-1: "callers," never "prospects.")
- Any claim of validated Spanish scoring during the beta (English-calibrated engine).

---

## Risks (named plainly, per §VIII)

1. **BIGGEST RISK — the live-autopsy wow is contingent on a real signable-that-walked
   surfacing on *their* call.** If they bring a clean call, or the flag is a false alarm on
   a call they know cold, the emotional peak of the demo collapses at the worst moment. The
   "bring a call you have a feeling about" ask stacks the odds, and the two graceful moves
   in Part 1 convert both misfires into pitch — but a demo where the autopsy underwhelms is
   a demo that leans entirely on the ROI spine and the honesty pages to close. Mitigation is
   in the pre-demo ask and the misfire playbook; the residual risk is real and cannot be
   fully engineered out. Do not over-promise the wow when booking.
2. **Pricing is BLOCKED ON ALI.** The arc closes on a flat monthly figure that does not yet
   exist as a decision (three-way split, `ops/decisions.md`; recommended Table C in
   `pricing-decision-brief.md`). Every pricing beat here says "flat monthly, number in
   writing after your audit" — honest, but the pilot→paid conversion cannot actually be
   *tested with money* until Ali picks the table. This is a §VII gate, not a copy fix.
3. **Setup-call green check depends on infra Ali must set Monday** (migration floor 0038,
   `INTEGRATIONS_ENC_KEY`, per-firm CallRail secret). If those aren't in place, step 3's
   self-test fails and the call ends on "should work" — the exact silent-401-to-empty-desk
   failure the runbook exists to prevent. Gated on the Monday packet.
4. **Consent is theirs, and we must keep it theirs.** The pre-demo ask and the setup call
   both touch recorded audio; the script never designs or suggests a recording/consent
   workflow (§II). If a firm asks us to handle consent, the answer is no — it stays their
   practice.
5. **The cadence sends nothing until `EMAIL_ENABLED=true`.** Default posture transmits
   nothing and says so honestly; a gated non-send must never be presented to the firm as a
   send (enforced in `welcome-email.mjs`). Ali flips the flag only after the Monday dry-run
   to his own inbox passes.

---

## Proposed `ops/decisions.md` entry (append after Ali review — NOT appended live)

```
## 2026-07-12 — Demo→onboarding conversion script unified (sub-objective 3.3)  ·  agent: research/drafting sub-agent · lane: product/outreach
- **Change:** Staged `ops/drafts/demo-onboarding-script.md` — one conversion motion from
  first demo through daily desk use. Sequences the existing pieces (DEMO_SCRIPT.md live
  autopsy, callrail-setup-runbook + beta-comms-kit §6 setup call, beta-comms-kit Day-0/1/3/7
  cadence) into a single arc and adds the connective tissue: the pre-demo "bring a call you
  have a feeling about" ask that stacks the live-autopsy wow, the two misfire recovery moves
  (clean call / false alarm), the ranges-only ROI spine with a hard no-cost-per-signed-case
  rule, the CallRail-paste-OR-upload fork in the setup call, and the trigger+purpose spine
  for the cadence. Wow is tied to the live autopsy (sub-objective 2.2): a live score on the
  firm's OWN recorded call surfacing a signable-that-walked with verbatim quotes + tiered
  confidence.
- **Hypothesis:** a single, persona-disciplined arc (their calls / their arithmetic / their
  credit / staked score) converts audit→pilot on the visceral live autopsy and pilot→paid on
  activation + a credit-framed exception-based cadence — the two conversions ops/insights.md B2
  says decide the $1M model.
- **Expected effect:** higher demo→Leak-Audit yield and faster firm activation across the
  founding cohort onboarding from 2026-07-14; instrument audit→pilot and pilot→paid from firm #1.
  No public metric until firms onboard.
- **Status:** staged-for-approval. Ali runs the demo and sends every message by hand; the
  Day-0 welcome transmits only on Ali's click AND EMAIL_ENABLED=true (KILL_SWITCH halts all).
  Nothing here sends, publishes, or quotes a launch price.
- **Blocks / gates:** pricing decision (BLOCKED ON ALI, three-way split); Monday infra
  (migration 0038, INTEGRATIONS_ENC_KEY); EMAIL_ENABLED dry-run; English-intake-only framing
  for the beta.
- **Review date:** 2026-07-21 (after first demos + first-week cadences run).
- **Result:** (filled at review)
```

---

*Sources for every number: `ops/insights.md` B4 (verified/reported labels preserved) and
`ops/drafts/copy-audit-2026-07-11.md` (P0-2 $468 and P0-4 400% refutations). Persona rails:
`ops/insights.md` 2026-07-10 field guides. Setup mechanics: `ops/drafts/callrail-setup-runbook.md`.
Cadence templates: `ops/drafts/beta-comms-kit.md`. Intellectual spine: Meehl/Grove (actuarial>clinical),
Austin (staked attestation), Felstiner-Abel-Sarat (dispute transformation), Fricker (testimonial
injustice) — per CLAUDE.md standing instructions. If a stat isn't in those files with a verified
label, it isn't said.*

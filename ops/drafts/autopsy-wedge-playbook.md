# The 10-Call Autopsy — Wedge Playbook (B-007)

> **STATUS: DRAFT — staged for Ali. Nothing here is sent, posted, or run against a live firm
> until (a) the CIPA §632 consent gate below is satisfied for that firm, (b) the beta NDA is
> executed, and (c) any novel fee/consent talk-track language is blessed by Yang (§VII).**
> The diagnostic IS the close: we score a firm's OWN recorded calls, live, and the two or three
> signable cases that walked — with the verbatim quotes and a dollar range the *firm* computes —
> are the entire sales argument. No deck. Their calls, their arithmetic, their credit.
>
> Companion docs: `DEMO_SCRIPT.md` (the on-their-calls demo this operationalizes into a *sale*),
> `ops/drafts/develop-queue-GTM.md` (§2 Almost-Lost card, §6 objection table),
> `ops/drafts/retrodiction-onboarding-playbook.md` (the closed-case baseline session that follows
> a *signed* firm — not part of the autopsy), `ops/drafts/pricing-decision-brief.md` (Table C,
> BLOCKED ON ALI — no figure is quoted here). Persona field guides: `ops/insights.md` 2026-07-10.

---

## 0. Naming (reconcile the split flagged in decisions.md 2026-07-07)

- **Leak Audit** = the *artifact* and the self-serve surface (`/audit` → tokenized report). A firm
  can run it alone with zero human contact.
- **10-Call Autopsy** = the *founder-led live motion* — Ali walking a decision-maker through a Leak
  Audit run on ~10 of the firm's own recorded calls, on a screen-share, in real time. Same engine,
  same report; the difference is a named human independently staking a finding on the call (Analyst
  of Record, Austin speech-act model) and the live "want to see the other two?" moment that a static
  PDF can't create. **The autopsy is the Leak Audit with a pulse.**
- Public copy still says "Leak Audit" (the site is built around it). "Autopsy" is our internal name
  for the *sales choreography* and can be used aloud 1:1, but is NOT a new public claim. If it ever
  goes on the site, that's a §VII copy change → Ali. Fix the stale "30-day Leak Audit / five founding
  firms" hosted copy vs. "10-Call Autopsy" mismatch before any outreach points at the site.

---

## 1. THE COMPLIANCE SPINE (read first — it outranks the sales motion)

**CIPA / Penal Code §632 is the load-bearing wall, and it is sharper than "we don't dial."**
Verified 2026-07-11 (FindLaw §632; Cal. Legislative Info; Shouse; Seyfarth on *Smith v. LoanMe*):
California is **all-party consent**, and **one party's consent is not a defense** — *including the
firm's own*. A firm consenting to record its intake calls does **not** make the recording lawful; the
**caller** must also have consented (in practice, the "this call may be recorded/monitored" disclosure
at the outset, or continued talking after it). This changes what we can accept:

- **We only ever touch calls the FIRM recorded under the firm's OWN all-party-consent practice.** The
  consent chain is theirs, established at *their* call's outset, before the recording we receive ever
  existed. We are a downstream reviewer of an already-lawfully-recorded call, not a recorder.
- **The autopsy adds ZERO new recording and ZERO new interception.** We never dial a claimant, never
  join a live call, never score a live claimant call. Retrospective review of the firm's existing
  recordings only. This is what keeps us clean where a "listen live and coach" feature would not be.
- **The consent gate is an affirmative attestation, not a checkbox we hope covers it.** Before any
  autopsy: the firm attests, in the NDA or a one-line rider, that (i) the recordings were made in the
  ordinary course under the firm's recording-disclosure practice, (ii) the firm has the right to share
  them with a confidential vendor, and (iii) sharing does not breach any caller agreement. The `/audit`
  checkbox ("I confirm my firm has the right and any required consent to share these recordings") is
  the self-serve floor; for a founder-led autopsy, get it in writing. **If a firm cannot say its calls
  were recorded with caller disclosure, we do NOT run the autopsy on those calls — we run it on a
  role-play/sample and say so.** No exception, ever.
- **These are Rule 1.18 prospective-client confidential communications.** Same treatment as claimant
  data (§VI): audio deleted on transcription, transcripts purge within 72h of readout, deletion
  cascade on offboard, no PII in URLs/logs, secure upload surface never email for the founder-led path.
- **Novel-in-a-regulated-area → Yang.** The exact wording of the consent attestation rider and the
  live talk-track's tier/estimate language are the two highest-risk surfaces; Yang blesses both once
  before first live use (§II, §VII). The mystery-shop protocol is a *different* thing and stays
  Yang-signed and separate — do not conflate.

**Pricing rail (§I):** flat monthly only. No figure is quoted anywhere in this motion until Ali locks
one table into §I (pricing-decision-brief, BLOCKED ON ALI). "Free during the beta; a flat monthly fee
at launch — never a percentage, never per case, never a share of any recovery." Full stop.

---

## 2. THE MOTION, END TO END (with the two conversions that decide everything)

The path-to-$1M model says only two numbers matter: **conversation→autopsy** and **autopsy→paid**
(insight B2). Instrument both from firm #1. The whole motion:

```
 COLD OPEN            BOOKED              PRE-CALL             THE AUTOPSY          THE CLOSE            PAID
 (public-signal   →  (autopsy offer   →  (10 calls +       →  (live readout on  →  (free autopsy →  →  (Charter,
  1:1, firm-B2B)      accepted)           consent rider)       THEIR calls)         Charter offer)      flat fee)
   §III / B-011        metric ①            NDA + §632 gate      DEMO_SCRIPT flow     metric ②            §I / §VII
```

**Metric ① — conversation→autopsy-booked.** Target from the funnel model: ~40% of qualified
conversations become a scheduled autopsy (audit→pilot proxy). **Metric ② — autopsy→paid.** The weakest,
most valuable assumption (~50% base case; if it's really 33% the $1M slips to ~18 months). Log every
autopsy's outcome as won / stalled / lost + reason.

---

## 3. STAGE 1 — COLD OPEN → BOOKED (the autopsy is the hook, not a demo request)

Channel discipline (§III): physical mail / 1:1 email / LinkedIn / owned newsletter to **firms**, never
claimants, never blast. Concentrate on Dream 12 (the tightest ICP; insight C3), not Dream 25 — founder
hours are the binding constraint.

**The opener is the public-signal cold-open (B-011), and the ask is the autopsy, not a meeting:**

> "I'm an independent intake analyst — I score PI firms' own intake calls the way Moody's rates paper,
> flat fee, no stake in your cases. I looked at your public intake footprint [named public signal:
> LSA badge, after-hours web-form, Spanish landing page with an English-only phone tree] and I think
> you may be paying to make the phone ring and losing signable callers at the desk. I'll prove it or
> disprove it on your own calls, free: send me ten recent recorded intake calls and I'll walk you
> through, live, exactly which signable cases walked and what the fee that left with them was worth —
> your numbers, not mine. Twenty minutes. If I'm wrong, you'll have an independent all-clear on your
> intake, also worth having."

Why it books: it's a falsifiable claim about *their* data (partners read vendor claims through Rule
7.1 — an unverifiable number is a violation, not puffure; insight persona guide), it costs them one
export and twenty minutes, and the downside case ("independent all-clear") is itself a deliverable.
The autopsy is both the wedge and the demo — one motion, both jobs.

**Qualify before booking (don't burn the scarce autopsy slot):** 1–10 attorneys, paid lead flow
(LSA/PPC/TV/lead-buying — so leakage has a hard dollar cost), and **records its calls with caller
disclosure** (the §632 gate — ask on the call: "do your recordings start with a 'this call may be
recorded' notice?"). The `/apply` form already collects `records_calls` and `spanish_call_pct`; use
them. A firm that doesn't record, or records without disclosure, is not autopsy-eligible on real calls
— offer the sample/role-play path and the develop-queue thesis instead.

---

## 4. STAGE 2 — PRE-CALL (make the export trivial, lock the consent chain)

The #1 way this dies is the firm never sends the calls. Remove every gram of friction:

- **The one-sentence ask:** "Ten recent recorded intake calls — inbound, from the last two weeks,
  new-caller calls (not existing clients). MP3/M4A/WAV. Mix in a couple of Spanish-language calls if
  you take them." Ten is deliberate: enough that 2–3 leaks almost always surface, few enough that the
  export is a 10-minute job. (The `/audit` cap is 10; the analyst-reviewed autopsy honors it.)
- **Hand them the export path** (already in the `/audit` "Where to get your recordings" panel):
  CallRail → Analytics → Activity → Download MP3; RingCentral → Call Log → download; 8x8, Dialpad,
  Vonage paths listed. "No portal access? Your answering service exports these on request."
- **The consent rider goes with the NDA, before any file moves** (§1). One line, Yang-blessed. If the
  firm balks at attesting disclosure, that's a real §632 flag — do the sample path, don't push.
- **Transfer channel:** the product's own authenticated upload (`/audit` tokenized session, or the
  firm's `/desk/upload`) or a single-use secure link — **never email** for the founder-led path (§VI).
  The self-serve `/audit` uploader is fine for a firm that wants to go alone; the *autopsy* wants the
  founder present, so schedule the upload for the top of the call and watch it process live (see §5).
- **Ali's prep (30 min before):** run the ten calls through the engine ahead of time so the live call
  is a *readout*, not a wait. Pre-select the ONE best Almost-Lost card (highest fee-at-risk, cleanest
  citations, rep-did-a-lot-right) to open with, and rank the rest. Note the Spanish calls' handling
  separately (parity is a proof point, not a headline — §V). Keep `TEST_MODE=true`, kill switch on;
  part of the pitch is that the safety is on and nothing can text anyone.

---

## 5. STAGE 3 — THE LIVE AUTOPSY (what Ali does, minute by minute)

Twenty to thirty minutes, screen-share **their** report (never our sample when their calls exist),
following the DEMO_SCRIPT click-through but as a *sale*, not a tour. Read the room first: if the intake
coordinator is present, she sees HER calls before the partner sees any score, and nothing on screen is
ever called a "score" of her (persona guide: tool-as-surveillance kills adoption).

**0–2 min — frame the independence, not the software.** "Before anything: I don't answer your phones,
I don't buy you leads, I don't take a piece of any case. I'm the independent scorer — the only reason
my finding is worth anything is that I have nothing to sell you except the finding. Everything you're
about to see traces to a quote from your own call, and every dollar is a range you'll check against
your own books."

**2–5 min — process the upload live (if not pre-staged).** Watch transcribe → score on their real
call. Say plainly: "audio is never stored, transcripts purge within 72 hours, and this screen cannot
text anyone — the kill switch is on." The visible labor (per-call transcribing → scoring rows) reads
as a real analyst desk, not a black box.

**5–15 min — the ONE Almost-Lost card, exception-based.** This is the whole sale. Open with what the
rep did *well* (protects staff, disarms the partner), then the exception:

> "Your rep did a lot right on this Tuesday 2:14pm call — got the mechanism, confirmed insurance. But
> listen to 3:47 [play/quote the span]: the caller mentions 'the truck behind him,' and it's never
> followed up. That's a possible second, commercial at-fault policy. Two other case-making questions
> didn't get asked — prior treatment gap, and whether they'd already called another firm. Right now
> this is sitting in your CRM as a routine sign-up with none of those three answers, and the caller
> hasn't been called back. On what *was* said, this reads signable and it walked."

Every claim carries its citation (§IV). Confidence is tiered — "signable on what was said," not
"this is a $40k case." The tier + estimate-with-assumptions is the single highest compliance-risk
moment; keep it there, never a promised recovery.

**15–22 min — the ROI spine, ranges only, THEIR division (never our number).** In this exact order
(DEMO_SCRIPT ROI spine; every figure labeled below):

1. "What does a lead cost you?" — let them answer first. Verified anchor only if they ask ours:
   **~$284 per PI lead** (rankings.io 2026, 13 plaintiff firms, $3.3M spend — VERIFIED). Most
   partners' numbers are higher; theirs wins.
2. "Whatever your lead-to-sign rate is, divide — that's what one signed case cost you before any work.
   I won't hand you a cost-per-signed-case figure; the published ones don't survive checking [copy
   audit P0-2 — the $468 derivation is broken]. The only number that survives is the one from your
   books." Never supply a cost-per-signed-case dollar, not even as a range endpoint.
3. The punchline they say, not you: "A signable case that walked took that acquisition money *and* its
   contingency fee with it — on even a modest case typically north of $10,000 [VERIFIED-as-anchor:
   CA soft-tissue MVA fee to firm ~$8–15k mid-tier, pricing brief §3]. You know your average fee. You
   can do this math faster than I can." Recovering a *small number* of walked cases a year covers a
   flat annual software cost many times over — **let them say that sentence.**
4. Speed stays directional, never a stat: "the faster the callback, the more of them sign." Do NOT
   cite "5 minutes = 400%" — refuted under adversarial verification (copy audit P0-4); the vendor
   speed-to-lead stats that flood search are exactly what this buyer distrusts. If pressed for a
   independent-ish anchor, the honest one is a *replication target for our own benchmark*, not a claim.

**22–27 min — "want to see the other two?"** The reveal that a PDF can't do. Walk the ranked rest
briefly. Then the same call's Deadline Watch (elapsed-time urgency only — the desk never computes a
statute date; "statute tracking stays with your attorneys," decisions 2026-07-11 B-013). If the
coordinator is present, hand her the mouse on `/desk/queue` shown as HERS — her callback list, her
wins strip, tap-to-call — never a grade.

**27–30 min — the honesty pages for the skeptic.** `/honesty` + `/compliance`: "we publish the method
and the two ways the model fails; we refuse to publish a precision number until the test corpus is
documented — a number without its test set is what you've been pitched before. Hand this to your
ethics counsel." This is the peer-forwardable artifact and the independent-scorer moat made visible.

---

## 6. STAGE 4 — TRANSITION: FREE AUTOPSY → CHARTER (the close)

The autopsy *earns* the close by existing; don't oversell. The transition is a fixed offer with a real
cliff (open-ended free betas never convert; develop-queue-GTM §4c):

> "Here's what I'd do next. Run this on a full month of your own calls, free, during the beta — the
> autopsy was ten calls; a month is the honest sample that can actually clear or indict an intake
> operation. You change nothing about how you answer the phone. NDA first, nothing connects until it's
> signed, setup is a 15-minute call. At the end of the window you'll have your own instrumented number
> — signable cases flagged, callbacks your team made, cases they saved. Founding firms who convert
> before [beta cliff] lock preferred pricing for the life of the subscription. It's a flat monthly fee
> — never a percentage, never per case, never tied to any recovery. The exact number is [PENDING ALI —
> quote no figure until §I is locked]; I'll put it in writing before you decide."

**What "Charter" means once Ali locks pricing (Table C recommended, BLOCKED ON ALI):** list Core/Pro,
a cohort-capped founding rate stated *always* as a time-limited discount from list, never as the price
(pricing-decision-brief §5). Until then: **no number, aloud or in writing.** The offer is real scarcity
(founding seats) + a real deadline + a flat fee — the mechanics close, not a discount we can't quote.

**The agreement (flat monthly, never outcome-tied):** short term, clear scope, CIPA consent chain +
deletion cascade on offboard, Ali as **Analyst of Record / independent scorer — not a fee participant**,
no recovery guarantee. Novel fee/consent wording → Yang; Ali sends (§VII). Nothing auto-executes.

---

## 7. OBJECTION HANDLING (inherits develop-queue-GTM §6; autopsy-specific)

- **"These are just cherry-picked calls."** → "They're *your* calls, picked for the clearest evidence,
  and I'll tell you exactly why each one's flagged from the transcript. A month of calls is how you
  find out if it's a pattern — that's the beta. I'd rather you distrust ten and test a hundred."
- **"How is this not CallRail / my CRM?"** → "Those store the call; they don't tell you which
  case-making question got skipped, and their QA field is filled by the same person who took the call —
  self-grading. I'm the independent scorer, and I have no product the score could flatter." (D1 moat.)
- **"Will this get me a bar complaint?"** → "The opposite — it's built on the compliance line: flat fee
  never a cut of recovery, independent not a fee participant, every finding cites the transcript,
  methodology reviewed by a former Deputy Chief Trial Counsel of the State Bar. I never touch your
  callers or your consent; I review calls you already recorded lawfully."
- **"My staff will hate being graded."** → "Nothing here grades a person. The unit is the *case that
  almost leaked*, not 'Maria missed four questions.' Your coordinator gets a callback list that makes
  her look good and a wins tally for Friday's meeting — recognition, not a report card." (Persona guide;
  per-case bonuses are ethically barred, so recognition is the only upside the tool can offer her.)
- **"What's it cost?"** → "Free during the beta. At launch, a flat monthly fee — never a percentage,
  never per case, never a share of any recovery. I'll put the exact number in writing before you
  decide; I won't improvise it on a call." (No figure until §I is locked.)
- **"We don't record our calls / not sure about consent."** → "Then I won't run this on your real
  calls — that's the §632 line and I hold it. I'll show you the same thing on a sample so you can see
  the method, and if you start recording with a disclosure we can do the real autopsy later." (This
  answer *builds* trust — the partner sees you refuse the sale on principle.)

---

## 8. INSTRUMENTATION (every autopsy feeds the North Star)

Trace to `ops/metrics.md` input metrics. Log per autopsy:

- **Booking:** conversation→autopsy-booked (metric ①); channel + public-signal used; qualified y/n.
- **The call:** # calls scored, # signable-walked found, top card's fee-at-risk *range*, Spanish calls
  present y/n + their handling (beta test #4 — the 5 firms' call-language mix; insight 2026-07-10).
- **The close:** autopsy→Charter-signed (metric ②), or stalled/lost + reason (the reason is the
  product-market-fit signal). Time-to-close from autopsy.
- **The false-alarm honesty loop:** if the firm says a flagged call was *not* actually signable, log it
  — the false-alarm rate is part of the deal and we track it in the open (§IV; it's also what earns the
  eventual published precision number). This is a feature of the pitch, not a leak.

Two autopsies per firm across the beta cohort become the case-study factory: 2–3 permissioned,
de-identified Almost-Lost cards + the first honest read on autopsy→paid conversion.

---

## 9. THE BIGGEST RISK (named, not smoothed — §VIII)

**Autopsy→paid conversion is unproven and it's the number the whole $1M rests on.** The base case
assumes ~50%; if a free, vivid, evidence-rich autopsy on a firm's own losses converts at 33% instead,
the $1M is an 18-month story, not 12 (insight B2/B3). The autopsy is *designed* to attack exactly this
— a specific, cited, their-dollars loss is the strongest close available to a founder with no logos —
but it is a hypothesis until firm #1. **Mitigation:** the fixed-window free month + founding cliff
forces a decision (no open-ended free betas), and instrumenting metric ② from the first autopsy means
we'll know the real rate within the first 3–5 closes, early enough to re-price or re-sequence. The
secondary risk is the §632 consent gate quietly getting skipped under sales pressure on a firm that
records without disclosure — the mitigation is that the gate is an *affirmative written attestation*
tied to the NDA, and the honest "we don't record → sample only" answer is scripted as a trust-builder,
not a lost sale.

---

## 10. PROPOSED `ops/decisions.md` ENTRY (paste on approval; do not append live)

```
## 2026-07-12 — 10-Call Autopsy productized as the founder-led wedge (B-007)  ·  agent: research/drafting sub-agent · lane: outreach→product (GTM)
- **Change:** Staged `ops/drafts/autopsy-wedge-playbook.md` — the end-to-end motion for the
  10-Call Autopsy: public-signal cold-open → autopsy offer → 10 of the firm's OWN recorded
  calls (consent rider + NDA) → live founder-led readout on THEIR calls (exception-based,
  credit-framed, ranges-only ROI anchored to ~$284/lead VERIFIED, their own division) →
  fixed-window free month + founding cliff → Charter (flat fee, no figure until §I locked).
  Reconciles naming: Leak Audit = artifact/self-serve; 10-Call Autopsy = the live sales
  choreography. Sharpens the CIPA §632 gate: one-party consent (incl. the firm's own) is NOT
  a defense in CA — we only accept calls the firm recorded under its own all-party-disclosure
  practice, add zero new recording, never score a live claimant call, and require an
  affirmative written attestation before any file moves.
- **Hypothesis:** a cited, their-dollars, live diagnostic on a firm's own losses is the
  strongest close available pre-logos and attacks the two conversions that decide $1M
  (conversation→autopsy, autopsy→paid; insight B2).
- **Expected effect:** metric ① conversation→autopsy-booked ~40%; metric ② autopsy→paid
  (instrument from firm #1 — the base-rate risk). First autopsies in the founding cohort.
- **Status:** staged-for-approval. Gates (§VII): Ali locks one pricing table into §I before any
  figure is quoted; Yang blesses the consent-attestation rider + the live tier/estimate talk
  track before first live use; NDA executed per firm; §632 gate satisfied per firm.
- **Review date:** 2026-08-06 (after first autopsies + first Charter conversations).
- **Result:** —
```

---

*Sources for every number: `ops/insights.md` B4 (verified/reported labels preserved),
`ops/drafts/copy-audit-2026-07-11.md` (P0-2, P0-4 refutations), `ops/drafts/pricing-decision-brief.md`
§3 (fee ranges). §632 all-party / one-party-not-a-defense verified 2026-07-11 against FindLaw Cal.
Penal Code §632, Cal. Legislative Information, Shouse Law, and Seyfarth on Smith v. LoanMe. rankings.io
2026 (~$284/lead, 13 firms, $3.3M spend) re-verified 2026-07-11. If a stat isn't in those files with a
verified label, it doesn't get said in the autopsy.*

# Yang Review Packet #2 — Consolidated Compliance Review (Wave 9, 2026-07-10)

> **STATUS: STAGED DRAFT — Ali sends (§VII).** Nothing below has been published, used with a
> prospect, or built. Attach: `lacba-five-questions-piece.md` (the one full document appended —
> strip its internal QC header and author's notes before sending; items 2–5 are summarized here
> with the specific questions, underlying files available on request). Per the outreach-note
> ground rules: she sets terms, no implied endorsement, honesty over technique.
>
> **Staging notes (not part of the send):**
> 1. Q0 implements the engagement-posture ask — surfaced once in the cover note, then dropped;
>    whether to include it is Ali's call.
> 2. No pricing content anywhere in the packet per the standing gate — the three-way
>    price-table conflict is Ali's open decision (see decisions.md) and was deliberately excluded.
> 3. Body ≈1,190 words excluding these notes and the appended LACBA piece.
> 4. Sources for items 2–4 if she asks: `intake-fact-sheet-spec.md` §5,
>    `retrodiction-onboarding-playbook.md`, `competitive-supio-battlecard.md` §§3–4,
>    `engine-v2-EXECUTIVE-SUMMARY.md` "Compliance STOPs."

---

**To:** Roberta M. Yang
**From:** Ali Ansari, Intake QA / Plaintiff Ops LLC
**Date:** July 10, 2026
**Re:** Second review packet — five items, one sitting, eight numbered questions

## Cover note

Roberta —

Thank you again for your read of the mystery-shop protocol and the clearance memo. Rather than send you five scattered asks, I've consolidated everything that has accumulated since into one packet, built so you can answer it in a single sitting. Every question is numbered (Q1–Q8) and framed for a yes/no or one-sentence answer; reply inline or by a short call, whichever you prefer.

What's changed since the last packet: (1) the engine research concluded, and the verdict was to *not* build a case-value prediction engine — we ship a "conveyor," a QA layer that checks whether intake reps asked the case-making questions and tracks unresolved ones to an owner and a clock, with no dollar values and no terminal decisions; (2) we're in a free beta with a founding cohort — pricing removed, no guarantees offered, checkout disabled; (3) **everything in this packet is staged — nothing has shipped, posted, or been said to a prospect.** Items are ordered by priority; item 5 is FYI only.

One housekeeping question up front, surfaced once and then dropped: this has grown from a two-document favor into a standing stream of review work. **Q0 (yes/no):** would you be open to a small paid advisory arrangement, at your usual rate and on your terms? A yes and I'll follow your lead entirely on scope and paper; a no changes nothing about how carefully I'll use your time.

---

## 1. LACBA methodology piece (highest priority — public, under my name)

**What it is.** A methodology article for the LACBA channel — "The Five Case-Making Questions Most PI Intake Calls Never Ask" — covering caller-side UM/UIM (Prop 213), treatment payment source (*Howell*), comparative-fault facts, employer/rideshare/government-defendant status (Gov. Code §911.2), and priors, each with a suggested verbatim phrasing a non-lawyer rep can use, plus a sidebar telling firms how to self-audit 20 of their own recordings. It has passed two internal adversarial QC passes; the full text is appended. Three items we could not self-clear:

- **Q1 (short answer).** The self-audit sidebar's protective caveat is one line: *"have a lawyer direct the audit and label the tally attorney work product — treat it like any other self-evaluative document."* Is that adequate for an audit we're inviting firms to run on their own recordings, or does it need strengthening (or the audit instruction removal)?
- **Q2 (yes/no + fix if no).** The piece publishes verbatim rep phrasings, each bracketed with an explicit facts-not-interpretation rule ("the rep records the answer, never says what Prop 213 means"). Authored by a non-lawyer vendor: does publishing suggested scripts in this frame create UPL or aiding-UPL exposure?
- **Q3 (yes/no).** The ~150-word teaser posts to a bar-association listserv under my name. The free 20-call offer was already removed from the bio and moved to 1:1 follow-up (with NDA and consent-chain language). Is the remaining teaser-plus-bio within acceptable vendor-participation bounds, or does it still read as solicitation?

**Risk if wrong.** This is public legal commentary under my name in front of exactly the audience we serve — a UPL or solicitation misstep here is reputationally unrecoverable and, post-SB 37, privately actionable.

**Our position.** Content is cite-checked and we believe the frame holds; it does not post until your read, a check of the listserv's vendor-content policy, and my own final press of the button.

## 2. Intake Fact Sheet — confidentiality and transfer posture

**What it is.** A spec (not yet built) for an export of cited intake facts on *signed* cases only — every fact tied to a transcript span, no conclusions, no values, no computed deadlines — which the firm may hand to its demand vendor or paralegal. Our posture: we deliver to the authenticated firm only and never transmit to any third party; onward disclosure is the firm's act under its own Rule 1.6 authorization and Rule 5.3 vendor-supervision duties; the signed-only gate is our Rule 1.18 mitigation; third-party PII defaults to the most conservative setting; the deletion cascade covers generated sheets.

- **Q4 (short answer).** Is "our duty ends at firm-eyes-only delivery; onward transfer is the firm's Rule 1.6/5.3 act" the right allocation, or should our contract accept some defined subagent duty?
- **Q5 (yes/no).** Does restricting the export to signed clients genuinely moot the Rule 1.18 prospective-client exposure for this artifact, given the underlying scored calls include non-signed callers?

**Risk if wrong.** This posture becomes contract language and product architecture; if misallocated, we cause firm-side confidentiality exposure and rebuild.

**Our position.** Firm-eyes-only, pull-only, signed-only; we will not build until the posture is confirmed.

## 3. Retrodiction onboarding session — data handling

**What it is.** A 30-minute guided session where a beta firm exports 24 months of closed-case financials — case numbers, case types, dates, end states, and dollars; no client names requested, no SSN/DOB/medical/contact accepted — and we compute a descriptive firm baseline. Framing: the data is *pseudonymous, not anonymous*, treated as confidential client data under the beta NDA; PII columns are deleted live on the firm's own screen before transfer; transfer only via authenticated upload, never email; hard gate — no session before the NDA is executed. Confidential settlements: the firm bands or excludes those rows at its election.

- **Q6 (short answer).** Is "pseudonymous case-level financials, confidential under NDA, minimum-necessary" the right frame — or does disclosure of settlement figures keyed to case numbers require anything more from the firm's side (e.g., specific Rule 1.6 authorization) before they may share it with us at all?
- **Q7 (yes/no).** Is band-or-exclude at the firm's election an adequate control for confidentiality-claused settlements?

**Risk if wrong.** We would hold settlement economics for hundreds of closed matters; if the disclosure itself breaches the firm's duties or a settlement clause, we induced the breach.

**Our position.** NDA-gated, no session run yet, banded fallback built in.

## 4. Supio talk track — comparative claims discipline

**What it is.** An internal battle card answering "isn't this what Supio does?" — comparative statements about a well-funded competitor, spoken aloud by a non-lawyer vendor to lawyers. Discipline applied: every factual claim tagged verified / inference / unverified against Supio's own published materials; a "never say" landmine list (no bias accusations, no "only," no unpublished-pricing claims); anything unverified voiced only as "we haven't seen it published."

- **Q8 (yes/no + flag any line).** Is the verified/inference/absence discipline sufficient for spoken comparative claims — Rule 7.1 doesn't bind us directly, but truthful-comparison and trade-libel norms do — and is there any answer in the talk track (§4 of the card) you would strike or rephrase?

**Risk if wrong.** A false comparative statement about a $91M-funded competitor is trade-libel/UCL exposure and a credibility loss with the exact buyers we're courting.

**Our position.** Verbal use only, and only after your read; nothing comparative goes to a prospect in writing.

## 5. FYI appendix — standing engine-v2 hard-STOPs (no action now)

For your file, so nothing surprises you later: the frozen engine-v2 program carries six standing STOPs, all routed to you *before* any future freeze-lift ship — no terminal auto-decline; no case-value dollars at intake; deadlines as generic reminders, never computed dates; the over-conversion signal aggregate, short-TTL, work-product framed, never a named-staffer durable record; refer-out never monetized through Intake QA (the B&P §6152/SB 37 anti-capping tripwire); and three fairness fixes (missing signal never scored against the caller, lay-vocabulary parity, per-language disparate-impact audit). **No question attached — these come to you as a formal review if and when the freeze-lift decision is made.**

---

That's the packet: Q0 plus Q1–Q8, one document appended, everything else summarized with sources available. Thank you — I'd rather build this slowly and correctly than explain it later, and your reads are a large part of why that's possible.

Best,
Ali

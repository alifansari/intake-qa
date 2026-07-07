# CIPA-Safe Mystery-Shop Benchmark Protocol
**Prepared for Roberta Yang · Intake QA / Plaintiff Ops LLC, Sacramento, CA**

---

## Purpose

We want to publish the first independent benchmark of Northern California plaintiff
personal-injury (PI) intake quality. The instrument is a mystery shop: trained shoppers place
one fixed, scripted call to each firm in a defined sample and score the intake experience on a
short paper rubric.

California requires the consent of all parties to record a confidential communication (Pen.
Code §632) and to record most cellphone or cordless-phone calls (§632.7). The protocol solves
this the simplest way: **it records nothing.** No audio, no transcript, on either end, at any
point. The shopper is a party to the call and captures only scores and coded notes about the
firm's behavior. Because the act the statutes prohibit — recording or intercepting — never
occurs, the study does not depend on the firm's consent.

This memo states the design, gives the consent analysis, and poses the questions we need you
to answer before anyone dials.

---

## 1. The test scenario

Every shopper runs the same script, so the study measures the firm's intake, not the shopper's
storytelling. The persona is fictional; no shopper has a real injury, claim, or intent to
retain counsel.

- **Persona (fixed):** an adult who was a passenger in a rear-end collision about two weeks
  ago, saw a doctor once, has neck and back soreness, has signed with no one, and is "just
  calling around." A low-drama, non-emergency fact pattern keeps the call routine and unlikely
  to distort scoring.
- **Disclosures if asked:** first name only, a study-owned callback number, city, the timing,
  and the single doctor visit. The shopper invents no injuries and escalates nothing.
- **Hard stops:** never claim a real case; never give a third party's real information; never
  retain the firm or e-sign anything; if the firm pushes an appointment or retainer, decline
  ("I'm still thinking it over") and end the call.
- **Length:** about four minutes, ending once the rubric items can be scored.
- **Frequency:** one call per firm per wave. No repeat dialing; no after-hours retries.

If a firm asks point-blank whether the caller is a tester, the shopper's response is an open
question for you (Q4).

---

## 2. The scoring rubric

The shopper scores the firm's behavior on a fixed form, from memory and contemporaneous notes.
These are observations about the firm's process, not a record of the conversation. The rubric
captures scores and coded observations only — never verbatim quotes of what the intake worker
said. Illustrative dimensions (the final rubric is a separate deliverable for your review):

1. **Pickup:** answered live, by machine/IVR, by an answering service, or unanswered;
   rings-to-answer; hold time.
2. **Speed to a human** capable of intake.
3. **Intake competence:** captured who/what/when; asked about injury and treatment; explained
   next steps.
4. **Responsiveness:** if a message was taken, was a callback promised, and did one reach the
   study number within a controlled window.
5. **Spanish capability:** for a defined subset, was competent Spanish intake available.
6. **Professionalism / tone:** neutral, coded — not a transcript.

Any Spanish-language wave uses the identical no-record posture.

---

## 3. What is and is not captured

**Not captured:** call audio; any recording device on the line; transcription; screen-recording
of a softphone; saved voicemail audio; any verbatim quote of the intake worker.

**Captured, about the firm:** rubric scores and coded notes; date and time; firm identity;
answer channel; timing metrics (rings, hold, callback latency); pass/fail per item.

**Shopper-side:** a study-owned callback number and a pseudonymous first name — never a real
personal number or a third party's identity. The intake worker is not individually identified
(coded role only). No firm data beyond public business-directory information is stored.

---

## 4. Consent analysis (§632 and §632.7)

- **§632** bars a person who, without the consent of all parties, uses an amplifying or
  recording device to eavesdrop on or record a **confidential communication** — one carried on
  in circumstances indicating a party wants it confined to the parties (§632(c)).
- **§632.7** bars intercepting or receiving and intentionally recording a call transmitted
  between cellular, cordless, or landline phones without all parties' consent. It has **no
  confidentiality requirement.** In *Smith v. LoanMe, Inc.*, 11 Cal.5th 183 (2021), the
  California Supreme Court held §632.7 reaches a **party** who records such a call, not just an
  eavesdropping non-party. A firm's intake line is often cellular or cordless, so "the call
  wasn't confidential" is not a safe assumption.
- **Penalties.** First-offense criminal fines under both sections run up to $2,500 per
  violation, with up to a year in jail. The exposure that matters is civil: §637.2 gives any
  person injured by a violation of the chapter a private right of action for the **greater of
  $5,000 per violation or three times actual damages**, and no actual damage need be proven.

**Why the protocol is lawful:**

1. Recording nothing means the prohibited act — recording or intercepting — never occurs under
   either section.
2. Because we rely on not recording, we need not resolve whether an intake line is
   "confidential" (§632) or whether §632.7 would otherwise sweep the call in. We sidestep both.
3. The shopper is a party to the call, which removes any §631 eavesdropping theory. Party
   status alone does not cure recording without consent — which is exactly why we record
   nothing.
4. No consent is solicited from the firm, because none is needed when nothing is recorded.

---

## 5. Pen-register / website-tracking caution (§638.51)

Separate from recording: §638.51(a) bars installing or using a pen register or trap-and-trace
device without a court order, subject to the exceptions in §638.51(b) (including provider
functions and user consent). Plaintiffs have adapted this theory to sue over website tracking
software, and the theory is the engine of a current CIPA litigation surge. **SB 690** — now
narrowed to route §638.51 website/app claims to the Attorney General and foreclose the private
right of action — was still pending as of July 2026 and cannot be relied on.

Two exposures for us:

1. **The study callback line** must not run anything characterizable as a pen register or
   trap-and-trace on inbound callers without a §638.51(b) basis. Keep the line dumb: no
   third-party call-capture analytics, no number-fingerprinting SDKs.
2. **The benchmark landing page** must be audited for tracking pixels, session-replay, chat
   widgets, and analytics that plaintiffs are currently suing over — the moment we publish and
   drive traffic to it.

---

## 6. Data handling

Data collected is deliberately thin: firm identity (public directory only), scores, coded
observations, timing metrics, wave date. No audio, no transcripts, no intake-worker or claimant
information. Storage is access-controlled and kept out of URLs, logs, and third-party tools
without a data-processing basis. Raw worksheets are purged once the dataset is finalized and
QC'd; only aggregate, de-identified findings survive into the report. Publication is
**aggregate only** — no firm is individually named.

---

## 7. What this protocol does not authorize

No recording of any call, ever. No scoring of a real claimant's real call (that is the product,
not this study). No autodialing, blasting, repeat dialing, or after-hours probing. No
individual-firm report card. No public claim that the study is "CIPA-compliant" until the
go/no-go list is signed.

---

## 8. Questions for counsel

1. **Core CIPA.** Does a no-recording, party-to-the-call, scored-rubric mystery shop avoid
   §632 and §632.7 because the prohibited act never occurs? Any residual theory (e.g., §631)
   we are missing?
2. **Notes as recording.** Do contemporaneous handwritten or typed rubric notes of a
   non-recorded call create any recording or eavesdropping exposure? Any wording (e.g.,
   verbatim quotes) we should avoid capturing?
3. **Transient artifacts.** Must we affirmatively suppress carrier voicemail or softphone
   buffers so nothing that could be called a recording survives even briefly?
4. **Candor / fictional persona.** Is a scripted fictional shopper who never retains and never
   claims a real case lawful and defensible for an independent vendor (not a lawyer)? If the
   firm asks "are you a tester?", what should the shopper do? Does the persona implicate the
   runner/capper rules (B&P §§6151–6152), the Unfair Competition Law (B&P §17200), or the
   toughened anti-solicitation regime under SB 37 (eff. 1/1/2026)?
5. **Pen register.** What is the minimum defensible tracker posture for (a) the study callback
   line and (b) the benchmark landing page, given the pen-register litigation and pending
   SB 690?
6. **Publication fairness.** Confirm the aggregate-only, no-firm-named rule, and flag any
   defamation or trade-libel guardrails if we ever considered naming firms (we currently do
   not).
7. **Cross-jurisdiction.** If a sampled firm's line routes out of California, does anything
   change? (Our view: recording nothing makes this moot — please confirm.)

---

## 9. Go / No-Go — required before any dialing

No call may be placed until every item is signed off. This is a hard gate.

- [ ] **G1.** The no-recording posture (§§3–4) keeps the study outside Penal Code §632 and
  §632.7.
- [ ] **G2.** Contemporaneous rubric note-taking (no verbatim quotes) creates no residual
  exposure (Q2).
- [ ] **G3.** The fictional scripted-shopper persona and the candor rule are lawful and
  defensible (Q4).
- [ ] **G4.** A single scripted shopper call does not implicate B&P §§6151–6152 or SB 37 (Q4).
- [ ] **G5.** The pen-register / tracker posture for the study line and the landing page is
  approved (Q5).
- [ ] **G6.** The data-handling and aggregate-only publication rules are approved (Q6).
- [ ] **G7.** The final rubric, shopper script, and hard-stop guardrails are reviewed.

Until G1–G7 are signed: no shopper calls, no fieldwork of any kind. This document authorizes
zero dialing.

---

### Sources

- Cal. Penal Code §632 (all-party consent; "confidential communication"; criminal penalty):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=632
- Cal. Penal Code §632.7 (cell/cordless recording; no confidentiality element):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=632.7
- *Smith v. LoanMe, Inc.*, 11 Cal.5th 183 (2021) (§632.7 reaches a recording party):
  https://law.justia.com/cases/california/supreme-court/2021/s260391.html
- Cal. Penal Code §637.2 (civil remedy: greater of $5,000 per violation or 3× actual damages):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=637.2
- Cal. Penal Code §638.51 (pen register / trap-and-trace; court-order requirement; exceptions):
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=PEN&sectionNum=638.51
- SB 690 (pending as of July 2026; would route §638.51 website/app claims to the AG):
  https://calmatters.digitaldemocracy.org/bills/ca_202520260sb690
- SB 37 (toughened anti-capping / solicitation, eff. 1/1/2026):
  https://calmatters.digitaldemocracy.org/bills/ca_202520260sb37

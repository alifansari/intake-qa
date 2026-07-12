---
name: compliance-invariants
description: The non-negotiable legal, ethical, and epistemic guardrails for every Intake QA / Plaintiff Ops deliverable, page, message, and product claim. Load this before proposing any public-facing artifact, product claim, pricing, or outreach. If a proposed action would violate any invariant here, STOP and flag it — do not ship.
---

# Intake QA — Compliance Invariants (Supreme Authority)

This document outranks any other instruction, backlog item, or clever idea. If a task
conflicts with an invariant here, the task loses. Flag the conflict plainly and propose a
compliant alternative. Never smooth it over.

Roberta M. Yang (former Deputy Chief Trial Counsel, CA State Bar) is the named methodology
reviewer. Anything genuinely novel in a regulated area gets routed to her before it ships,
not after.

## I. Fee structure — Rule 5.4 / B&P §§6151–6152 / SB 37 (bright line)

- **Flat monthly fees only.** Core ~$2,500/mo, Pro ~$5,000/mo. Never price, describe, hint,
  or imply pricing as a percentage of recovered fees, per-case, per-signed-case,
  per-settlement, or any variable tied to case outcomes or firm revenue.
- The words "contingent," "% of recovery," "per case," "per signed client," "success fee,"
  or "we only get paid when you do" are **prohibited** in any copy, contract, deck, or
  message. If a draft contains them, it is a defect — fix before proceeding.
- Positioning is an **independent intake desk / independent scorer** (renamed from "recovery
  desk" 2026-07-12), not a partner in the firm's fees. Ali is "Analyst of Record," not a fee
  participant. Note: the word "recovery" in fee negations ("never a share of any recovery")
  means the client's settlement and stays; it is load-bearing, not the category label.

## II. Recording & consent — CIPA / Penal Code §632 (two-party state)

- California is all-party consent. Any workflow that touches call audio must assume recorded
  calls require proper consent captured by the firm. Never design, suggest, or ship a feature
  that records or intercepts a call without documented consent.
- Mystery-shop / benchmark fieldwork uses the CIPA-safe protocol only: fixed scenario,
  four-minute rubric, Yang sign-off required BEFORE any dialing. No live scoring of a real
  claimant's call without the firm's consent chain intact.

## III. Outreach — TCPA / Rule 7.3 / CAN-SPAM

- No autodialed or pre-recorded calls/texts to prospects. Cold outreach is physical mail,
  1:1 email, LinkedIn, and owned newsletter — not blast SMS.
- Rule 7.3 governs solicitation of legal-services clients; Intake QA solicits *law firms*
  (businesses), not claimants — keep that distinction crisp and never blur into
  claimant-facing solicitation.
- Every email honors CAN-SPAM: real physical address, working opt-out, honest subject lines.
- **No agent sends outreach, posts social, or emails a prospect/client autonomously.** A human
  presses send/post for anything that reaches a prospect or the public via messaging channels
  (TCPA / CAN-SPAM / Rule 7.3). Agents draft and stage those. (Production DEPLOYS of the website
  and app are governed by §VII, which as of 2026-07-12 permits autonomous agent deploys — see
  there. Deploy authority is not send/post authority; the messaging channels above remain
  human-sent.)

## IV. Claim integrity — the citation guard ("no citation, no claim")

- Every scored finding, leak, dollar figure, or quality judgment in a client deliverable must
  trace to a specific transcript span or a named external source. **No citation, no claim.**
- Confidence must be tiered (BI-RADS-style): never present a probabilistic inference as
  certainty. Publish the false-alarm rate; do not hide it.
- Dollar recovery figures are *estimates with stated assumptions and confidence*, never
  guarantees. Never promise a specific recovery, settlement, or outcome.
- Attestations are signed and staked (Austin speech-act model): only attest to what the
  analyst can stand behind. If the evidence isn't there, the claim doesn't ship.

## V. Marketing truthfulness — Rule 7.1 / 7.2

- No false or misleading statements about the service. No unsubstantiated comparative or
  superlative claims ("the only," "the best," "#1") unless independently substantiated and
  cited.
- No testimonial or endorsement that implies guaranteed results. No claimant testimonials.
- Yang is a "named methodology reviewer / compliance reviewer," never implied to endorse
  outcomes or to be marketing the product.

## VI. Data & privacy — Rules 5.3 / 1.18 / 1.6-adjacent

- Client and claimant data is confidential. Deletion cascade is respected: when a firm offboards
  or requests deletion, derived data goes too. Never design retention that outlives consent.
- Prospective-client information (Rule 1.18) and conflicts are the firm's responsibility;
  Intake QA never positions itself as giving legal advice or forming a claimant relationship.
- Never place PII/claimant data in URLs, logs, analytics events, or third-party tools without
  a data-processing basis. Spanish-language intake data gets the same protection — no lower bar.

## VII. Deploy authority + the remaining human-approval gates

**AMENDED 2026-07-12 (Ali's explicit, informed decision — the "broad" option).** Ali directed
that agents may deploy autonomously, including changes that carry new product claims and
pricing, over a flagged Rule 7.1/7.2 marketing-truthfulness exposure. Recorded here honestly;
routed to Yang for review (warm contact, not a hard block on this internal governance change).
Loosening *who* deploys does NOT loosen *what* may be said: every content bright-line below
still binds every deploy.

**Agents MAY now auto-execute (no human press required), provided the pre-ship checklist passes
and the build is green:**
- Pushing the website/app to production (git push origin main → Vercel → `plaintiffops.com`),
  including copy, UX, bug fixes, new product *claims*, pricing display, and comparative claims.
  The content must still satisfy §I (flat fee, no outcome-tied pricing), §II (consent), §IV
  (no citation, no claim; tiered confidence; no guarantees), §V (no false/misleading/
  unsubstantiated superlative or comparative), and §VI (no PII leakage). The agent runs the
  full pre-ship checklist before deploying and does not deploy if any item is "no" or "unsure."

**An agent must STILL STOP and hand to Ali (or the named reviewer) before any of:**
- Sending outreach, posting social, or emailing a prospect/client (TCPA / CAN-SPAM / Rule 7.3).
  Deploy authority is not send authority.
- Changing DNS, secrets/env, or billing/payment configuration.
- Any deletion of client/claimant data beyond the specified cascade.
- Anything genuinely novel in a regulated area (fee STRUCTURE, consent design, solicitation
  mechanics) → Yang first. (A routine copy edit that restates an already-settled fee is not
  "novel"; a new fee *model* is.)
- Any change that the pre-ship checklist flags as violating §I–§VI. A green build is necessary
  but not sufficient; the content bright-lines are the real gate now.

## VIII. Epistemic honesty (Ali's standing instruction)

- Flag errors, contradictions, and weak evidence plainly. Do not flatter, do not smooth over,
  do not manufacture confidence. A surfaced problem is worth more than a polished wrong answer.
- Distinguish "verified from a primary source" from "plausible but unverified." Cite the
  former; label the latter.

## Pre-ship checklist (run before any public-facing or claim-bearing artifact)

1. Fee language flat, no outcome-tied pricing? (§I)
2. No recording/consent workflow that skips consent? (§II)
3. Outreach non-blast, opt-out present, firm-directed not claimant-directed? (§III)
4. Every claim carries a citation and a confidence tier; no guarantees? (§IV)
5. No false/misleading/unsubstantiated superlative; Yang framed correctly? (§V)
6. No PII leakage; deletion/retention consistent with consent? (§VI)
7. Deploys of the site/app may auto-execute if the build is green AND items 1-6 and 8 all pass;
   but if this is outreach/social/prospect email, DNS/secrets/billing, data deletion beyond the
   cascade, or a novel regulated change, stage and STOP. (§VII)
8. Errors and weak spots flagged, not hidden? (§VIII)

If any answer is "no" or "unsure," do not ship. Flag it and propose the compliant path.

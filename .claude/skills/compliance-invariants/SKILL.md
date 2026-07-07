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
- Positioning is an **independent recovery desk / independent scorer**, not a partner in the
  firm's fees. Ali is "Analyst of Record," not a fee participant.

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
- **No agent sends, publishes, or posts anything.** Agents draft and stage. A human presses
  send/publish/post. This mirrors the 7-gate human-approval chokepoint.

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

## VII. Human-approval gates (never auto-execute)

An agent must STOP and hand to Ali (or the named reviewer) before any of:
- Sending outreach, publishing web content, posting social, or emailing a prospect/client.
- Pushing to production, changing DNS, or altering `plaintiffops.com`.
- Shipping any new product *claim*, pricing change, or contract language.
- Any deletion of client/claimant data beyond the specified cascade.
- Anything novel in a regulated area (fee structure, consent, solicitation) → Yang first.

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
7. Does this cross a human-approval gate? If yes → stage and STOP. (§VII)
8. Errors and weak spots flagged, not hidden? (§VIII)

If any answer is "no" or "unsure," do not ship. Flag it and propose the compliant path.

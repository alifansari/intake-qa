# Hypothesis Backlog

> The one prioritized queue. Every agent pulls from here; nothing gets built ad hoc. Each item
> is a testable hypothesis, not a task ("If we do X, metric M moves because of insight I").
> Scored by ICE: Impact (1–10) × Confidence (1–10) × Ease (1–10), then sorted by score.

## Format

```
### B-NNN — [title]  ·  ICE: I×C×E = score  ·  lane: product|website|outreach|research
- **Hypothesis:** If we ___, then [metric] moves because [insight ref].
- **Deliverable:** what "done" looks like (a draft/PR, never a published thing).
- **Status:** queued | in-progress | staged-for-approval | shipped | killed
- **Result:** (filled in after review) did the metric move? keep/kill/iterate.
```

## Rules

- Keep this list short and ruthless. Kill stale items. A backlog of 50 is a backlog of 0.
- Every item names the insight it rests on (from `ops/insights.md`). No insight → weak hypothesis.
- Builders stage; they never publish. "Done" = staged for Ali's approval + logged in decisions.

## Current priority order (re-sequenced 2026-07-07 — REVENUE-FIRST)

Speed-to-first-revenue now outranks authority-building. Rationale + full item specs in
`decisions.md` → "2026-07-07 Strategic reprioritization." Benchmark demoted: it's a
months-to-pay-off authority asset, not a first-revenue lever, and will be seeded by
paying-firm autopsy data later.

1. **B-007** — 10-Call Autopsy wedge (score their OWN recorded calls live; the diagnostic IS the close)
2. **B-008** — Paid "Charter Firm" offer replaces the free pilot [PRICING → Ali / §VII]
3. **B-010** — $25k find-it-free guarantee as the offer centerpiece (risk reversal) [→ Yang framing]
4. **B-009** — Dream 12 (concentrate founder-hours) + autopsy-led outreach
5. **B-005** (315) — regulatory-clearance memo → retained review (gates public claims/seal/index)
6. **B-011** — public-signal cold-open ("I scored your public intake — want the full autopsy?")
7. **B-012** — Intake Integrity Standard (rating → named public standard) [→ Yang]
8. **B-013** — Intake-Verified displayable seal (customers → distribution; Michelin-star loop) [→ Yang]
9. **B-006** (320) — independent CIPA-safe benchmark [DEMOTED; seed from paying-firm data]
10. **B-001** — benchmark report [rides on B-006]
11. **B-002** — Spanish-Intake Justice Index [PR franchise; rides on B-006]
12. **B-004** (240) — self-improving agent architecture [standing]
13. **B-003** (210) — live in-call coaching hardening

---

### B-006 — Independent CIPA-safe NorCal PI intake benchmark (the one asset that does 4 jobs)  ·  ICE: 10×8×4 = 320  ·  lane: research→product→outreach
- **Hypothesis:** If we run and publish our OWN independent, CIPA-safe, Yang-signed mystery-shop
  benchmark of NorCal PI intake (fixed scenario, tiered confidence, PUBLISHED false-alarm rate),
  then (a) qualified conversations rise, (b) we replace self-interested vendor stats with OUR
  citable number, (c) we get the Spanish-gap PR vehicle, and (d) we instantiate the
  independent-scorer moat competitors structurally cannot copy — because independence + published
  methodology is the Moody's/J.D. Power source of pricing power [insight 2026-07-07 D1/D2, B4].
- **Deliverable:** analyst drafts the sampling frame + rubric + methodology note; Yang signs the
  §632-safe protocol BEFORE any dialing (compliance §II). No live claimants. Nothing published
  until Ali + Yang approve.
- **Status:** queued (feeds B-001)
- **Result:** —

### B-001 — Benchmark report as second-touch authority asset  ·  ICE: 9×8×4 = 288  ·  lane: research→outreach
- **Hypothesis:** If we ship "State of NorCal PI Intake" grounded in the CIPA-safe mystery-shop
  dataset (B-006), then qualified conversations rise because independent-scorer authority (Moody's/J.D.
  Power model) earns the first meeting. Confidence raised: competitor scan (2026-07-07 D1) confirms
  NO independent benchmark exists — the category slot is empty and ours to own.
- **Deliverable:** research analyst assembles the dataset spec + findings draft; outreach drafts
  the distribution plan (CAOC NorCal chapters, county TLAs, trial-lawyer media). Yang sign-off before any dialing.
- **Status:** in-dev
- **Result:** —

### B-005 — Regulatory-clearance memo: flat-fee model vs AB 931 / SB 37 / Rule 5.4-7.2 (route to Yang)  ·  ICE: 9×7×5 = 315  ·  lane: research→compliance
- **Hypothesis:** If Yang reviews and blesses a one-page memo establishing that Intake QA's
  flat-monthly, outcome-agnostic, non-client-steering model sits OUTSIDE AB 931's "anything of
  value for recommending/securing services," SB 37's anti-capping regime, and Rule 5.4/7.2(b)
  fee-sharing prohibitions, then we unlock confident public compliance positioning and de-risk the
  whole GTM — because a rule change here overrides everything [insight 2026-07-07 A1/A2].
- **Deliverable:** analyst drafts the memo (statute cites + our-structure-vs-prohibition analysis);
  Yang reviews/signs. Also folds in an SB 37 copy-audit (no unverifiable claims/guarantees) and a
  pen-register/tracker audit of plaintiffops.com (CIPA §638.51, insight A3). Staged, not shipped.
- **Status:** queued (BLOCKS any "we're AB 931-compliant" public claim per compliance §VII)
- **Result:** —

### B-002 — Spanish-intake quality gap as earned-PR pillar  ·  ICE: 8×7×5 = 280  ·  lane: outreach
- **Hypothesis:** If we quantify and publish the Spanish-intake quality gap (Fricker testimonial
  injustice framing), then earned media + inbound interest rise because it's a justice story with
  a number attached. Now anchored: ~28.8% of Californians speak Spanish at home; SF-Oakland-Fremont
  metro 43.4% non-English-at-home (~15–17% Spanish) [VERIFIED Census/ACS, insight 2026-07-07 C4].
  Defensibility raised because only the INDEPENDENT scorer (D1) has incentive to publish it.
- **Deliverable:** outreach drafts the angle + target outlets; research analyst supplies the
  defensible number (measured via B-006 benchmark, not asserted). No claimant data used without consent.
- **Status:** queued (measurement rides on B-006)
- **Result:** —

### B-003 — Live in-call coaching component hardening  ·  ICE: 7×6×5 = 210  ·  lane: product
- **Hypothesis:** If `IntakeCoach.jsx` is production-hardened (latency, false-positive rate,
  consent gating), then pilot demos convert better because the "wow" is real and defensible.
- **Deliverable:** product-dev PR + a Calibration note on its false-alarm rate.
- **Status:** queued

### B-004 — Self-improving agent architecture (standing meta-item)  ·  ICE: 8×5×6 = 240  ·  lane: research
- **Hypothesis:** If each cycle the analyst spends one beat auditing the agent system itself —
  where the loop lost value, which agent/prompt/ledger is the weakest link, what capability no
  competitor could replicate — then output quality compounds because the machine that builds the
  product also rebuilds itself. Ali's standing directive: run at max value/productivity and build
  what no one else could.
- **Deliverable:** a dated `ops/insights.md` entry with concrete, ICE-scored proposals to improve
  an agent prompt, a ledger, the compliance skill, or the loop — staged as edits for Ali's approval,
  never self-applied to `.claude/` without a logged decision.
- **Status:** standing (revisit every cycle)

<!-- Add new hypotheses below; re-sort by ICE score after each cycle. -->

### B-010 — Queue hygiene: terminal cards out of the way, oldest-actionable first  ·  ICE: 8×8×8 = 512  ·  lane: product
- **Hypothesis:** If resolved cards (signed/passed/bad number) collapse into a "Done" section and the queue orders actionable-first, then daily desk use survives week 3 because the coordinator's list stays a "today's list," not a graveyard (2026-07-10 field guide: one queue, one next action).
- **Deliverable:** PR on /desk/queue.
- **Status:** queued

### B-011 — Attempt-count nudge toward 6 touches  ·  ICE: 7×8×6 = 336  ·  lane: product
- **Hypothesis:** If each flagged case shows "attempt 2 of 6" with the Velocify basis (93% of conversions happen by call 6; most firms stop at 2), then rescue→sign rate rises because persistence gets legitimized as process, not pestering (callback-science insight, 2026-07-10).
- **Deliverable:** attempts counter on flag_status (updated_at history or count column) + card copy; PR.
- **Status:** queued

### B-012 — Coordinator "your wins" tally (credit, not caught)  ·  ICE: 8×7×5 = 280  ·  lane: product
- **Hypothesis:** If the desk shows a simple weekly "callbacks → reached → signed" tally the coordinator can screenshot for Friday's meeting, then daily engagement holds because the tool becomes her recognition ammunition (per-case bonuses are ethically barred; recognition is the only upside we can offer her).
- **Deliverable:** small stats strip on /desk/queue + weekly line in the digest; PR.
- **Status:** queued

### B-013 — Statute clock on flagged cases  ·  ICE: 9×6×4 = 216  ·  lane: product
- **Hypothesis:** If each flag carries "statute runs ~X months" from incident date (sol.mjs exists), then partner urgency + trust rise because the desk speaks in the firm's own risk language (already promised in the queue footnote — currently vaporware).
- **Deliverable:** incident-date capture in pipeline + SOL render; PR.
- **Status:** queued

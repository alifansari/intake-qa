# Decision Log

> The system's memory. Every material change gets an entry so we never re-litigate a settled
> call and can always ask "did that work?" at the review date. Newest on top.

## Format

```
## YYYY-MM-DD — [decision title]  ·  agent: [which] · lane: [which]
- **Change:** what was proposed/staged/shipped.
- **Hypothesis:** why we believed it would help (link the insight/backlog ref).
- **Expected effect:** which metric should move, by roughly how much, by when.
- **Status:** staged-for-approval | shipped | reverted
- **Review date:** YYYY-MM-DD
- **Result:** (filled at review) moved / flat / worse → keep | iterate | revert
```

## Standing prior decisions (locked; do not re-open without new evidence)

- **Flat monthly pricing, never outcome-tied** (Rule 5.4 / B&P §§6151–6152 / SB 37). Core ~$2,500,
  Pro ~$5,000. A per-case pricing defect was found live and corrected — it must never return.
- **Positioning: independent recovery desk / independent scorer**, Ali as "Analyst of Record,"
  not a fee participant.
- **Wedge: free Leak Audit** leads every outreach.
- **Owned newsletter + LinkedIn are the primary distribution rails**; Dream 25 dimensional mailer
  replaced the 150-firm generic blast.
- **Yang = backstage compliance reviewer / named methodology endorser**, not outcome endorser.
- **Citation guard: "no citation, no claim"**; deletion cascade; published false-alarm rate.
- **Manifesto "The Unscored Conversation"** hosted at plaintiffops.com/letter with signed
  attestation block.

---

## 2026-07-07 — Staged Dream-25 outreach batch 1 + benchmark spine + targeting method  ·  agent: outreach · lane: outreach

- **Change:** Staged three drafts under `ops/drafts/` (nothing sent/published):
  1. `benchmark-report-outline.md` — spine + section architecture for the independent "State of
     NorCal PI Intake" benchmark (B-006→B-001). Every measured figure marked `[TO BE MEASURED]`;
     CIPA-safe methodology summarized (fixed scenario, 4-min rubric, tiered confidence, PUBLISHED
     false-alarm rate); Yang-signed §632 protocol flagged as a hard §II/§VII gate before any dialing.
  2. `dream25-outreach-batch-1.md` — signed physical letter (Ali's voice, NorCal-framed), 1:1
     CAN-SPAM email, LinkedIn connect+opener, and a capped 3-touch (mail→email→LinkedIn) sequence.
     Each asset carries a per-asset compliance note. Free Leak Audit is the wedge throughout.
  3. `dream25-targeting-plan.md` — ideal-fit scoring rubric + ethical public-source sourcing SOP
     (State Bar, county TLAs, CAOC NorCal chapters, Google LSA/PPC, Avvo/Justia), ≥2-source
     verification rule. No firm names/PII fabricated.
- **Hypothesis (per asset):**
  - Letter (Asset A): a signed, physical, morally-serious letter cuts through machine-written
    vendor email (letter's own thesis) → books qualified conversations [B-001, insight D1/D2].
  - Email/LinkedIn (Assets B/C): multi-channel, same-voice touches lift reply rate vs. single
    channel, at the ~8% touch→qualified assumption in the funnel model [insight B2].
  - Benchmark outline (B-006/B-001): the independent, published-methodology benchmark is the
    second-touch authority that earns the first meeting and instantiates the moat competitors
    structurally can't copy [insight D1/D2].
  - Targeting (C3): a scored fit rubric concentrates scarce founder hours on the ~24 firms that
    actually convert — the real binding constraint is hours/close, not TAM [insight B1].
- **Expected effect:** primary metric = **qualified conversations booked**. If batch-1 (Dream-25
  first ring, ~25 firms) performs near the funnel model, expect a handful of qualified
  conversations from touch→qualified ~8% across 3 touches; instrument reply-by-channel and
  touch→qualified from firm #1 (the two conversions insight B2 says decide everything).
- **Status:** staged-for-approval.
- **Review date:** 2026-08-04 (4 weeks; revisit after first sends + first replies).
- **Result:** —
- **Approval gates before anything moves (per compliance §VII):**
  - **Ali:** approve each asset; fill all `{{placeholders}}`; supply a REAL postal address for the
    CAN-SPAM email; set `{{ORIGIN_CITY}}` to a NorCal origin (NOT Orange County); confirm the
    Calibration & Honesty URL is live with a current false-alarm rate before pointing partners to it.
  - **Yang:** must sign the §632-safe benchmark protocol BEFORE any mystery-shop dialing; must
    clear any public "AB 931 / SB 37 compliant" claim (this batch makes NONE — kept to "flat,
    outcome-decoupled fee" only, per B-005 still open). Benchmark stays "forthcoming," no results
    implied, until fieldwork runs.

<!-- New decisions go above this line, newest on top. -->

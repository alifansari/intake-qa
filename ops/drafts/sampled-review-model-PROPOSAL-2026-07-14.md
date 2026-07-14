# Sampled Review Model — Proposal + Staged Copy/Attestation Rewrite
**Date:** 2026-07-14
**Status: STAGED — DO NOT SHIP. Novel regulated change (alters what the signed attestation attests to → §IV claim integrity + §V truthfulness). Per compliance-invariants §VII and ops/OPERATING-PROTOCOL, this stages for Ali's decision and routes to Yang before any deploy. Nothing here is live.**

## The problem in one line
The real ceiling to serving a high-volume PI firm is **not** a code limiter — it's the trust model. `AUDIT_CAPACITY = 8` is pure marketing copy (no enforcement anywhere), but it's honest: today a real analyst reviews **100% of calls** before release, and that is asserted in ~13 public strings and in a **signed attestation that literally says "I personally reviewed the calls, flags, and figures."** You cannot review every call for a firm doing thousands a month. So the capacity unlock is a deliberate, honest narrowing of what the human reviews and what the signature attests to — not an engineering toggle.

## The proposed model (recommended: "tiered review")
Three options, from least to most scalable:

| Model | Human reviews | Scales to a mill? | Trust/compliance shift |
|---|---|---|---|
| A. Status quo | Every call | No | None |
| **B. Tiered review (RECOMMENDED)** | High-value + low-confidence + citation-gap flags + a random sample of the rest | **Yes** | Moderate — narrow the attestation, add a provenance label |
| C. QA-sample only | A random QA % only | Yes (most) | Large — hardest to defend the "signed" story |

**Recommendation: B.** It preserves the staked-signature moat (a human still personally reviews everything that carries real dollars or real doubt, and signs) while letting the engine + citation guard carry the high-confidence, low-stakes bulk. The citation guard ("no citation, no claim," ≥0.9 match) remains the **universal floor** on every finding, reviewed or not — so nothing a firm sees is ever un-evidenced.

### How the tier is decided (already built, flag-off)
The risk classifier (`web/analysis/review-router.mjs`) uses signals that already persist — no new scoring:
- **force human review** if: confidence tier is `moderate` (not `strong`) OR any `citation_failures` row OR `revenue_at_risk_cents ≥ $10k` (configurable).
- **auto-eligible** (engine-scored, evidence-verified) otherwise.

The analyst review queue is now **prioritized** by this (highest dollars / lowest confidence first), so even at 100% review the analyst's hours go to the leverage. Flipping on auto-release for the `auto_eligible` tier is the regulated step gated by this proposal.

---

## Firm-facing provenance label (new — extends the existing tier/fee-gating pattern)
Today every finding is implicitly "analyst-reviewed," so no label exists. Under tiered review, each finding carries an honest provenance badge, parallel to the existing confidence tier + fee-chip gating on `LeakCard`:

- **"Analyst-reviewed"** — a human personally reviewed this flag and the analyst's signature covers it.
- **"Engine-scored · evidence-verified"** — scored by the calibrated engine, every quoted excerpt machine-checked against the recording (citation guard), not individually human-reviewed.

Both still show the confidence tier and the transcript quote. The label never implies human review that didn't happen (§IV). Data source: the `review-router` decision persisted per flag/session; `provenance: 'analyst_reviewed' | 'engine_scored'` added to the `Leak` type.

---

## Narrowed attestation (draft — Yang must approve the wording)
**Current** (`web/src/pdf/doc-helpers.mjs:160`):
> "Analyst's attestation. I personally reviewed the calls, flags, and figures in this statement before it was issued. Each qualifying fact cited here is tied to a specific point in the call recording, and each estimated fee value is presented as a range under the methodology in Appendix A, not as a guarantee of outcome or recovery. This is an independent business analysis of intake performance. It is not an audit, an accounting engagement, a financial statement, or legal advice, and it should not be relied on as any of those."

**Proposed** (honest under tiered review):
> "Analyst's attestation. Every figure and flag in this statement is produced by our calibrated engine and constrained by the citation guard: no claim appears here unless a specific point in the call recording supports it, checked automatically against the audio. I personally reviewed every high-value flag, every lower-confidence flag, everything the citation guard flagged, and a random sample of the remainder, before this statement was issued. Findings I reviewed are marked *Analyst-reviewed*; the rest are marked *Engine-scored, evidence-verified*. Each estimated fee value is a range under the methodology in Appendix A, not a guarantee of outcome or recovery. This is an independent business analysis of intake performance. It is not an audit, an accounting engagement, a financial statement, or legal advice, and it should not be relied on as any of those."

Mirror change in the compose-layer sign-off (`web/src/lib/leak-report/copy.mjs:44` `analystSignoff()`) — same narrowing.
Test to update: `web/tests/pdf-doc-helpers.test.mjs:111-115` asserts the "not an audit … not a guarantee" language (preserved above) — will pass; but add/adjust an assertion for the new review-scope sentence.

---

## The ~13 public "reviews every call" strings — before → after
All are copy (no runtime dependency), but their truthfulness is load-bearing (§V). Proposed honest replacements:

| File:line | Before | After |
|---|---|---|
| `site-constants.ts:124` `SUB_CTA_LINE` | "A real analyst reviews every call. You keep the report whether or not you continue…" | "A real analyst reviews the flags that carry the dollars, and signs the report. You keep it whether or not you continue…" |
| `site-constants.ts:138` `REVIEWER_LINE` | "A former PI paralegal who sat in the intake seat reviews every score." | "A former PI paralegal who sat in the intake seat reviews the flags that matter most and signs off." |
| `site-constants.ts:141` `AUDIT_FREE_LINE` | "…A real analyst, not just a model, scores every one…" | "…The engine scores every call; a real analyst reviews the flags that carry real dollars or real doubt and signs the report…" |
| `site-constants.ts:145` `AUDIT_CAPACITY_LINE` | "Because a real analyst reviews every call, we take on up to 8 audits each month." | (free-audit wedge only) "Your free Leak Audit is hand-reviewed end to end; we take a limited number each month." — and DROP the "reviews every call" causal claim for the ongoing product. |
| `page.tsx:60` | "A real analyst scores every call and hands you a signed report…" | "The engine scores every call; a real analyst reviews the flags that matter and hands you a signed report…" |
| `page.tsx:316` | "…A real analyst reviews every one and shows you…" | "…A real analyst reviews the flags that carry the dollars and shows you…" |
| `founder/page.tsx:54` | "…I review every audit and every monthly statement and sign off…" | "…I review every high-value and lower-confidence flag, and a sample of the rest, on every statement, and sign off on what you read…" |
| `faq/page.tsx:26` | "…Because each audit takes real analyst hours, we take on up to 8 a month." | "…Your free audit is hand-reviewed; on the ongoing desk the engine reads everything and I review the flags that carry the dollars." |
| `accuracy/page.tsx:97` | "…a former PI paralegal reviews every score before you see it." | "…a former PI paralegal reviews the flags that carry real dollars or real doubt before you see them; every finding, reviewed or not, is evidence-checked against the recording." |
| `pricing/page.tsx:132` | "A real analyst scores them and walks you…" | (unchanged sense — audit is hand-reviewed; fine) |
| `audit/page.tsx:190,214,373` | "A real analyst reviews every call…" (audit context) | For the free-audit wedge, hand-review is TRUE — keep, but scope it to the audit, not the ongoing desk. |

**Note:** the free **Leak Audit** (the wedge, a sample of ~10 calls) can honestly stay 100% hand-reviewed — the tiered model applies to the **ongoing high-volume desk**, not the small free audit. Keep the two distinct in copy.

### The letter (`app/letter/content.ts:104`)
The signed letter says: *"When I hand you a Monthly Missed-Revenue Statement, my name is on it the way an engineer's name is on the beam."* This survives tiered review — an engineer's seal attests to the work's integrity and the parts they personally checked, not to having personally laid every brick. If the letter is touched, it needs a version bump + changelog (as with v1.5). **Recommend: leave the letter as-is** — it doesn't assert per-call review; only the product copy and attestation do.

---

## What's built vs staged
- **BUILT now (safe, flag-off, analyst-facing only):** `review-router.mjs` classifier + tests + a prioritized review queue in `/desk/review`. No firm-facing or attestation change. This makes 100% review more efficient today and is the rail for auto-release later.
- **STAGED here (needs Ali decision + Yang):** the attestation rewrite, the provenance label, the 13 copy rewrites, and turning on auto-release for the `auto_eligible` tier.

## Decision for Ali
1. **Go tiered (B), stay 100% (A), or QA-sample (C)?** (Recommend B.)
2. If B: approve the narrowed attestation wording (then → Yang) and the provenance labels.
3. Confirm the free Leak Audit stays 100% hand-reviewed (recommended — it's the wedge and the trust proof) while the ongoing desk goes tiered.

On approval, the execution is small: flip the copy strings, swap the attestation text (+ update the one test), render the provenance badge on `LeakCard`, and enable auto-release for `auto_eligible` in the release path. All the hard infrastructure is already in place.

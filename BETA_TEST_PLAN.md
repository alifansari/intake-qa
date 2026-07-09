# BETA_TEST_PLAN — Intake QA Beta Program

Status: Phase-1 scaffold complete on branch `beta/program-layer`. Nothing deployed;
nothing here goes live without the founder's explicit approval (compliance §VII).

## What the beta is

Invited small-to-mid **California plaintiff-side PI firms** use the product on their
own recorded intake calls, under NDA, for free, and give structured feedback on UX
and utility so the founder can improve it toward launch. The beta is the delivery
vehicle for the whole product — every module below is reached *through* the tester
journey, and every module emits the four learning signals: onboarding friction,
output usefulness, trust/accuracy, willingness-to-pay.

## The end-to-end tester journey (Phase 1, all scaffolded)

```
apply → qualify (ICP gate) → NDA (hard gate) → onboard (consent checklist +
connect/upload) → Free Intake Audit / Lost Case Report → human-reviewed flags →
daily rescue packet (top 3, push delivery) → firm staff make callbacks →
recovered-revenue ledger → per-artifact feedback → founder review
```

### 1. Apply (self-serve)
- `POST /api/beta/apply` — name, firm, role, bar number, practice area, state,
  monthly intake-call volume, phone/CRM system, whether they record calls, Spanish %.
- Qualification gate (`web/beta/applicants.mjs`): **hard gates = California +
  personal injury.** Everything else (volume band, not-recording-yet) is a recorded
  soft signal. Non-ICP applicants land on a **waitlist tagged by practice area**
  (`waitlist_entries`) and are told plainly; they are never admitted to the PI beta.
- Applicant states: `applied → nda_pending → nda_signed → onboarding →
  active_tester → completed` (plus `waitlisted` / `rejected`). The state machine has
  **no edge that skips `nda_signed`** — enforced in code and tested.

### 2. NDA gate (hard)
- NDA goes out via the existing **Dropbox Sign** integration (same webhook as the
  retainer flow; each handler no-ops on the other's signature ids). Executed-document
  reference + timestamp stored in `nda_records`.
- `assertBetaDataAccess()` (`web/beta/nda.mjs`) is the single access chokepoint:
  it requires BOTH a signed NDA and a post-NDA status. In TEST_MODE the send is
  simulated so the funnel is testable offline.
- **TODO(Ali):** create the actual NDA template in Dropbox Sign and set
  `DROPBOX_SIGN_NDA_TEMPLATE_ID`. The NDA text is contract language → Yang review
  before first live send.

### 3. Onboarding: consent + connect (what we need from a tester)
Data/setup asked of each tester:
1. **Recording consent readiness (CIPA §632/632.7):** the bilingual consent
   greeting scripts + recording-readiness checklist live in
   `web/beta/consent-gate.mjs`; the firm's attestation is stored in
   `compliance_config`. **No un-consented call is ever analyzed** — per-call
   `consent_status` plus firm attestation gate the pipeline (tested).
2. **Call access:** connect their phone system (CallRail webhook exists;
   RingCentral is a TODO seam) **or** batch-upload their last 30–90 days of
   recordings (manual MP3 ingest exists).
3. **CRM (optional, one for Phase 1):** Clio connector receives rescue-packet
   tasks (`rescue_packet.created` event). Field names are placeholders until real
   API credentials are in hand.
4. **BAA:** offered to every tester; co-exists with the NDA. Template is a
   TODO(Ali/Yang) — contract language, human gate.

### 4. Free Intake Audit → Lost Case Report
The existing audit pipeline (audit sessions, leak-report composer, citation guard,
confidence tiers, PDF) already produces the one-page report: total calls, answered
live vs voicemail, speed-to-answer, per-call case-quality score, signable-but-
unconverted count, and a conservative labeled recovered-revenue range. The beta
routes testers into it **after** NDA (the public no-NDA demo stays isolated in the
demo tables and is unaffected).

### 5. Human-in-the-loop review (trust)
Every leaked-signable flag enqueues in `review_queue_items` (service-role-only in
Supabase — a pending flag is invisible to the firm **by RLS**, not just by UI). A
named reviewer confirms or one-click rejects; rejections carry structured criteria
feedback that deterministically tunes the firm's ruleset overrides (no model
training on call content — invariant e).

### 6. Daily rescue packet (the product moment)
Top **3** cases max (schema-enforced), ranked value × recoverability × SOL urgency.
Each item: prospect details, plain-English diagnosis, pre-filled ~2-minute callback
script. Pushed via email + staff SMS + CRM task (all TEST_MODE-simulated until A2P
10DLC and live keys); dashboard is secondary. **The firm's own staff make every
callback** — callbacks are logged in `callback_audit_entries`, where a non-employee
actor is unrepresentable.

### 7. Ledger (the proof)
`rescue_ledger_entries`: unique `RSQ-` tag per rescue, stages flagged → contacted →
consult → signed → settled, **would-have-lost gating frozen at packet time** (a case
counts as recovered only if it had gone cold before the flag), optional random
control holdout reported separately. CSV export ships now; monthly ROI PDF is a
marked TODO on the existing PDF pipeline.

### 8. Feedback capture (the purpose)
`POST /api/beta/feedback` — per-audit and per-rescue-packet, never one global
survey. Structured fields: UX (setup ease, report clarity, delivery), UTILITY
(flags genuinely signable? would they have been recovered otherwise? diagnosis
accurate? script usable?), TRUST (1–5 + false-positive count), WTP (would they pay
flat monthly, max flat amount, what would make it a must-have), open text.
Founder view: `GET /api/admin/beta` — per-tester status + tagged waitlist +
aggregated signals.

## How feedback is reviewed
- Weekly: founder reads `GET /api/admin/beta` aggregate; every `utility_flags_signable
  = no` and every reported false positive gets a root-cause pass in the review queue
  (was it criteria? confidence tier? consent/audio quality?).
- Criteria-shaped rejections flow automatically into `firm_ruleset_overrides`.
- WTP answers accumulate against the packaging config (`billing/packaging.mjs`)
  — pricing changes remain a human-approval gate.

## Beta exit criteria (per tester)
- ≥ 1 Lost Case Report delivered and feedback captured on it.
- ≥ 5 rescue packets delivered; ≥ 60% of items rated "genuinely signable".
- Ledger shows the full stage chain working against their CRM or manual updates.
- Tester answers the WTP block. Status → `completed`; offer the paid-pilot path
  (find-cases-or-free month one) — optional, never automatic.

## Invariants (enforced in code, all tested)
| # | Invariant | Where |
|---|---|---|
| a | Never contacts prospects; firm employees make callbacks | `callback_audit_entries` CHECK; no send capability in rescue modules |
| b | Pricing can never be per-case/per-outcome | `assertFlatFeeConfig` hard-fail + `billing/invoice.mjs` |
| c | No un-consented call analyzed | `calls.consent_status` + `web/beta/consent-gate.mjs` |
| d | No flag surfaces without human sign-off | packet builder reads only `state='confirmed'`; queue is service-role-only |
| e | No model trains on call content | criteria feedback is deterministic config, not training |
| f | No data access before NDA | `assertBetaDataAccess` + state machine has no NDA-skipping edge |
| g | No automation pushes to production | work is on branch `beta/program-layer`; founder merges |

## Open founder decisions (blocking full activation, not the scaffold)
1. **Pricing numbers conflict:** ops/decisions.md locked $1,500/$2,500/$5,000; the
   beta brief specifies $600–$1,500 by volume. Both flat. Config carries the locked
   numbers with a TODO — your call, then Yang if framing changes.
2. NDA + BAA templates (Dropbox Sign) — legal text needs Yang review.
3. First CRM confirmation (Clio is scaffolded as the Phase-1 choice).
4. Relationship to the staged Intake Closer pivot: this beta program is built on
   the Direction-A (post-call, never-contacts-prospects) product per the 2026-07-09
   brief; it does not touch the voice-agent scaffold.

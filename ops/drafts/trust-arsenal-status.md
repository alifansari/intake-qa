# Trust Arsenal — Status, Gaps, and <1-Minute Diligence Scripts

> **STATUS: INTERNAL STATUS DOC — STAGED, NOT SENT, NOT PUBLISHED.** (compliance-invariants §VII)
> Sub-objective 3.2. Purpose: make every diligence ask answerable in under a minute, and prove
> each promised artifact both EXISTS and is internally consistent with our real posture before
> the beta opens Monday 2026-07-14. Author: research/drafting sub-agent, 2026-07-12.
> Nothing here is legal advice. The BAA threshold question routes to Yang (see §D).

Claim discipline below: **[VERIFIED]** = traced to a named primary source (URL given).
**[UNVERIFIED]** = plausible, needs Ali/Yang confirmation before it backs any firm-facing claim.

---

## 0. Bottom line up front

The paper mostly EXISTS and is unusually honest. Three things can still embarrass us in a firm's
security review, in priority order:

1. **The DPA is only a web page, not a signable document.** Every other instrument (NDA §4, MOU
   §6, /security) points to "the DPA" and "the MSA" as the load-bearing contracts — yet there is
   **no execute-ready DPA or MSA file staged in `ops/drafts/external/`**, only marketing pages at
   `/dpa` and `/msa` marked "draft, not in force." If a firm's counsel says "send me your DPA and
   MSA to redline," we have nothing to send. This is the single biggest gap.
2. **We promise "zero-retention" and "never trains" flow-down to subprocessors that is not yet
   contracted or configured.** Anthropic never-trains is [VERIFIED] true by default; Anthropic
   *zero-data-retention* is a separate arrangement we have **not enabled**, and AssemblyAI's
   no-training requires an **opt-out we have not confirmed is set**. NDA §4(c)'s "zero-retention
   obligations to its subprocessors" currently overclaims (§IV citation guard).
3. **"Deleted immediately on written request" vs. "we have not built full-tenant deletion."** The
   public /security page and one-pager say "immediately"; SECURITY.md and the DPA/BAA honestly say
   it is manual and the cascade is unbuilt. Reconcile the word "immediately" before a firm quotes
   it back to us.

Everything else is a copy/number reconciliation (retention 30 vs 90) or a Yang decision (is a BAA
even the right instrument — answer below: probably not, offer it only as belt-and-suspenders).

---

## A. Per-artifact status

| Artifact | Where it lives | Promised by | Exists? | Consistent? | Blocker to first firm |
|---|---|---|---|---|---|
| **Mutual NDA** | `ops/drafts/external/beta-mutual-nda.md` | BETA_CONDITIONS[0]; /apply "NDA within one business day"; welcome page | **Yes (draft)** | Mostly — §4(c) "zero-retention" overclaims (see C-2) | Yang review + a live send path (Dropbox Sign is TEST mode) |
| **BAA (beta)** | `ops/drafts/external/beta-baa.md` | BETA_CONDITIONS[0] "a BAA is available"; one-pager; MOU §6; security-posture.baa | **Yes (draft)** | Instrument choice unresolved (D); subprocessor chain not on file (C-3) | Yang threshold call FIRST; do not sign until subprocessor flow-down exists |
| **Design-partner MOU** | `ops/drafts/external/design-partner-mou.md` | LACBA post; pilot offer | **Yes (draft)** | Yes — flat-fee, no-claimant-contact, CIPA rep all clean | Yang review; conversion price + lock term still blank |
| **DPA** | Web page `/dpa` only (`web/src/app/(marketing)/dpa/page.tsx`, `robots:noindex`) | NDA §4; MOU §6; /security "DPA available on request"; ACCOUNTABLE_PARTY_LINE | **Web page yes / signable doc NO** | Page is consistent, but there is **no executable DPA** to send counsel | **Stage a signable DPA doc** (see B-1) |
| **MSA** | Web page `/msa` only | DPA page ("forms part of the MSA") | **Web page yes / signable doc NO** | DPA cannot be "executed alongside the MSA" if no MSA doc exists | Stage a signable MSA or collapse DPA to standalone |
| **Security one-pager** | `ops/drafts/external/security-onepager.md` | Firm security review handout | **Yes (draft)** | "deleted immediately" vs SECURITY.md caveat (C-1); BAA-addendum line gated on D | Ali approve; resolve C-1 wording |
| **Public /security page** | `web/src/app/(marketing)/security/page.tsx` | Live site | **Yes** | Retention number depends on deployed env (C-4); "immediately" wording (C-1) | Confirm Vercel DATA_RETENTION_DAYS=90 |
| **SECURITY.md (internal)** | `web/SECURITY.md` | Internal source of truth | **Yes** | Yes — most honest of the set; treat as the anchor | — |
| **security-posture.mjs** | `web/beta/security-posture.mjs` | Single config source for the above | **Yes** | Anthropic ZDR marked "pending" (good); SOC2 "roadmap" (good) | Keep as source of truth |

**Net:** 6 of 8 promised instruments exist as usable drafts. The two missing are the **signable DPA
and MSA** — and they are precisely the two that every other document leans on.

---

## B. Gap fixes (do before Monday, in order)

### B-1 [P0] Stage a signable DPA — the arsenal's missing keystone
Yang note 1 on the BAA concludes the **DPA should carry the substance** for non-PHI PI intake. But
the DPA exists only as a noindex marketing page that says it "creates no obligation until executed
alongside the Master Services Agreement." So the instrument we want to lean on is the one we cannot
hand over. **Fix:** produce `ops/drafts/external/beta-dpa.md` — a standalone, signature-ready
Data Processing Addendum lifted from the /dpa page content (roles: Firm=controller,
Intake QA=processor; encryption; the 8 named subprocessors; real retention/deletion behavior;
confidentiality/PII; no-overclaiming security posture; governing law), with a signature block and
the same "DRAFT — route to Yang" banner as the NDA/BAA. Decide with Yang whether the DPA stands
alone for the beta or truly requires an MSA; if the beta is free (it is), collapse to a standalone
DPA + the MOU and defer the MSA to conversion. Route to Yang with the NDA/BAA/MOU as one packet.

### B-2 [P0] Confirm the deployed retention number = the promised number
`web/.env.local` sets `DATA_RETENTION_DAYS=30`; `web/.env.example`, the inngest code default
(`web/inngest/functions.mjs:83` → `?? 90`), the public /security page, the DPA page, the one-pager,
and BAA §7(c) all say **90**. If Vercel prod inherits 30, we silently delete firm evidence at day
30 while every promise says the firm can check flag evidence for 90 days — a firm auditing a flag
on day 45 finds nothing. **Fix:** set Vercel `DATA_RETENTION_DAYS=90` (already a
MONDAY_GO_NO_GO gate — "retention=90"), and delete the stale `=30` from `.env.local` so no one
copies it. One number, everywhere.

### B-3 [P1] Reconcile "deleted immediately on written request"
Public /security, DELETION_LINE, and the one-pager say transcripts are "deleted immediately if you
ask in writing." SECURITY.md says: *"Do NOT promise immediate on-request full-tenant deletion until
[the cascade] ships,"* and the DPA/BAA correctly disclose deletion is **manual today**. A manual
same-day delete can honestly satisfy "promptly on written request" but not the literal word
"immediately." **Fix (pick one):** (a) soften public copy to "promptly, by hand, on written
request" and keep the DPA/BAA manual-caveat; or (b) build the one-click cascade before Monday
(unlikely). Recommend (a) — it matches SECURITY.md and survives §IV. Whichever, the
diligence script in §E-6 must state the manual truth.

### B-4 [P1] Fix the subprocessor no-training / zero-retention flow-down language
See C-2 and C-3. NDA §4(c) promises subprocessors carry "no-training **and zero-retention**"
obligations. Zero-retention is not contracted with Anthropic (ZDR not enabled) or AssemblyAI (TTL
configurable, not zero). **Fix:** change §4(c) to "no-training obligations, and the shortest
practical retention configured for each subprocessor" — drop the word "zero-retention" until ZDR
is actually enabled and papered. Same edit anywhere else "zero-retention" appears as a present
claim.

### B-5 [P2] Confirm and record the two subprocessor data-terms facts
Turn the two [UNVERIFIED] items in §C into [VERIFIED] before a firm's counsel asks:
- Enable/confirm **AssemblyAI model-improvement opt-out** on the account, and confirm a Transcript
  TTL is set (AssemblyAI supports both). Record the opt-out date.
- Confirm the **Anthropic organization** used for scoring: is content retention off by default for
  the model in use, and do we want to file for ZDR or HIPAA-readiness? (Note: if scoring runs on a
  Covered Model that mandates 30-day retention, ZDR is impossible — see C-2.) Record the decision.
This is already an "Ali-only blocker" in decisions.md ("provider (AssemblyAI/Anthropic) data-terms
decision"); this doc just names exactly what to confirm.

---

## C. Consistency findings (detail + citations)

**C-1 — "immediately" vs. manual deletion.** Covered in B-3. Internal contradiction between the
public copy and `web/SECURITY.md` lines 39–42 and DPA §4 / BAA §7(d). Honesty item (§IV/§VIII).

**C-2 — Anthropic posture.** [VERIFIED, Anthropic platform docs, platform.claude.com/docs/en/manage-claude/api-and-data-retention]:
"Retained data is never used for model training without your express permission… Conversation
content (your prompts and Claude's outputs) is not retained by default; the exception is Covered
Models, which require 30-day retention." **So "never trains on your calls" is TRUE and safe to
claim.** But **ZDR is a separate arrangement** ("contact the Anthropic sales team… ZDR is enabled
per organization") — it is **not on** unless we requested it, and `security-posture.mjs` correctly
marks it "pending written confirmation — GO_LIVE gate A7." Two consequences:
  (a) Any doc asserting Anthropic ZDR as a present fact is wrong — keep it "pending."
  (b) If our scoring model is a Covered Model (30-day mandated retention), ZDR is unavailable by
      design; **HIPAA-readiness** (also via a signed Anthropic BAA) is the alternative arrangement.
Note BAA reviewer-note 2 says posture.mjs "states … present-tense fact"; as written today
posture.mjs already says "pending," so that note is stale — but the NDA §4(c) "zero-retention"
flow-down (B-4) is the live overclaim to fix.

**C-3 — AssemblyAI posture.** [VERIFIED, assemblyai.com docs/faq]: AssemblyAI "provides an option
for customers to opt out of AssemblyAI using customer data to train" its models, and "offers a
standard Business Associate Addendum (BAA)"; retention is customer-controlled via **Transcript
Time-to-Live**. Implication: no-training for AssemblyAI is **opt-out, not automatic** — [UNVERIFIED]
whether we have opted out. Until confirmed, "our transcription provider never trains on your calls"
is unsubstantiated for AssemblyAI. Fix = B-5.

**C-4 — Retention number 30 vs 90.** Covered in B-2. Sources: `web/.env.local:38` (30) vs
`web/.env.example:131` (90) vs `web/inngest/functions.mjs:83` (default 90) vs
`site-constants.FIRM_RETENTION_DAYS` (90) vs /security, /dpa, one-pager, BAA §7(c) (all 90).

**C-5 — Subprocessor lists agree.** [VERIFIED across repo] The /dpa page, `security-posture.mjs`,
and BAA §6 all name the same 8: Supabase, Vercel, AssemblyAI, Anthropic, Resend, Twilio (dark),
Dropbox Sign, Stripe. No drift. Good — this is the question firms actually ask, and we pass it.

**C-6 — "NDA within one business day" is a live promise with a soft back-end.** `/api/beta/apply`
returns "we'll email your NDA within one business day. Nothing connects until it is signed," and
the welcome page repeats it. The NDA draft exists but is **not Yang-cleared** and **Dropbox Sign is
in TEST mode** (`.env.example:44`). To honor the promise Monday, either (a) Yang clears the NDA and
we send a PDF for manual/DocuSign-style signature, or (b) flip Dropbox Sign live. A one-business-day
clock with no cleared document and no live e-sign is a broken promise waiting to happen.

**C-7 — SMS/Twilio correctly dark everywhere.** [VERIFIED] BAA §6, /dpa, posture.mjs, SECURITY.md
all mark Twilio "parked/dark until A2P 10DLC approval." Consistent. No fix.

---

## D. The Yang threshold question — is a BAA even the right instrument?

**Short answer (research-backed): probably not, as a default.** A plaintiff PI firm is generally
**not a HIPAA covered entity**, and a vendor to that firm is generally **not a business associate** —
so a "BAA" implies a HIPAA relationship that does not exist for ordinary PI intake calls.

[VERIFIED — HHS.gov HIPAA FAQ + compliance secondary sources]: a plaintiff attorney handling a
client's own medical records "doesn't become a business associate because a patient has the
freedom to disclose his/her medical information to anyone." Covered-entity/BA status attaches to
**defense** firms hired by insurers, or firms doing **medical-records review** on behalf of a
covered entity — not to a plaintiff firm receiving injury facts directly from the injured person.
Intake-call injury descriptions are **confidential client information** (Cal. Rule 1.6 / 1.18,
CCPA-adjacent), not PHI in a covered-entity chain. Sources:
[HHS FAQ 709](https://www.hhs.gov/hipaa/for-professionals/faq/709/must-a-lawyer-require-those-persons-to-whom-it-discloses-information-abide-by-privacy-restrictions/index.html),
[mosmedicalrecordreview.com](https://www.mosmedicalrecordreview.com/blog/how-lawyers-can-remain-hipaa-compliant-business-associates/),
[compliancy-group.com](https://compliancy-group.com/law-firm-hipaa-compliance/).

**What this means for the arsenal.** The substance a firm actually needs — confidentiality,
encryption, no-training, deletion, subprocessor transparency — is exactly what a **DPA carries**.
That is why B-1 (stage a real DPA) matters more than perfecting the BAA. Recommended posture for
Yang to ratify:
- **Default:** DPA + Mutual NDA carry the substance. Public copy stops implying a HIPAA
  relationship.
- **On request / belt-and-suspenders:** offer a short **"Confidentiality & Data Security Addendum"**
  (the current beta-baa.md content, possibly renamed) for firms whose ops person insists on a
  "BAA," or a genuine **BAA only for med-mal / provider-record-adjacent firms** that may actually
  sit in a covered-entity chain.
- **Match the copy to the paper:** BETA_CONDITIONS[0] and the one-pager say "a BAA is available."
  If Yang picks rename/DPA-carries-substance, that line becomes "a data-security addendum (and a
  BAA for firms that need one) is available." Do not leave "BAA available" copy standing over an
  instrument Yang has retired.

**Downstream provider note:** if a beta firm genuinely needs a BAA (med-mal), then we need HIPAA
arrangements from our own subprocessors — **Anthropic HIPAA-readiness (signed BAA + HIPAA-enabled
org)** and **AssemblyAI's BAA** — both [VERIFIED available] but neither signed. So a real BAA to a
firm is only honest once that upstream chain exists (BAA reviewer-note 2). For non-PHI PI firms,
none of that is required — another reason the DPA route is cleaner for the beta cohort.

---

## E. The <1-minute diligence answer scripts

One-line answers a human can read aloud in a vendor call. Each ends at the honest edge — no
overclaim. Bracketed notes are for us, not for the firm.

**E-1 — "Do you encrypt our data?"**
"Yes — TLS in transit on every hop, AES-256 at rest across our database and file storage. Nothing
about your calls travels or sits unencrypted." [VERIFIED across all sources.]

**E-2 — "How is our firm's data kept separate from other firms'?"**
"Per-firm isolation. Every firm-data table is tenant-keyed with row-level security enforced at the
database, verified in production across all tables, so a signed-in user can only reach their own
firm's rows. Sign-in is by emailed magic link — no shared passwords — and report views and exports
are access-logged." [VERIFIED — SECURITY.md tenant-isolation section.]

**E-3 — "Do you train AI on our calls?"**
"Never. We don't use your audio, transcripts, or results to train any model, and we don't sell or
share them. Our analysis provider doesn't train on API inputs by default, and our transcription
provider is set so your data isn't used for model improvement." [First half VERIFIED. Second half
depends on B-5 — confirm the AssemblyAI opt-out is set before you say the last clause. Until then
stop at "…any model, and we don't sell or share them."]

**E-4 — "Who are your subprocessors?"**
"Eight, each named in our DPA: Supabase (database/auth/storage), Vercel (hosting), AssemblyAI
(transcription), Anthropic (scoring), Resend (email to you), Stripe (billing), Dropbox Sign
(e-signature), and Twilio — which is dark until texting is separately approved and you activate it.
We don't add or swap a subprocessor that touches your calls without notice to you." [VERIFIED —
lists agree across DPA/posture/BAA.]

**E-5 — "How long do you keep our data, and can we get it deleted?"**
"Call audio is deleted the moment it's transcribed — we never keep the recording. Free-audit
transcripts purge within 72 hours of your readout. For firms on the desk, transcripts are kept only
while we serve you so your team can check the evidence behind each flag, on a rolling 90-day window,
and deleted on written request. When you offboard, derived data goes too." [VERIFIED once B-2 sets
Vercel=90. On the deletion clause see E-6.]

**E-6 — "If we ask you to delete everything, how fast, and how do we know it's gone?"**
"On written request we delete your transcripts and derived caller data. Today that's done by hand,
promptly, and we'll confirm it in writing — we have not yet built a one-click full-tenant purge with
an automated deletion receipt, and we won't claim we have." [Honest per SECURITY.md/DPA §4. Do NOT
say "immediately/automated" — that's B-1/B-3.]

**E-7 — "Are you SOC 2 or HIPAA certified?"**
"No, and we don't claim to be. We're not renting trust badges — we make plain-English commitments
and put them in writing in the NDA and DPA. SOC 2 is on our roadmap (controls mapped, Type I not
yet started). One person is accountable to you for all of it: Ali Ansari, ali@plaintiffops.com."
[VERIFIED — posture.mjs certifications block.]

**E-8 — "Will you sign a BAA?"**
"Injury facts your client tells you directly are confidential client information, not HIPAA PHI in a
covered-entity chain, so for most plaintiff firms a DPA plus our mutual NDA is the right paper and
carries the same protections. If your practice is medical-malpractice or you receive provider
records and your counsel wants a BAA specifically, we'll work through one with you." [Frame per §D.
Adjust once Yang rules; if she keeps the "BAA available" line, say "Yes, a BAA is available."]

**E-9 — "Do you record our calls? What about California two-party consent?"**
"We never record or intercept calls — we only analyze recordings your firm already lawfully made.
California is an all-party-consent state under Penal Code §632, and your firm owns its
recording-consent posture; our compliance page covers the detail." [VERIFIED — /security, MOU §5.]

**E-10 — "Where does our data live?"**
"US data residency — US-region database and hosting, over encrypted connections throughout."
[VERIFIED — posture.mjs data_residency.]

---

## F. Proposed `ops/decisions.md` entry (staged — do NOT append live)

```
### 2026-07-12 — Trust arsenal: status, the DPA gap, and the BAA-instrument question (sub-obj 3.2)

**Context:** Verified every promised trust artifact for Monday's beta. 6 of 8 exist as usable
drafts (NDA, BAA, MOU, one-pager, /security, SECURITY.md, posture.mjs). Subprocessor lists agree
across all sources (8, Twilio dark). Two gaps and one open legal question surfaced.

**Findings:**
1. No signable DPA or MSA document exists — only noindex /dpa and /msa marketing pages — yet NDA
   §4, MOU §6, and /security all lean on "the DPA." If firm counsel asks to redline the DPA we have
   nothing to send. Biggest gap.
2. "Zero-retention" flow-down (NDA §4(c)) overclaims: Anthropic never-trains is VERIFIED-true by
   default, but Anthropic ZDR is a separate, unenabled arrangement, and AssemblyAI no-training is an
   opt-out we have not confirmed set. Retention number is 30 in .env.local vs 90 everywhere public.
3. Public copy says deletion is "immediate on written request"; SECURITY.md/DPA say it's manual and
   the cascade is unbuilt — reconcile the word "immediately."

**Decision (proposed, pending Ali/Yang):**
- Stage a standalone signable DPA (ops/drafts/external/beta-dpa.md); decide with Yang whether the
  beta needs an MSA or the DPA+MOU stand alone.
- Set Vercel DATA_RETENTION_DAYS=90; delete the stale =30 from .env.local.
- Strike "zero-retention" from NDA §4(c) flow-down until ZDR is papered; confirm AssemblyAI
  model-improvement opt-out and record the date.
- Reconcile "immediately" → "promptly, by hand, on written request" in public copy, or build the
  cascade.
- BAA instrument: Yang to rule. Research says a plaintiff PI firm is not a HIPAA covered entity and
  we are not its business associate (HHS FAQ 709), so the DPA should carry the substance and a
  BAA/"Confidentiality & Data Security Addendum" is offered only as belt-and-suspenders or for
  med-mal/provider-record firms. If Yang retires "BAA available," update BETA_CONDITIONS[0] and the
  one-pager to match.

**Status:** STAGED. Nothing sent, published, or pushed. NDA/BAA/MOU/DPA route to Yang as one packet.
**Review:** before first firm signs (target pre-Monday for B-2/B-3; Yang packet in parallel).
```

---

## G. What I did NOT change

- Did not edit any live file, the /security or /dpa pages, or site-constants — all fixes above are
  proposals (§VII). The retention/copy/NDA edits are one-line changes but they are **product claims
  and contract language**, which are human-approval gates.
- Did not draft the signable DPA itself here — B-1 is scoped as the next staged deliverable so Yang
  reviews the instrument choice (§D) and the document together, not a document that pre-commits her.
- Did not resolve the BAA instrument question — flagged and researched, routed to Yang per §I of the
  compliance skill (novel-in-a-regulated-area → Yang first).

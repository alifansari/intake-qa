# DRAFT FOR LEGAL REVIEW — Business Associate Agreement (Founding Beta)

> **STATUS: INTERNAL DRAFT — PENDING ATTORNEY REVIEW. NOT SENT. NOT IN FORCE. NOT LEGAL ADVICE.**
> Route to Roberta M. Yang (or retained CA counsel) before first use
> (compliance-invariants §VII — contract language is a human-approval gate).
> Companion to the Mutual NDA (signed first), the DPA, and the design-partner MOU.
>
> **THRESHOLD QUESTION FOR YANG (decide before any redline):** is a BAA even the right
> instrument here? See Reviewer note 1. This draft exists because the live site, the LACBA
> post, and MOU §6 already promise "a BAA is available" — the promise needs paper behind
> it, but the *form* of that paper is Yang's call, not ours.

---

## BUSINESS ASSOCIATE AGREEMENT

This Business Associate Agreement ("BAA") is entered into as of _____________
("Effective Date") between **Plaintiff Ops LLC**, a California limited liability company
d/b/a "Intake QA" ("Business Associate"), and **_____________________________** ("Firm"),
and forms part of the Parties' service relationship documented in the Mutual NDA, the
Data Processing Addendum ("DPA"), and (where executed) the design-partner MOU.

**Why this agreement exists.** The Firm shares recorded intake calls with Business
Associate for transcription, scoring, and missed-case flagging. Intake calls from injured
people routinely contain descriptions of injuries, treatment, and providers. To the extent
any of that content constitutes Protected Health Information ("PHI") under HIPAA — a
question the Firm and its counsel decide for the Firm's own regulatory posture — this BAA
governs how Business Associate handles it.

**1. Definitions.** "PHI," "Breach," "Security Incident," "Subcontractor," and other
capitalized HIPAA terms have the meanings given in 45 C.F.R. Parts 160 and 164. "Firm
Call Data" means intake-call recordings, transcripts, scores, flags, and reports processed
for the Firm, whether or not any of it is PHI.

**2. Permitted uses and disclosures.** Business Associate will use and disclose Firm Call
Data (including any PHI in it) **only** to provide the service described in the MOU and
DPA — transcription, scoring against the intake rubric, missed-case flagging, and
reporting back to the Firm — and for no other purpose. Business Associate will not use
Firm Call Data for marketing, will not sell it, and will never contact the Firm's callers,
clients, or prospective clients.

**3. No model training.** Business Associate will not use Firm call audio, transcripts,
caller information, or results to train any artificial-intelligence model, and will pass
equivalent no-training obligations to its Subcontractors (mirroring NDA §4(c)).

**4. Safeguards (what is actually in place).** Business Associate maintains, and will
continue to maintain, at minimum:
(a) encryption in transit (TLS) and at rest (AES-256) for Firm Call Data;
(b) per-firm data isolation: every firm-data table is tenant-keyed with row-level
security enforced at the database, so one firm's users can never reach another firm's
rows;
(c) default server-side redaction of sensitive identifiers in transcription (Social
Security numbers, payment-card and banking details, driver's-license and passport
numbers); caller name, phone number, and the injury facts of the case are intentionally
retained because the service requires them;
(d) access logging of report and artifact views and exports;
(e) no caller information in URLs, analytics events, or third-party tools without a
processing basis.

**5. Minimum necessary.** Business Associate needs only recorded intake calls. It does
not request, and the Firm should not provide, signed-client files, matter documents, or
case-management access.

**6. Subcontractors.** Business Associate uses the following subprocessors, each under
written terms consistent with this BAA for the data it touches. Those that touch call
content are marked.

| Subprocessor | Purpose | Touches call content? |
|---|---|---|
| Supabase | Database, authentication, file storage | Yes |
| Vercel | Application hosting and delivery | Yes (in transit) |
| AssemblyAI | Speech-to-text transcription | Yes |
| Anthropic | Scoring transcripts against the fixed rubric | Yes |
| Resend | Transactional and digest email to the Firm | Yes (flag summaries) |
| Dropbox Sign | E-signature (agreements only) | No |
| Stripe | Subscription billing | No |
| Twilio | SMS re-engagement — **parked; dark until A2P 10DLC approval and the Firm's written activation** | Not until activated |

Business Associate will not add or replace a subprocessor that touches Firm Call Data
without prior notice to the Firm, and will flow down no-training, confidentiality, and
security obligations to each such subprocessor.

**7. Retention, deletion, return and destruction (actual behavior, not aspiration).**
(a) Call audio is deleted the moment it is transcribed; the underlying recording is not
retained.
(b) Free Leak Audit transcripts and reports are purged within 72 hours of the readout, or
immediately on written request.
(c) For ongoing service, transcripts and derived caller-level data are purged on a
rolling retention window (the `DATA_RETENTION_DAYS` sweep, 90 days as deployed for the
beta), and on written request.
(d) On termination or the Firm's request, Business Associate will delete or return Firm
Call Data, certifying deletion on request, except records it must retain by law (which
remain subject to this BAA's protections for as long as held). Full-tenant, one-click
deletion is handled manually today (see DPA §4); Business Associate will not claim
otherwise.

**8. Breach and Security Incident notification.** Business Associate will notify the Firm
of any Breach of Firm Call Data **within 72 hours of becoming aware of it**, with what is
known and what is being done, and will supplement as facts develop. Business Associate
will report material Security Incidents without unreasonable delay. This 72-hour
commitment is deliberately stricter than HIPAA's outer bound.

**9. Assistance with individual rights and the Firm's obligations.** To the extent
Business Associate holds PHI in a designated record set (it does not expect to), it will
assist the Firm in responding to individuals' requests for access, amendment, and
accounting of disclosures, and will make its internal practices available to the
Secretary of HHS to the extent required for determining compliance.

**10. Term and termination.** This BAA runs with the underlying service relationship and
terminates when it ends, subject to §7(d). The Firm may terminate the underlying
relationship if Business Associate materially breaches this BAA and does not cure within
thirty (30) days of written notice.

**11. No agency; independent vendor.** Business Associate is an independent
quality-control vendor to the Firm, paid a flat fee that never varies with any case
outcome or recovery. Nothing here creates a partnership, referral arrangement, or
fee-sharing.

**12. General.** Governed by California law; venue in Los Angeles County, California.
This BAA controls over conflicting terms in the NDA or DPA solely as to PHI. Amendments
in writing signed by both Parties. Counterparts and electronic signatures effective.

| | Plaintiff Ops LLC (Business Associate) | Firm |
|---|---|---|
| Signature | | |
| Name | Ali Ansari | |
| Title | Founder | |
| Date | | |

---

## Reviewer notes (Yang)

1. **THRESHOLD QUESTION — flagged, not decided:** is a BAA the right instrument at all?
   A plaintiff PI firm is generally **not** a HIPAA covered entity, and a vendor to a law
   firm is generally **not** a "business associate" under 45 C.F.R. §160.103 — intake-call
   descriptions of injuries are confidential client information (Rule 1.6 / CCPA-adjacent),
   not necessarily PHI. Options we see (your call): (a) sign this BAA as belt-and-
   suspenders for firms that ask; (b) let the **DPA carry the substance** and offer a short
   **BAA rider only** for firms with medical-adjacent intake (med-mal, firms receiving
   provider records); (c) rename this instrument (e.g., "Confidentiality & Data Security
   Addendum") to avoid implying a HIPAA relationship that doesn't exist. The live site
   currently says "a BAA is available" (site-constants BETA_CONDITIONS[0]; also the LACBA
   post and MOU §6), so whatever you pick, the copy must match the paper.
2. **Subprocessor agreement chain is NOT on file.** §6 promises flow-down terms, but as of
   2026-07-11 we have no written confirmation of an Anthropic BAA/zero-data-retention tier
   or an AssemblyAI BAA (the old GO_LIVE checklist treated both as open gates). This BAA
   must not be signed with any firm until that chain exists in writing, or §6 must be
   narrowed to what is actually contracted. Note: `web/beta/security-posture.mjs` states
   Anthropic "zero-retention API tier" as a present-tense fact — reconcile before any firm
   sees either document.
3. **Retention window:** §7(c) states 90 days, matching the public /security page and the
   code default (`web/inngest/functions.mjs` defaults `DATA_RETENTION_DAYS` to 90). But
   `web/.env.example` sets 30 and `security-posture.mjs` says "default 30." Whatever is
   deployed must match the signed number — confirm the deployed env value before first
   signature.
4. **Breach window:** 72 hours is our public commitment (site /security page). Confirm
   phrasing sits correctly against HIPAA's "without unreasonable delay / 60 days" and CA
   Civ. Code §1798.82 for non-PHI personal information.
5. **Overlap:** §4/§7 restate DPA §§2–4 and NDA §4 on purpose (a firm's ops person may
   read only this document). Confirm the "BAA controls as to PHI" precedence clause (§12)
   is the right conflict rule.
6. **§9:** we do not maintain a designated record set — confirm the "does not expect to"
   framing is the honest and correct scope, or strike §9 if the DPA-rider route is chosen.

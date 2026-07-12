# DRAFT — Intake QA Security One-Pager (firm-facing)

> **STATUS: STAGED DRAFT. NOT SENT.** Ali approves before this goes to any firm
> (compliance-invariants §VII). Every claim below is cross-checked against the public
> /security page, `web/SECURITY.md`, and `web/beta/security-posture.mjs` — if the posture
> changes, change those sources first, then regenerate this page. PDF-ready: everything
> below the line is the one page.
>
> **Gate before first send:** the "BAA-form addendum" line under "What we do NOT claim"
> depends on Yang clearing ops/drafts/external/beta-baa.md (instrument choice + subprocessor
> chain). If that hasn't cleared, cut that parenthetical to "(NDA and DPA, available for
> your counsel's review)" before sending.

---

# Intake QA — Security & Data Handling

**For your firm's security review.** Intake QA (Plaintiff Ops LLC) scores your firm's own
recorded intake calls and flags likely-signable cases that slipped. This page answers what
a law-firm vendor review usually asks, in order. One person is accountable to you for all
of it: Ali Ansari, founder — **ali@plaintiffops.com**.

## What we need — and what we don't

| We need | We do not need |
|---|---|
| Recorded intake calls only. Redact names first if you want to. | No signed-client files. No matter documents. No case-management access. |

## Encryption

Your data is encrypted **in transit** (TLS on every hop) and **at rest** (AES-256 across
our database and file storage). Nothing about your calls travels or sits unencrypted.

## Access controls and isolation

Every firm's data is isolated per firm: each firm-data table is tenant-keyed with
**row-level security enforced at the database**, so a signed-in user can only reach their
own firm's records. Sign-in is by emailed link — no shared passwords. Report and artifact
views and exports are access-logged.

## Sensitive-identifier redaction

Transcription redacts sensitive identifiers server-side by default: Social Security
numbers, payment-card and banking details, driver's-license and passport numbers. Caller
name, phone number, and the facts of the case are retained — the service exists so your
staff can call the person back.

## Retention and deletion

- **Call audio is deleted the moment it is transcribed.** We never keep the recording.
- **Free Leak Audit** transcripts and reports are purged within **72 hours** of your
  readout, or immediately on written request.
- **Firms on the desk:** transcripts are kept only while we serve you (so your team can
  check the evidence behind each flag), purged on a **rolling 90-day window**, and
  deleted on written request. When a firm offboards, derived data goes too.
- Your calls, transcripts, and results are **never used to train AI models**, and we do
  not sell or share your data.

## Where your data lives and who touches it

US data residency (US-region database and hosting). Transcription and analysis run on
specialist engines under our data-processing agreement — **every subprocessor is named in
the DPA** (plaintiffops.com/dpa) — over encrypted connections, with no-training terms
flowed down.

## What we do NOT claim

Intake QA is **not SOC 2 certified** and does **not claim to be HIPAA compliant** as a
company. We don't rent trust badges; we make plain-English commitments and put them in
writing (NDA, DPA, and — for firms that want one — a BAA-form addendum, all available for
your counsel's review). We will also work from your firm's own paper.

## Breach notification

If we become aware of a breach affecting your data, we notify you **within 72 hours** of
becoming aware, with what we know and what we're doing about it.

## Call recording and consent

We process calls your firm already lawfully recorded. California is an all-party-consent
state (Penal Code §632); your firm owns its recording-consent posture, and we never record
or intercept calls ourselves.

---

*This page is not legal advice. Your firm and its counsel make the final call on ethics
and consent. Questions: ali@plaintiffops.com.*

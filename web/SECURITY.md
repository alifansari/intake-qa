# Security & data handling

Honest posture for Intake QA — the independent recovery desk. No overclaiming: we state what our
infrastructure providers attest to, and mark anything unconfirmed as TODO(Ali). We do not claim
SOC 2 / HIPAA / ZDR as Intake QA unless a signed agreement is in place.

## What we hold
- Recorded intake calls the firm already lawfully holds (California is an all-party-consent state,
  Penal Code §632/§632.7 — the firm is responsible for its recording consent posture).
- Transcripts, per-call scores, leaked-signable flags, follow-up drafts, and generated PDFs.

## Encryption
- In transit: TLS to all providers and the app.
- At rest: your data and recordings are encrypted at rest (AES-256) across our storage and models.

## Tenant isolation
- Every firm-data table carries a tenant key AND has Row-Level Security enabled (verified on
  production: all 32 public tables have RLS on). Firm-scoped tables (calls, flags, conversations,
  messages, outcomes, invoices, firm_*, etc.) carry membership policies keyed on `firm_members`, so
  a signed-in user can only reach rows for firms they belong to; token-/demo-keyed tables are
  service-role-only (RLS enabled, no policy). Server data access additionally runs as a trusted role
  over a direct connection. Client sign-in is magic-link (Supabase Auth); the /desk work screens are
  gated by middleware.

## PII redaction
- Transcription redacts sensitive identifiers server-side by default (Social Security numbers,
  payment-card and banking details, driver's-license and passport numbers). It intentionally does
  NOT redact the caller's name, phone number, or the injury/medical facts of the case — those are
  needed to re-contact the caller and to assess the case, and the flag is set so scoring behavior is
  unchanged when no such identifiers appear. Controlled by `ASSEMBLYAI_REDACT_PII` (on by default).

## Retention & deletion
- Call audio is deleted the moment it is transcribed.
- Transcripts and reports are purged within 72 hours of your readout, or immediately on written
  request. A Leak Audit's data is purged automatically 72 hours after the readout if the firm does
  not continue.
- What is live today: call audio is deleted immediately after transcription; demo data and expired
  Leak Audit sessions are purged automatically on a daily durable (Inngest) schedule.
- Still to build before promising firms one-click, immediate deletion: a full per-firm deletion
  cascade (all stored objects + DB rows + a DELETE call per transcript to our transcription system)
  with a deletion-receipt email. Do NOT promise immediate on-request full-tenant deletion until this
  ships.

## Our models and systems
- Your calls are analyzed and transcribed by our own models, over encrypted connections.
- We do not use your calls, transcripts, or the results to train our models. We do not sell or share
  your data. Model API logs are held only briefly and then removed.
- SMS is dark until A2P 10DLC approval.
- Client-facing materials name our models generically ("our models"); the specific model/infra
  details are kept internal. TODO(Ali): a sophisticated firm's security review may still ask which
  processors touch their data — decide how much to disclose privately under NDA.

## Access logging
- Artifact views/downloads are recorded in `artifact_access_log` (firm, actor, artifact, action, at).

## What we do NOT claim
- Intake QA is not itself SOC 2 certified or HIPAA compliant. We make plain-English commitments and
  put them in writing. We do not use the word "audit" as an accountancy term, and our readouts are
  independent business analyses, not audits or legal advice.

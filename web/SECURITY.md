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
- At rest: Supabase encrypts data at rest (AES-256); AssemblyAI encrypts at rest and in transit.

## Tenant isolation
- Every firm-data table carries a tenant key. RLS policies are being rolled out (item 10 gate);
  until then, firm data is only reached through server code that filters by firm. TODO(Ali):
  complete RLS enablement + policies before onboarding multiple live firms.

## Retention & deletion
- Call audio is deleted the moment it is transcribed.
- Transcripts and reports are deleted within 7 days of your readout, or immediately on written
  request. A Leak Audit's data is deleted automatically 7 days after the readout if the firm does
  not continue.
- Deletion cascade (Supabase Storage + DB rows + AssemblyAI `DELETE /v2/transcript/{id}`) and the
  deletion-receipt email are implemented in the security gate. TODO(Ali): confirm the cascade is
  enabled in production before promising immediate deletion to a firm.

## Subprocessors (accountable infrastructure)
- Anthropic (Claude API) — analysis/drafting. Commercial API: inputs/outputs are not used to train
  models and are deleted after 7 days by default. Zero-Data-Retention requires a SEPARATE signed
  agreement — we do NOT claim ZDR unless signed. TODO(Ali): confirm this workspace's retention tier.
- Supabase — database & storage. SOC 2 Type 2, ISO 27001; HIPAA-capable under a signed BAA.
- AssemblyAI — transcription. SOC 2 Type 2, PCI-DSS 4.0 Level 1; paid customers can opt out of
  model-improvement training; will sign a BAA. TODO(Ali): confirm plan includes redaction + opt-out.
- Twilio — SMS (dark until A2P 10DLC approval). Vercel — application hosting.

## Access logging
- Artifact views/downloads are recorded in `artifact_access_log` (firm, actor, artifact, action, at).

## What we do NOT claim
- Intake QA is not itself SOC 2 certified or HIPAA compliant. Those certifications belong to the
  named subprocessors. We do not use the word "audit" as an accountancy term, and our readouts are
  independent business analyses, not audits or legal advice.

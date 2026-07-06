# TODO_ALI.md — real-world facts only you can confirm

These are collected from the product-round spec's fact sheet and discipline rules. None are guessed
in code; each is a literal `TODO(Ali):` marker where it lives. Answer these and I'll fill them in.

## ✅ Resolved this session (July 2026)
- Migrations 0014 + 0015 **applied to Supabase** (direct connection confirmed).
- Demo firm **seeded into Supabase** (is_demo, labeled DEMO/TEST) — live /desk screens populate.
- Inngest signing + event keys stored in `.env.local` (git-ignored). **Also add them to Vercel env** (see below), and consider rotating them since they came through chat.
- Contingency %: defaulted to **33⅓%** (standard CA pre-litigation; ~40% litigation). Firm rate overrides when provided.
- Phone-export formats: standardizing on **mp3 + wav** (RingCentral/CallRail/8x8/Dialpad all export these); convert others before upload.
- SLOs: **committed** — Leak Audit within 3 business days; monthly statement by the 5th business day.
- Analyst-of-record: **confirmed** you review 100% of statements/readouts at current scale.
- Pilot-firm languages: no audio uploaded yet → default **`en`** routing, `es`/`es-en-codeswitch` available per firm. Set per firm when you onboard them.

## Still needed from you (add to Vercel env for production)
- [ ] Add **INNGEST_SIGNING_KEY** + **INNGEST_EVENT_KEY** to Vercel env vars (Production).
- [ ] Confirm **SUPABASE_SERVICE_ROLE_KEY** and **RESEND_API_KEY** are set in Vercel (needed for the deletion cascade + digest/receipt emails).

## Blocking before a real firm's data flows through production
- [ ] **Anthropic retention tier** for this workspace (default 7-day, or a signed ZDR agreement?). Do NOT claim ZDR unless signed. (Security docs + deletion receipt.)
- [ ] **AssemblyAI plan** — confirm it includes Universal-3 Pro, code-switching, and PII redaction policies. Confirm the backend AWS-TTL purge SLA in writing for a legal deployment.
- [ ] **Pilot firms' dominant language(s)** per firm/channel (`en` / `es` / `es-en-codeswitch`) — forced-language routing, not auto-detect.
- [ ] **Phone-system export formats** each pilot firm actually has on hand (RingCentral mp3/wav, CallRail mp3, 8x8/Dialpad vary).

## Numbers / thresholds to tune
- [ ] Baseline test count: acknowledge **130** as the true baseline (billing tests were migrated), or ask me to reconstruct 2 tests to reach 132.
- [ ] Estimated-fee-value table: your firms' **standard contingency %** and, when available, historical signed-case fee ranges by case type (these OVERRIDE published sources).
- [ ] Drift-monitor alert thresholds (start: flag-rate ±30% relative, tier-mix ±15 pts).
- [ ] QA sampling: N% random (start 10%) and word-confidence threshold (start 0.55).
- [ ] Citation-guard bands (start: ≥90 pass / 80–90 review / <80 fail).

## Commitments to confirm before promising to firms
- [ ] SLOs: Leak Audit readout within **3 business days**; monthly statement by the **5th business day**. Comfortable committing?
- [ ] "I personally review 100% of statements/readouts" — true at pilot scale? (Attestation + Analyst-of-Record blocks depend on it.)
- [ ] Audit monthly **capacity number** (or we keep the count out of the copy).

## Content to provide
- [ ] Analyst name + issued-date handling for the attestation signature block.
- [ ] Firm code scheme for statement/readout IDs (`[FIRM-CODE]-[YYYY]-[NN]`).

## Deferred (do NOT build pre-pilot — stubs only)
- Real Clio / Filevine / Lead Docket integrations (read interfaces + `NotImplemented` stubs only).
- Auto-sending follow-ups (staff copy & send themselves; A2P 10DLC pending — no go-live date published).

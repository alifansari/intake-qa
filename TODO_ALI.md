# TODO_ALI.md — real-world facts only you can confirm

These are collected from the product-round spec's fact sheet and discipline rules. None are guessed
in code; each is a literal `TODO(Ali):` marker where it lives. Answer these and I'll fill them in.

## ✅ Resolved this session (July 2026)
- Migrations 0014 + 0015 **applied to Supabase** (direct connection confirmed).
- Demo firm **seeded into Supabase** (is_demo, labeled DEMO/TEST) — live /desk screens populate.
- Inngest signing + event keys stored in `.env.local` (git-ignored). **Also add them to Vercel env** (see below), and consider rotating them since they came through chat.
- **Inngest durable layer deployed + app connected** — retention-purge + daily-digest crons + score-pipeline (event-triggered).
- **Analyst-of-Record identity wired** (`web/src/lib/analyst.mjs`, single source of truth): Ali F. Ansari, Founder & Analyst of Record, ali@plaintiffops.com, (949) 636-6918 — on every sign-off/attestation/cover-memo/PDF. No more `[last name]`/`[contact]` placeholders.
- **Firm-code auto-generated** from firm name (`deriveFirmCode`) for `[FIRM-CODE]-[YYYY]-[NN]` IDs — no manual assignment needed.
- **ZDR: NOT claimed anywhere** (confirmed by grep). SECURITY.md guardrail forbids claiming ZDR/SOC 2/HIPAA without a signed agreement — correct as-is.
- Contingency %: defaulted to **33⅓%** (standard CA pre-litigation; ~40% litigation). Firm rate overrides when provided. **Confirmed by Ali.**
- Phone-export formats: standardizing on **mp3 + wav** (RingCentral/CallRail/8x8/Dialpad all export these); convert others before upload.
- SLOs: **committed** — Leak Audit within 3 business days; monthly statement by the 5th business day.
- Analyst-of-record: **confirmed** you review 100% of statements/readouts at current scale.
- Pilot-firm languages: no audio uploaded yet → default **`en`** routing, `es`/`es-en-codeswitch` available per firm. Set per firm when you onboard them.

## Still needed from you (add to Vercel env for production)
- [ ] Add **INNGEST_SIGNING_KEY** + **INNGEST_EVENT_KEY** to Vercel env vars (Production).
- [ ] Confirm **SUPABASE_SERVICE_ROLE_KEY** and **RESEND_API_KEY** are set in Vercel (needed for the deletion cascade + digest/receipt emails).

## Blocking before a real firm's data flows through production
- [x] **Anthropic retention tier** — Ali confirmed **7-day standard, NO ZDR**. Copy/docs must not claim ZDR (already enforced). Fine for the pilot.
- [x] **AssemblyAI PII redaction + code-switching** — **BUILT (July 2026).** Conservative server-side redaction is ON by default (`ASSEMBLYAI_REDACT_PII`, defaults true): redacts SSN, card/banking, driver's-license, passport ONLY — never names, phones, injuries, or medical facts (needed for re-contact + scoring). Because those identifiers are not scoring signal, scoring is unchanged when a call contains none of them. Code-switching: handled by the existing `language_detection: true` on the multilingual model. Logic is in dependency-free `lib/transcribe-config.js` with 6 unit tests. No action needed from you; the flag can be flipped off in Vercel if ever required.
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

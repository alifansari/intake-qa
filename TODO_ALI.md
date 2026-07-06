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
- [x] Baseline test count: **130 acknowledged** (suite has since grown well past it).
- [~] Estimated-fee-value table: contingency **33⅓% default with per-firm override** is live. Historical signed-case fee ranges by case type → provide at onboarding (they override published sources).
- [ ] Drift-monitor alert thresholds (defaults in place: flag-rate ±30% relative, tier-mix ±15 pts).
- [ ] QA sampling: defaults in place (10% random, 0.55 word-confidence).
- [ ] Citation-guard bands: defaults in place (≥90 pass / 80–90 review / <80 fail).

## Commitments confirmed before promising to firms
- [x] SLOs: Leak Audit within **3 business days**; monthly statement by the **5th business day** — committed.
- [x] "I personally review 100% of statements/readouts" — confirmed at pilot scale; copy finalized (Founder page + constants).
- [x] Audit monthly **capacity number**: **8/month** (constant + FAQ + audit page).

## Content — resolved
- [x] Attestation signature block: **Ali F. Ansari, Founder & Analyst of Record, ali@plaintiffops.com, (949) 636-6918** (single source: `web/src/lib/analyst.mjs`).
- [x] Firm-code scheme `[FIRM-CODE]-[YYYY]-[NN]` with **auto-generated** codes (`deriveFirmCode`).

## Client sign-in + security — resolved
- [x] **Client sign-in (magic link)** live: /login → email link → /auth/callback; /desk gated by `src/proxy.ts`; Sign-out in the desk header. **Action needed:** in Supabase → Authentication → Providers, enable **Email** with magic link, and add the redirect URL `https://<your-domain>/auth/callback` (+ localhost for dev) under Authentication → URL Configuration.
- [x] **RLS**: verified all 32 prod tables have RLS; firm-scoped tables carry `firm_members` membership policies; migration 0018 closed the last gap (report_access_events). Applied to prod.

## The four remaining builds
- [x] **Document routes → real firm data** — DONE + verified on prod. Readout renders real audit-session data (`/api/documents/readout?token=…`); Leak Report renders real data ONLY when analyst-released (403 un-released, 404 unknown, sample with no token). Bridge: `src/lib/documents/from-audit.mjs`. Monthly statement stays sample until a firm subscribes + a period closes.
- [x] **Integrations (Clio / Filevine / Lead Docket)** — all three scaffolded (`integrations/{clio,filevine,leaddocket}.mjs` + connector). EXPORT-only, cannot touch the send chokepoint. **To go live you need vendor API credentials** (see below); paste them in and each connects with no rebuild.
- [x] **SMS send pipeline** — ALREADY BUILT (`messaging/send.mjs`): all 7 compliance gates (human approval, opt-out, kill switch, per-firm kill, quiet hours, TEST_MODE simulation). Human-gated, simulated until A2P 10DLC clears + TEST_MODE off. Nothing to build; run `npm i twilio` before turning TEST_MODE off.
- [~] **Branded PDF fonts** — deferred (Ali doesn't have font files yet). Send a licensed/OFL `.ttf` and I'll register it; built-in fonts render fine until then.

## How to get vendor API credentials (for the integrations)
- **Clio**: developers.clio.com → create a Developer account → "Add App" → get a Client ID/Secret → complete the OAuth2 flow for the firm → store the access token. (Clio Manage API v4.)
- **Filevine**: developer.filevine.io (or ask your Filevine rep to enable API access) → request API keys / a personal access token for the org.
- **Lead Docket**: it's a Lawmatics/Lead Docket product — request an API key from their support/account team (API access is account-gated).
- In all cases: you (the firm, or Intake QA on the firm's behalf) create the app/keys; paste them into the firm's integration settings (stored encrypted) and the connector goes live.

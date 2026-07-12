# ALI — MONDAY 7/14 BLOCKER PACKET (~90 min, human-only work)

> Everything here needs Ali's hands or Ali's decision. Engineers cannot clear any of it.
> Do this BEFORE 9am so nothing human is discovered when firm #1's calls flow.
> Verified against the beta/integration worktree. `file:line` cited; unverified items labeled.

---

## SECTION 1 — VERCEL ENV VARS (Production scope) — ~30 min
Set in Vercel → Project → **Settings → Environment Variables → Production**. Redeploy after.
Exact names are from `web/.env.example`; the go/no-go used shorthand — use the exact names below.

| Var (exact) | Value / how to obtain | Blocks what if missing |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | everything (no DB) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public key | client reads/auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key | deletion cascade, digest/receipt writes |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (pooled) | server DB writes |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys | calls never score |
| `ASSEMBLYAI_API_KEY` | assemblyai.com dashboard → API key | audio never transcribes |
| `CRON_SECRET` | generate: `openssl rand -hex 32` | digests + founder alerts never run; route 500s loud if unset |
| `DIGEST_LINK_SECRET` | generate: `openssl rand -hex 32` | "we called them" links + open pixel unsigned; degrades to no-action links |
| `EMAIL_ENABLED` | **`false`** at 9am; flip to `true` ONLY after the gate-4 dry-run passes | leave off until dry-run clears |
| `RESEND_API_KEY` | resend.com → API keys | digests render to file, never send |
| `RESEND_FROM` | your verified sender, e.g. `Ali <ali@plaintiffops.com>` (must be a Resend-verified domain) | send fails / spoof |
| `INNGEST_EVENT_KEY` | Inngest dashboard → **ROTATE** (old keys came through chat) | event scoring falls back to cron sweep only |
| `INNGEST_SIGNING_KEY` | Inngest dashboard → **ROTATE** (same reason) | same |
| `INTEGRATIONS_ENC_KEY` | generate: `openssl rand -hex 32` (now REQUIRED) | per-firm CallRail secret stored plaintext; set before onboarding any firm |
| `CALLRAIL_WEBHOOK_SECRET` | only if leading with the legacy/shared CallRail route | per-firm secrets still work; legacy env route only |
| `FOUNDER_EMAIL` | `ali@plaintiffops.com` (or the founder inbox) | studio locked; founder alerts skip |
| `FOUNDER_PHONE` | `(949) 636-6918` — **NOTE: not in `.env.example`, must add by hand** | welcome email degrades to reply-only (harmless) |
| `DATA_RETENTION_DAYS` | **`90`** — must equal the public /security promise | mismatch = truthfulness defect (§V) |
| `KILL_SWITCH` | **`false`** (`.env.example:127` ships `true` — you MUST override to false in prod) | if `true`, all digests halt |
| `TEST_MODE` | **`true`** — stays true for the beta (keeps SMS simulated) | must stay true |

Sanity: from `web/` run `npm run smoke` → expect `OK — 0 failure(s)`.

---

## SECTION 2 — SUPABASE MIGRATIONS — ~10 min
**Floor to apply on hosted Postgres = `0038_flag_status_attempts.sql` (the highest file).**

> ⚠ VERIFIED DISCREPANCY: `MONDAY_GO_NO_GO.md:70` says the floor is **0037** and mislabels the files
> (it calls 0035 the event log). The actual files are `0036_event_log`, `0037_welcome_emails`,
> `0038_flag_status_attempts`, and **there is no `0035` file at all** (numbering gap, harmless).
> Applying "through 0037" would leave **0038 unapplied**. Apply through **0038**.

How (idempotent — every migration is `if not exists`/additive):
1. Supabase → SQL Editor. Apply each pending file in `web/supabase/migrations/` in ascending order.
2. If unsure what's already applied, safe move is to run all of `0034 → 0036 → 0037 → 0038` in order; re-running is a no-op.
3. Confirm the last-applied is `0038`. `npm run smoke` confirms the repo tracks match (not the hosted state).

---

## SECTION 3 — DECISIONS (say yes/no in writing in `ops/decisions.md` today) — ~20 min

**3a. PRICING — pick ONE table (recommend Table C).** Ref `ops/drafts/pricing-decision-brief.md:42`.
- List price **$2,500/mo Core, $5,000/mo Pro**; **Founding Cohort $1,500/mo (Core scope)**, first 10 firms only, locked 12 months, always stated as a time-limited discount FROM $2,500 — never as "the price."
- Why C: price signals audit-desk authority (a gym-membership price undercuts it); a permanent $1,000 lock (Table B) anchors the market 60% below list and needs ~50 firms for $1M vs ~26–34 for C.
- Flat-monthly only either way (§I). This resolves the BLOCKED-ON-ALI three-way split (`ops/decisions.md:211`).
- ACTION: write chosen table into `compliance-invariants/SKILL.md` §I first bullet (exact text at brief line 51) + a dated `decisions.md` entry same day. Route to Yang if she reads §I as fee-structure-adjacent.

**3b. KILL the Intake-Closer per-signed-case mode.** Ref `ops/decisions.md:222`, `:404`.
- The staged Intake Closer pivot's **per-signed-case** pricing contradicts the §I "never outcome-tied, ever" promise. You cannot hold both. For the beta, kill per-signed-case; the flat-subscription default stays. ACTION: one-line "per-signed-case mode killed for beta" in `decisions.md`.

**3c. Spanish: English-only-beta framing vs. build the language-gate.** Ref `MONDAY_GO_NO_GO.md:174`.
- The frozen scorer is English-calibrated; no Spanish four-fifths validation, no "Spanish — unvalidated" routing. Recommend: **ship English-intake framing** (make NO public claim of validated Spanish scoring — already true in copy), defer the non-English→founder-review gate to post-beta. ACTION: confirm English-only framing OR direct the gate be built before onboarding any Spanish-heavy firm. Say which in writing.

---

## SECTION 4 — LEGAL / VENDOR SENDS (§VII human-gated, latency-bearing — start these FIRST, they wait on others) — ~30 min

These are the long-pole items: a human on the other end. Kick them off before touching env vars.

**4a. Provider data-terms — decide, don't default (gate 9 / GO_LIVE A7).** Real client audio hits the pipeline Monday.
- **Anthropic:** on file = 7-day standard retention, **NO ZDR** (`TODO_ALI.md:25`). Confirm this is acceptable for the beta and that copy claims no ZDR (already enforced).
- **AssemblyAI:** confirm no-training/data-processing terms in writing, OR accept standard-terms beta.
- ACTION: EITHER written no-training confirmation from both on file, OR a dated `ops/decisions.md` line: "beta runs on providers' standard terms until signed versions land." Do not let this decide by default.

**4b. Yang review packet + NDA/MOU (the one-business-day promise).** Ref `ops/drafts/nda-promise-options.md`.
- The apply flow promises the mutual NDA "within one business day" (`apply-form.tsx:86`, `api/beta/apply/route.ts:96`). The NDA template (`ops/drafts/external/beta-mutual-nda.md`) and BAA (`beta-baa.md`) have had NO attorney review; sending unreviewed contract paper is a §VII violation.
- DECIDE: **(a)** forward NDA to Yang tonight (2 pages, her questions are pre-written) with a hard fallback "no sign-off by Sunday 9pm → apply option (b)"; OR **(b)** reply "apply the diff" to soften copy from a clock to a sequence (staged diff in the memo, needs `npm run build`).
- Also route to Yang for read (already staged in `ops/drafts/external/`): `design-partner-mou.md`, `ab931-sb37-clearance-memo`, `cipa-632-mystery-shop-protocol`. BAA: threshold question is whether a BAA is even the right instrument — until cleared, "a BAA is available" is an overclaim; interim line: "our DPA is published; the BAA form is with counsel."

**4c. Dropbox Sign NDA (manual, sandboxed).** Dropbox Sign is in sandbox → you send the NDA PDF by hand.
- ACTION: have the (Yang-cleared) NDA PDF ready to email the same day an application lands; check `/studio` for `nda_pending` applicants every morning (`GO_LIVE.md:68`). This is only unblocked once 4b resolves.

---

### 9am order of operations
1. Fire off 4a + 4b (humans/vendors have latency).  2. Rotate Inngest keys + set all Section-1 vars.
3. Apply migrations through **0038**.  4. Record 3a/3b/3c decisions in `decisions.md`.
5. `npm run smoke`, then run the MONDAY_GO_NO_GO gates.  6. Flip `EMAIL_ENABLED=true` ONLY after the gate-4 dry-run to your own inbox passes.

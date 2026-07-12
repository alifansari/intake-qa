# MONDAY GO / NO-GO — Intake QA beta (2026-07-14)

**The 15-minute morning checklist.** Run this top to bottom against production before
firm #1's calls flow. Each gate is PASS/FAIL with concrete evidence. Anything FAIL that
you can't fix in <30 min → use the honest workaround (noted per gate) and tell the firm.

> The whole weekend's work lives on branch `beta/integration`, NOT on `main`. The real
> first step Monday is therefore **merge `beta/integration` → `main`, then deploy from
> `main`.** Do not deploy `main` as-is — it predates the beta work.

---

## 0. Merge + deploy (do this first)

```bash
# from the primary checkout (NOT a worktree)
git checkout main
git pull
git merge --no-ff beta/integration     # bring the weekend's work onto main
git push origin main                    # Vercel auto-deploys main
```

- [ ] `beta/integration` merged into `main` with no conflicts.
- [ ] Vercel shows the new deployment **Ready** (green), building from the merge commit.
- **Rollback (keep this handy):** in the Vercel dashboard → Deployments → the previous
  known-good deployment → **Promote to Production** (instant, no rebuild). Or from CLI:
  `vercel rollback <previous-deployment-url>`. Git rollback:
  `git revert -m 1 <merge-commit-sha> && git push` (redeploys the pre-merge tree).

---

## 1. Environment presence check — `npm run smoke`

From `web/`:

```bash
npm run smoke
```

- [ ] Prints `OK — 0 failure(s)`. Warnings about missing ANTHROPIC/ASSEMBLYAI keys are
      fine locally but those keys **must** be present in Vercel (gate 2).
- Smoke checks the two migration tracks are aligned and the schema builds. It does **not**
  reach the network or verify hosted env — that's the manual list below.

### Full Vercel environment variable list (all must be present in Production)

| Var | Purpose | Blocks what if missing |
|---|---|---|
| `SUPABASE_URL` + anon/service keys | the database | everything |
| `ANTHROPIC_API_KEY` | scoring (Claude) | calls never score |
| `ASSEMBLYAI_API_KEY` | transcription | audio never transcribes |
| `CRON_SECRET` | authorizes the digest + alert crons | **digests & founder alerts never run** (route now 500s loudly if unset — see gate 6) |
| `DIGEST_LINK_SECRET` | signs the "We called them" links + open pixel | digest degrades to no-action links (safe, but no one-click) |
| `EMAIL_ENABLED` | the email on/off switch (decoupled from TEST_MODE) | leave **off** until gate 5 dry-run passes |
| `RESEND_API_KEY` + `RESEND_FROM` | live email delivery (verified sender) | digests/alerts render to file, never send |
| `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` | durable scoring pipeline (rotate to fresh keys) | scoring stops with **no fallback** — the 15-min "fallback" sweep is ITSELF an Inngest cron (`web/inngest/functions.mjs` `scheduledScoreSweep`), so an Inngest outage strands calls unscored. The new stuck-unscored founder alert (any call unscored past `STUCK_SCORING_HOURS`, default 2) is the safety net that surfaces it |
| `INTEGRATIONS_ENC_KEY` | at-rest encryption for the per-firm CallRail signing secret (**now required** — the secret is stored encrypted) | CallRail per-firm secret stored as plaintext on write (local pilot only); set it before onboarding firms |
| `CALLRAIL_WEBHOOK_SECRET` | shared/legacy CallRail secret (pilot firm) | per-firm secrets still work; only the legacy env route needs it |
| `FOUNDER_EMAIL` | gates studio + is the ONLY recipient of founder alerts/digests-to-self | studio locked; founder alerts skip |
| `FOUNDER_PHONE` | shown in welcome email support line | welcome email degrades to reply-only (harmless) |
| `DATA_RETENTION_DAYS=90` | retention sweep window; **must equal the public /security promise (90)** | mismatch = a truthfulness defect (see gate 8) |
| `KILL_SWITCH=false` | master stop for digests/sends | if `true`, digests halt |
| `TEST_MODE=true` | keeps SMS simulated (Part B parked) | must stay `true` for the beta |

- [ ] Every row above confirmed present in Vercel → Production.

---

## 2. Supabase migrations at the floor — **0038**

```bash
# apply every file in web/supabase/migrations in order, through:
#   0038_flag_status_attempts.sql
```

- [ ] Hosted Postgres confirmed applied through **0038** (the weekend added 0036 event
      log, 0037 welcome emails, 0038 flag-status attempts; note there is no 0035 — a
      harmless numbering gap). `npm run smoke` confirms the repo tracks match; you still
      run the SQL on the hosted DB.
- If unsure which migrations are applied, the safe move is to run the pending ones in
      order — every migration is idempotent (`if not exists` / additive).

---

## 3. One synthetic call through the PRODUCTION pipeline

```bash
# local proof (fast, nothing sent):
npm run e2e-synthetic     # every stage prints PASS
```

Then push ONE synthetic call through the deployed prod pipeline (upload path is simplest —
no webhook needed) and watch it land on `/desk`: received → transcribed → scored → flagged.

- [ ] Local `e2e-synthetic` all PASS.
- [ ] One real call visible on the prod desk, moved past "received".
- **If it sticks at "received":** stop — the scoring worker or the AssemblyAI/Anthropic
      keys are the cause. Fix before any firm connects.

---

## 4. Digest dry-run

```bash
# with EMAIL_ENABLED off: trigger the run, confirm it renders + reports per-firm results
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<prod>/api/digest/run | jq .
```

- [ ] Returns `ok:true` with a per-firm `results` array (mode `test` while email is off).
- [ ] Read one rendered `output/missed-digest-*.html` — is it something you'd send a firm?
- [ ] **Before flipping `EMAIL_ENABLED` on:** confirm each beta firm has at least one
      member email. A zero-member firm silently renders-to-file while email is off and only
      starts alerting once email is on (see Accepted Risks). Verify members first.
- [ ] Then, with `EMAIL_ENABLED=true` + Resend keys, run once for a test firm whose ONLY
      member email is yours. Confirm it arrives, links work, nothing goes elsewhere.

---

## 5. Founder alert sweep

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" https://<prod>/api/alerts/sweep | jq .
```

- [ ] Returns `ok:true`. With nothing wrong it sends nothing; a rendered
      `output/founder-alert-*.html` or `beta-pulse-*.html` appears in the 8am LA hour.

---

## 6. CRON_SECRET fail-loud check

- [ ] Confirm `/api/digest/run` **without** the bearer header returns **500** (not a silent
      401) when `CRON_SECRET` is unset on a hosted deploy — and writes an errors-table row
      naming the missing var. If `CRON_SECRET` is set, an unauthenticated call returns 401
      (correct). This is the guard against "firms never get digests and no one notices."

---

## 7. CallRail webhook self-test (only if leading with CallRail)

```bash
node web/scripts/callrail-selftest.mjs --url https://<prod>/webhooks/callrail/<firmId> \
  --secret <firm-signing-key>
```

- [ ] Green: synthetic signed payload → 200 → call row created.
- **If not green or CallRail not ready:** lead the setup call with **"send us your
      recordings"** (the `/desk/upload` path) — it needs no webhook. CallRail can follow.
- Note: the per-firm signing secret is now stored **encrypted** (needs `INTEGRATIONS_ENC_KEY`
      in the env). Store it via `/studio/onboard-firm` or `/api/studio/callrail-secret`.

---

## 8. Boards clean + retention number matches the public promise

- [ ] `/admin/status`: kill switches clear, no unexplained recent errors, pending
      approvals sane.
- [ ] `/studio/beta`: health board loads, per-firm rows sane.
- [ ] Deployed `DATA_RETENTION_DAYS=90` **matches** the `/security` page's 90-day promise.
      (`.env.example` historically said 30 — the deployed value must be 90.)

---

## 9. Provider data-terms decision recorded (from GO_LIVE A7)

- [ ] Either written confirmation of no-training/data-processing terms with AssemblyAI +
      Anthropic is on file, OR Ali has explicitly accepted the standard-terms beta in
      writing in `ops/decisions.md`. Real client audio touches the pipeline Monday — do not
      let this be decided by default.

---

## Accepted risks for Monday (documented, not blockers)

1. **Spanish-language calls are scored by an English-calibrated engine.** Language
   detection is on, but the frozen scorer is English-only and there is no Spanish
   validation (four-fifths audit) yet, and no honest "Spanish — unvalidated" label routing
   these to founder review. **Mitigation:** position the beta as English-intake; make NO
   public claim of validated Spanish scoring (verified in the copy pass). **Ali decision:**
   English-only beta framing vs. build the language-gate (route non-English → founder
   review) before onboarding any Spanish-heavy firm.
2. **Duplicate-scoring race (low probability).** `flags(call_id)` is indexed, not UNIQUE.
   If the 15-min cron sweep fires during the ~95s scoring of the same call, two flags /
   conversations / drafted SMS can be created. Under TEST_MODE + PILOT MODE nothing sends
   and a human reviews every draft, so worst case is a duplicate draft card. **Follow-up:**
   add `UNIQUE(call_id)` on `flags` (twinned sqlite+pg migration) post-beta.
3. **Upload size cap is advisory client-side.** The 200MB check runs on the client-reported
   size before the Supabase signed URL is issued; the PUT itself isn't size-enforced by our
   code. Storage abuse only, no data exposure. **Follow-up:** bucket-level size limit.
4. **Failed call's storage audio object isn't deleted.** With the new terminal-failed guard
   the file is no longer re-downloaded forever, but a permanently-failed call's bucket
   object lingers until the retention sweep. Cost/retention nit, not a leak.

## Ali-only blockers (cannot be cleared by an engineer)

- **NDA template** (`ops/drafts/external/beta-mutual-nda.md`) has no attorney review — the
   apply flow promises it "within one business day." Decide (Yang review vs. soften copy)
   before sending any contract paper.
- **Provider data-terms** decision (gate 9).
- **Launch pricing numbers** and any pricing copy remain a human-approval item.

---

## One paragraph for the first firm at 9am

"Intake QA reads your recorded intake calls and, every morning, emails your team a short
digest of the qualified callers who didn't get signed — with a tap-to-call number and a
one-click 'we called them' button. Your staff make every callback; we never contact your
callers. Send us your recordings (or connect CallRail on our 15-minute setup call) and the
first digest lands the next morning. It's a flat monthly subscription, no per-case or
success fees, and nothing about your callers ever leaves the desk. This is an English-intake
beta while we finish validating Spanish scoring."

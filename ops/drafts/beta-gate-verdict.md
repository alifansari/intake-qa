# BETA GATE VERDICT — Monday 2026-07-14 Intake QA launch

Synthesizer consolidation of five hardening sub-agents (merge-drill, silent-death-reaudit, compliance-copy-sweep, ali-blocker-packet, dress-rehearsal-matrix). Independent code verification already passed (516/516 tests, e2e-synthetic green, build clean). This verdict layers the *operational, migration, silent-death, and compliance* audits on top of that.

Branch: `beta/integration` @ a271fc4. Main @ e81722b. All findings below re-verified from the worktree by the synthesizer; verification status marked per item.

---

## 1. TOP-LINE VERDICT

**NO-GO as the runbook currently reads — convertible to GO-WITH-CONDITIONS Monday morning once the four hard blockers below clear; do not let firm #1's calls flow until (a) the /letter false "published error rate" claim is corrected, (b) hosted migrations are applied through 0038 not 0037, (c) the ops/decisions.md merge conflict is resolved by union, and (d) the Inngest-single-point-of-failure is at minimum documented truthfully and backstopped by an unscored-backlog alert.**

Rationale: three of five sub-agents returned RED, and the synthesizer independently confirmed all three RED triggers from code (merge exits 1 with one conflict; PG floor is 0038 with a real 0035 gap filled only by the merge; /letter asserts a public error rate that `TEST_CORPUS_PRECISION=null` proves does not exist). None of the RED triggers is a code-quality regression — they are a docs/runbook drift, a live public-copy compliance violation, and a scoring availability gap. All are fixable before Monday.

---

## 2. BLOCKERS (must clear before firm #1)

### B1 — /letter falsely claims a published error rate  ·  COMPLIANCE (§V Rule 7.1 / §IV) · Ali sign-off + Claude-stageable
**VERIFIED FROM CODE.** The signed public letter asserts, as its central thesis, that /honesty publishes a live false-alarm rate — but it does not.
- Claim sites: `web/src/app/letter/content.ts:24, :102, :124, :128` and `web/src/app/letter/page.tsx:91` ("I publish my own error rate at /honesty").
- Static mirror repeats it six times: `web/public/letter.txt:16, :92, :94, :116, :120, :126`.
- Reality: `web/src/lib/site-constants.ts:250-251` — `TEST_CORPUS_PRECISION = null`, `TEST_CORPUS_RECALL = null`. The click-through disproves the letter. This is the exact P0 the 2026-07-11 copy audit fixed on every *other* surface; the letter is the last unfixed one.
- **Owner:** Ali (a signed document is a §VII human gate — Claude cannot ship the wording). Claude can stage the exact diff from `ops/drafts/letter-v1.4-proposed-edits.md`.
- **Fix:** apply the staged v1.4 reword on BOTH `content.ts` AND the regenerated `public/letter.txt` (they must stay byte-aligned — fixing content.ts alone leaves the .txt mirror lying), then Ali signs off. Do not serve /letter Monday until the letter and /honesty tell the same story.

### B2 — Hosted migration floor is 0038, not 0037; runbook names a nonexistent file  ·  RUNTIME · Ali-only
**VERIFIED FROM CODE.** `ls web/supabase/migrations/` highest file is `0038_flag_status_attempts.sql`. The real tail is `0034_firm_callrail_secret → 0036_event_log → 0037_welcome_emails → 0038_flag_status_attempts`. There is no `0037_flag_status_attempts.sql`. `MONDAY_GO_NO_GO.md:70` says floor 0037 and mislabels the files.
- Following the doc literally applies "through 0037" (= welcome_emails) and **skips 0038** → the flag-status-attempts columns are absent on hosted Postgres → runtime flag-status writes fail for real firm calls.
- The PG 0035 "gap" and SQLite 0027 "gap" are intentional (a271fc4 renumbered the weekend's migrations above main's rescue-layer `0035_crm_rescue_import`); the merge fills both → post-merge PG contiguous 0001–0038, SQLite 0001–0030. Confirmed benign.
- **Owner:** Ali (hosted Supabase). **Fix:** `cd web && node db/migrate-postgres.mjs 0035 0036 0037 0038` (0035 already applied via the rescue-layer deploy; all idempotent, re-run safe). migrate-postgres applies only the prefixes named, so list them all. Confirm last-applied = 0038.
- **Note:** `npm run smoke` will NOT catch this — `web/scripts/smoke.mjs:38-69` only checks cross-track number-set membership, never intra-track contiguity or hosted apply state. Gate 2 must be verified by hand.

### B3 — Merge is not conflict-free (ops/decisions.md)  ·  RUNBOOK · human-merge (§VII), trivial resolution
**VERIFIED FROM CODE.** `git merge-tree --write-tree main beta/integration` from the primary checkout exits 1 with exactly one conflict — `ops/decisions.md` — an append-only-log collision (main appended copy-audit + Lead-Docket entries; beta appended the s9-redteam entry). Every other touched file auto-merges clean. The runbook's naive `git merge --no-ff` will HALT and gate-0's "no conflicts" checkbox fails as written.
- **Owner:** whoever runs the merge (human presses push per §VII). **Fix:** resolve by union — keep BOTH dated entries, `git add` + `git commit --no-edit`. Corrected runbook in §3.
- No worktree topology blocker: merging *from* beta/integration (live in wt-integration) *into* main is permitted; git only blocks checking out/deleting a worktree-live branch.

### B4 — Scoring pipeline is 100% Inngest-dependent, with no fallback and no unscored-backlog alert  ·  SILENT DEATH · Claude-fixable
**VERIFIED FROM CODE.** Both scoring triggers are Inngest: event `scorePipeline` (`web/inngest/functions.mjs:29-40`) AND the "15-min fallback" `scheduledScoreSweep` (`:49-61`, an Inngest cron). `web/vercel.json` declares only digest + alerts native crons — there is **no** Vercel-native score sweep. If Inngest is unconfigured/outage, `inngest.send()` no-ops and the sweep never fires; calls sit at `status=NULL` forever, rendered as "processing … usually within a few minutes" (`web/src/app/desk/queue/page.tsx:209-221`) with no staleness escalation, and `founder-alerts.mjs` has no "received but never scored" trigger. A whole firm's qualified leads can silently never surface.
- The GO/NO-GO env table's claim that missing INNGEST "falls back to the cron sweep only" is **FALSE** — the sweep is itself an Inngest cron.
- **Owner:** Claude (engineer). **Fix (pre-Monday minimum):** (i) correct the GO/NO-GO env line so the operator knows INNGEST is a hard single point of failure for scoring; (ii) add a founder-alert trigger for `status=NULL` calls older than N hours when received>0. **Fix (proper):** add a Vercel-native score-sweep route that calls `scoreUnscored` directly, independent of Inngest. If (iii) cannot land by Monday, INNGEST must be treated as a launch-critical env var with post-deploy verification, not a "falls back" nice-to-have.

### B5 — CallRail missing/undecryptable per-firm secret dies silently  ·  SILENT DEATH · Claude-fixable
**VERIFIED FROM CODE.** `web/src/app/webhooks/callrail/[firm]/route.ts:42-60`: when `decodeCallRailSecret()` throws (INTEGRATIONS_ENC_KEY missing/rotated, or corrupt ciphertext) the throw is swallowed at :52-54 and, if env `CALLRAIL_WEBHOOK_SECRET` is also unset (normal for a per-firm beta firm), :55-60 returns HTTP 500 with **no logError and no founder alert**. The firm's calls never ingest; /desk/queue shows the benign "connect your calls" first-run panel. The bad-signature (401) and bad-payload (400) branches DO log — this branch is the asymmetric hole, and Session 9's own at-rest-encryption change makes it *more* likely to fire. Legacy route `webhooks/callrail/route.ts:23-26` has the identical no-log 500.
- **Owner:** Claude. **Fix:** add `logError({source:'webhooks.callrail_firm.no_secret', firm_id, context:{firm_slug}})` before the 500 return; do not silently swallow the decode throw (log "secret decrypt failed" with firm_id); optionally add an `isSecretFailure` classifier so repeated no-secret 500s page like signature failures. Gate 7's callrail-selftest catches this only at onboarding, never a mid-beta INTEGRATIONS_ENC_KEY rotation.

### B6 — Ali's ~90-minute human-only packet (env, decisions, legal)  ·  MIXED · Ali-only
Not one blocker but a bundle that gates the deploy; full packet at `ops/drafts/ali-monday-packet.md`. The launch-critical subset:
- **Vercel Production env vars** — must set/override, exact names from `web/.env.example`: `CRON_SECRET`, `DIGEST_LINK_SECRET`, `INTEGRATIONS_ENC_KEY` (now REQUIRED — gates B5), **rotate** `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` (old keys came through chat), `KILL_SWITCH=false` (**example ships `true` — must override**), `TEST_MODE=true`, `DATA_RETENTION_DAYS=90`, `EMAIL_ENABLED=false` at 9am then flip true only after the gate-4 dry-run. `FOUNDER_PHONE` is **absent from `.env.example`** — add by hand.
- **NDA / BAA legal (§VIII + §VII):** /apply promises a mutual NDA "within one business day" (`apply-form.tsx:109`, `api/beta/apply/route.ts:137`) and /pricing+/apply say "a BAA is available" (`site-constants.ts:142`), but both templates on disk are "INTERNAL DRAFT — NOT IN FORCE" pending Yang review. Either clear the templates with Yang before Monday OR soften the copy (needs `npm run build`). Sending unreviewed legal paper is a §VII violation. **Owner: Ali + Yang.**
- **Decisions to record in ops/decisions.md:** pricing (Table C recommended), kill the Intake-Closer per-signed-case mode (contradicts §I flat-only), Spanish English-only-beta framing.

---

## 3. CORRECTED MERGE + DEPLOY + ROLLBACK RUNBOOK (from merge-drill, re-verified)

```
--- STEP 0: MERGE (primary checkout, NOT a worktree) ---
cd "/Users/aliansari/Desktop/Plaintiff Ops/claude"
git fetch origin
git checkout main
git pull --ff-only origin main
git merge --no-ff beta/integration          # EXPECT ONE CONFLICT: ops/decisions.md
# Resolve: open ops/decisions.md, delete the <<<<<<< ======= >>>>>>> markers,
# KEEP BOTH new dated entries (main's copy-audit/Lead-Docket AND beta's s9-redteam). Then:
git add ops/decisions.md
git commit --no-edit                        # completes the merge; NOTE ITS SHA for rollback

--- STEP 0b: VERIFY BEFORE PUSH (from web/) ---
cd web && npm run smoke && npm test && npm run e2e-synthetic && npm run build
# smoke checks cross-track migration membership only — it does NOT prove hosted is at 0038 (see B2)

--- STEP 0c: DEPLOY (human presses this — §VII gate) ---
git push origin main                        # Vercel auto-deploys main

--- STEP 1: HOSTED MIGRATIONS (from web/, DATABASE_URL -> hosted Supabase) ---
cd web
node db/migrate-postgres.mjs 0035 0036 0037 0038   # FLOOR = 0038; 0035 already applied, idempotent
# Confirm hosted Postgres last-applied = 0038 (flag_status_attempts) BY HAND. Smoke will not catch a skip.

--- ROLLBACK (keep handy) ---
# Instant, no rebuild: Vercel dashboard -> Deployments -> last known-good -> Promote to Production
# Git: git revert -m 1 <merge-commit-sha> && git push origin main   (parent 1 = pre-merge main)
# Migrations are additive/idempotent/forward-only: reverting code does NOT drop 0035-0038 (harmless).
```

---

## 4. ALI 90-MINUTE PACKET POINTER

Full human-only checklist: **`ops/drafts/ali-monday-packet.md`** (verified against the worktree). 9am order:
1. Fire legal sends first (Yang NDA/BAA + provider data-terms — latency-bearing).
2. Set/rotate Section-1 Vercel env vars (incl. `INTEGRATIONS_ENC_KEY`, rotate Inngest, `KILL_SWITCH=false`, add `FOUNDER_PHONE`).
3. Apply hosted migrations **through 0038** (B2).
4. Record pricing / kill-closer-mode / Spanish decisions in ops/decisions.md.
5. `npm run smoke` + run the go/no-go gates.
6. Flip `EMAIL_ENABLED=true` only after the gate-4 dry-run to Ali's own inbox passes.

Dress-rehearsal execution matrix (12 hostile-input rows + 3 happy-path checks, all copy-paste curl with expected HTTP codes and file:line assertions) is in the dress-rehearsal-matrix sub-agent output — run it against a local seeded DB (`npm run seed:demo`) before flipping email on. Note: audio-branch rows (corrupted/Spanish/hangup/voicemail) only differentiate if `ANTHROPIC_API_KEY` + `ASSEMBLYAI_API_KEY` are set; otherwise all fail identically at transcription (still a valid isolated-failure pass).

---

## 5. NEW FINDINGS THE WEEKEND'S MONDAY_GO_NO_GO.md MISSED

These are what the red-team's own runbook does not cover — the reason this gate is NO-GO-until-fixed rather than a rubber stamp:

1. **Migration floor is wrong in the doc (B2).** `MONDAY_GO_NO_GO.md:70` says 0037 and names a nonexistent `0037_flag_status_attempts.sql`; the real floor is 0038. Following the doc literally skips flag-status-attempts on hosted Postgres. *(verified from code)*

2. **The merge is not conflict-free (B3).** The doc's gate-0 "merged with no conflicts" checkbox fails — there is exactly one union-resolvable conflict in ops/decisions.md that the naive `git merge` command will halt on. *(verified: merge-tree exits 1)*

3. **INNGEST is a hard single point of failure for scoring, and the env table says otherwise (B4).** The GO/NO-GO claims missing INNGEST "falls back to the cron sweep only" — but the sweep IS an Inngest cron. There is no non-Inngest scoring path and no unscored-backlog alert. A whole firm's leads can stall at status=NULL silently. *(verified from code)*

4. **CallRail no-secret 500 is a silent death (B5).** The doc treats CallRail failure as covered by the 401/400 logging + callrail-selftest, but the missing/undecryptable-secret 500 branch logs nothing and alerts no one — and an INTEGRATIONS_ENC_KEY rotation mid-beta triggers it with no onboarding self-test to catch it. *(verified from code)*

5. **alerts/sweep lacks the digest route's fail-loud, and a missing CRON_SECRET kills the very channel that would report it.** `api/alerts/sweep/route.ts:43-45` returns a silent 401 where `api/digest/run/route.ts:86-91` returns a loud 500. Both crons share CRON_SECRET, so a missing secret simultaneously stops digests AND the alert sweep that would email the "CRON_SECRET not set" row. Gate 6's promise that this "surfaces in the operator alert email" is false for this specific cause — it surfaces only on /admin/status + Vercel cron logs. *(verified from code; medium)*

6. **/letter.txt is a separate static mirror (B1).** Fixing `content.ts` alone leaves the plain-text file at `web/public/letter.txt` (linked from the footer) repeating the false claim six times. The doc's copy-audit tracking treats the letter as one surface; it is two files that must stay byte-aligned. *(verified from code)*

7. **`.env.example` foot-guns.** `FOUNDER_PHONE` (referenced by the go/no-go) is absent from `web/.env.example`; `KILL_SWITCH` ships `true` in the example and must be overridden to `false` in prod. Neither is called out in the doc's env table. *(verified per ali-packet + example inspection)*

---

## APPENDIX — Confirmed-safe (do not re-litigate Monday)
- **§I fee structure:** flat-only across all public/legal pages; only hits are explicit negations of contingent/per-case language. No Intake QA pricing dollar leaks. Guarantee correctly suspended (rendered on zero pages). Retention 72h/90-day consistent across /security, /dpa, /privacy and matches `web/inngest/functions.mjs:83` default. No AB931/SOC2/HIPAA claims (both explicitly disclaimed). *(compliance-copy-sweep, verified)*
- **Accepted Risk #2 (duplicate-scoring race):** truly bounded — worst case is a duplicate DRAFT card in a pending_approval conversation; nothing sends (TEST_MODE + 7-gate human approval). `flags(call_id)` is indexed not unique, but the worker only drafts. *(silent-death, verified)*
- **Accepted Risk #1 (Spanish English-calibrated scoring):** marketing bound is real (validated-Spanish claims removed from /faq and /how-it-works); a throwing Spanish call terminal-fails honestly. Residual is a disclosed scoring-quality limitation, not an undisclosed pipeline silent death. Language→founder-review gate remains absent (known, deferred). *(silent-death, verified)*
- **Digest CRON_SECRET fail-loud (gate 6):** genuinely returns 500 + error_log when unset on a hosted deploy. *(silent-death + dress-rehearsal, verified)*
- **Post-merge migration continuity:** PG 0001–0038 and SQLite 0001–0030 contiguous after merge; branch-only gaps are intentional collision-avoidance filled by the merge. *(merge-drill, verified)*
- **Rollback correctness:** `git revert -m 1 <merge-sha>` keeps mainline parent; Vercel Promote-to-Production is instant; forward-only migrations survive a code revert harmlessly. *(merge-drill, verified)*

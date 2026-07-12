# BETA GATE — CLEARED (Claude-side) · 2026-07-12

Supersedes the NO-GO in `beta-gate-verdict.md`. The four hard blockers that were
Claude-fixable are FIXED, committed on `beta/integration`, and independently re-verified.
Verdict is now **GO, pending the Ali-only items below** (env, migrations, legal, and the
one signed-letter re-sign — none of which an engineer can clear).

## What was fixed and verified (this session)

| Blocker | Fix | Commit | Verified |
|---|---|---|---|
| **B1** — /letter falsely claimed a *currently-published* error rate (§V/§IV/§VIII); live on prod, 6 instances across content.ts + letter.txt mirror | Reworded every instance to the truthful commitment posture /honesty actually holds (method + failure modes published now; the number publishes with its documented corpus, not before). Voice preserved; v1.4 | `55b4d04` | Live: `/letter` + `/letter.txt` render corrected copy, zero stale claims; **§VII: awaits Ali re-sign before deploy** |
| **B5** — CallRail missing/undecryptable per-firm secret 500'd *silently* → firm calls never ingest, invisibly | Both webhook routes now `logError` before the 500 (source `webhooks.callrail_firm.no_secret` / `webhooks.callrail.no_secret`); stopped swallowing the decode throw | `ef61cd6` | Live: clean 500 + JSON error (was silent); log wiring unit-tested |
| **B4** — scoring 100% Inngest-dependent, no native fallback, no "received-but-never-scored" alert; runbook falsely claimed a cron-sweep fallback | New `stuckUnscoredCalls` store helper (sqlite+pg twinned) + `stuckUnscoredFirms` trigger in the founder-alert sweep (`STUCK_SCORING_HOURS` default 2, batched one-email-per-window); corrected the false runbook line | `ef61cd6` | +3 unit tests pass; build clean |
| **alerts/sweep** lacked digest's fail-loud CRON_SECRET guard (silently 401'd) | Mirrored digest/run's fail-loud (500 + logError source `alerts.sweep`) on a Supabase-configured deploy with the var unset; local bypass + wrong-secret 401 preserved | `ef61cd6` | build + logic mirror verified |
| **B2** — migration floor doc said 0037, actual highest is **0038** | Corrected floor + relabeled 0036/0037/0038; noted harmless 0035 gap | `ef61cd6` | verified against migrations/ |

## Independent re-verification (combined HEAD ef61cd6, both fixes)
- `npm test` → **519 pass / 0 fail** (+3 new)
- `npm run e2e-synthetic` → **all stages PASS**, nothing transmitted
- `npm run build` → **clean**, 80/80 static pages
- Live dev drive → all pages 200, auth gates 307, digest fail-loud 500, CallRail no-secret clean 500, /letter corrected. **Zero 5xx.**

## Residual — ALI-ONLY (see `ali-monday-packet.md` for the full ~90-min checklist)
1. **Re-read + re-sign the v1.4 letter** (`55b4d04`) — signed content, §VII. Do NOT serve /letter until approved.
2. **Vercel env** — CRON_SECRET, DIGEST_LINK_SECRET, INTEGRATIONS_ENC_KEY (required), rotate INNGEST_*, KILL_SWITCH=false (example ships true), TEST_MODE=true, DATA_RETENTION_DAYS=90, FOUNDER_PHONE (not in .env.example), + Supabase/Anthropic/AssemblyAI/Resend keys.
3. **Hosted Supabase → migrate through 0038.**
4. **Decisions:** pricing (Table C rec), kill Intake-Closer per-signed-case mode, English-only-beta framing.
5. **Legal (latency-bearing, start first):** Anthropic + AssemblyAI data-terms on file; Yang review of NDA/MOU/BAA + the AB931/SB37 clearance memo; Dropbox Sign NDA template. Soften the "BAA available"/"NDA within one business day" copy OR clear the templates with Yang first.

## Monday merge (one trivial step)
`git merge --no-ff beta/integration` into main conflicts on exactly one file — `ops/decisions.md` (append-only log). Union-resolve (keep both dated entries), commit, then deploy from main. Full runbook in `beta-gate-verdict.md` §3. Rollback: Vercel promote-previous, or `git revert -m 1 <merge-sha>`.

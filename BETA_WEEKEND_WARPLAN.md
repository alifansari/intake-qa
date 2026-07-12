# Beta Weekend War Plan — Fri 7/11 → Mon 7/14

> Built from a 4-agent deep audit of this repo on Fri 2026-07-11 (launch blockers, GTM/legal,
> day-1 firm journey, engine v1/v2). Every prompt below is copy-paste ready for a fresh
> Claude Code session and is pre-loaded with the exact file paths so the session doesn't
> burn an hour rediscovering them.

## The thesis

The beta does not die from missing features. It dies four ways:

1. **Calls silently never arrive or never score.** CallRail signature format is unverified
   (`ingest/callrail.mjs` warns about it in its own comments), per-firm secrets have no UI,
   the digest cron 401s without `CRON_SECRET`, scoring depends on Inngest registration with
   no `maxDuration`, and the queue shows a false "All clear" while scoring is broken.
2. **A lawyer asks for a trust artifact you don't have.** The site promises a BAA that
   doesn't exist anywhere in the repo. The NDA is promised "within one business day" but the
   template is un-reviewed and Dropbox Sign is sandboxed.
3. **You are blind.** Zero product analytics. The activation event (first callback marked
   within 48h) is defined in BETA_ONBOARDING.md and measured nowhere. Errors are pull-only
   in `/admin/status`.
4. **Unresolved facts only Ali can decide.** Three inconsistent pricing tables. The QC
   meta-finding from Wave 8: every QC failure clustered on *our own facts*.

So the weekend, in priority order: **make the pipeline unbreakable and loud → make yourself
all-seeing → make every trust ask answerable in under a minute → bank week-2 ammunition.**
Conversion polish (queue hygiene, statute clock) comes only after the pipeline tells the truth.

## Ground rules for every session

Paste this preamble at the top of each prompt (or keep it in mind — CLAUDE.md carries most of it):

```
Work from origin/main, not feature/scoring-v2 — create a fresh branch off origin/main for
this session's work. The frozen v1 scoring engine (scoring/, lib/, system-prompt.md, golds)
is untouchable. Compliance-invariants is supreme. Nothing sends/publishes — stage and stop
at the human gate. Verify with: cd web && npm run smoke && npm test && npm run build
(and npm run e2e-synthetic for pipeline changes). Append a dated entry to ops/decisions.md.
When done, run /code-review and fix confirmed findings before telling me it's ready.
```

Parallelize: Sessions 0–2 are sequential (same code surface). From Saturday on, run 2–3
sessions in parallel worktrees — product code (Sessions 3, 7), docs/legal (Sessions 5, 6),
and engine (Session 8) never touch the same files.

---

## ALI-ONLY CHECKLIST (~90 minutes, dashboards + decisions — Claude can't do these)

**Vercel env (Production) — do Friday night, before Session 0's deploy:**
- [ ] `CRON_SECRET` — without it the daily digest cron 401s forever (the beta's core moment)
- [ ] `DIGEST_LINK_SECRET` (≥16 chars) — without it digest emails lose their one-click buttons
- [ ] `RESEND_API_KEY` + `RESEND_FROM` — founder application pings + digests
- [ ] `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY` — **rotate first** (they passed through chat, TODO_ALI.md:9); confirm the Inngest app is registered against prod
- [ ] `INTEGRATIONS_ENC_KEY` — blocks storing any CRM/CallRail credential until set
- [ ] `CALLRAIL_WEBHOOK_SECRET` (shared fallback)
- [ ] Keep `KILL_SWITCH=true`, `TEST_MODE=true` until Session 0 decouples email from TEST_MODE

**Supabase dashboard:**
- [ ] Apply migration `web/supabase/migrations/0034_firm_callrail_secret.sql` to hosted (0023–0033 confirmed applied; 0034 is not)
- [ ] Auth → enable magic-link + redirect `https://<domain>/auth/callback`; disable public sign-ups

**Legal/vendor (start Friday, these have latency):**
- [ ] Anthropic BAA + AssemblyAI BAA — GO_LIVE gates 2–3, unchecked; real client audio needs them
- [ ] Send Yang Review Packet #2 (`ops/drafts/yang-review-packet-2.md`) + NDA/MOU templates — the "NDA within one business day" public promise depends on this
- [ ] Dropbox Sign: create NDA template, set `DROPBOX_SIGN_NDA_TEMPLATE_ID` (stay sandbox until Yang clears)

**Decisions (10 min each, Session 6 preps the paperwork):**
- [ ] Pick the pricing table (Wave 9 brief recommends Table C: list $2,500/$5,000, founding $1,500×12mo, cap 10) — then commit the §I replacement text
- [ ] Kill the Intake Closer per-signed-case pricing mode (contradicts "never outcome-tied")

**Monday:** deploy from `origin/main` (NOT feature/scoring-v2), then run the Session 10 go/no-go.

---

## THE PROMPT ARSENAL

### Session 0 — Friday night: Ship-blockers & truth fixes (~2h)

```
Beta launches Monday with real CA law firms. Fix the confirmed launch blockers on a fresh
branch off origin/main. All findings below are verified — go straight to fixing:

1. MERGE origin/letter/norcal-factcheck-fix (13 lines, fixes a known-false Sacks/Berkeley
   claim live on /letter — compliance-invariants violation while LACBA outreach is live).
2. MERGE origin/site/presidential-polish-1 (1 commit, 7 files — fixes the /audit funnel,
   the free-Leak-Audit wedge every firm touches first).
3. DECOUPLE email from TEST_MODE. Today one switch arms both digest email and SMS:
   BETA_ONBOARDING.md:40 says flip TEST_MODE=false for digests, GO_LIVE.md:43 forbids it
   until A2P/BAAs. Add an EMAIL_ENABLED flag gating only Resend paths
   (web/messaging/missed-digest.mjs, digest.mjs, weekly-report.mjs, alerts.mjs) so SMS
   arming stays behind TEST_MODE + KILL_SWITCH untouched. Update both docs to match.
4. Digest cron auth: web/src/app/api/digest/run/route.ts:23-31 silently 401s a Vercel cron
   GET when CRON_SECRET is unset. Make missing CRON_SECRET fail LOUD (500 + error_log entry
   naming the missing var), and log every digest run's outcome per firm.
5. False "All clear": web/src/app/desk/queue/page.tsx renders "All clear" when calls
   received > 0 and leaks = 0 — even if calls are stuck unscored. Add a pending/processing
   state: if any call for the firm is received-but-unscored or failed_scoring, show
   "N calls processing" instead of the green light.
6. Add maxDuration=300 to web/src/app/api/inngest/route.ts (scoring is ~95s/call; the
   demo processors already set it, the real one doesn't).
7. Guard the DIGEST_TO collision: both crons fire at 0 15 * * *. Ensure the internal
   approval-queue digest (inngest dailyDigest → messaging/digest.mjs) can never reach a
   firm — skip it entirely unless DIGEST_TO is explicitly set to an internal address.
8. Doc truth pass: web/README.md:44 says migrations 0001–0030 (actual: 0034);
   INTAKE_SYSTEM.md:6 says 0024–0029 applied (actual: 0023–0033); CLAUDE.md names the send
   chokepoint as web/src/lib/messaging/send.ts (actual: web/messaging/send.mjs). Fix all.

Verify: cd web && npm run smoke && npm test && npm run e2e-synthetic && npm run build.
Then /code-review. Append ops/decisions.md entry. Give me the exact click-path to verify
each fix on the deployed site.
```

### Session 1 — Friday night / Sat am: CallRail bulletproofing (the #1 week-1 killer)

```
The single most likely beta killer: CallRail webhooks silently 401 and a firm sees "0 calls"
forever. ingest/callrail.mjs verifies HMAC-SHA256 hex of the raw body but its own comment
says the exact header name / digest encoding varies per CallRail account and was never
verified against a real payload. Also: firms.callrail_webhook_secret (migration 0034) has
no UI writing it — firms #2+ will 401 on the shared-secret fallback.

On a branch off origin/main (rebased on Session 0's merge):

1. Research CallRail's actual webhook signature spec (WebSearch/WebFetch their docs:
   signature header name, base64 vs hex, token location). Make verifyCallRailSignature
   handle the documented real format(s), with the format assumption logged on first
   verified webhook per firm.
2. Build scripts/callrail-verify.mjs: given a captured real webhook (headers+body saved to
   a file) and a secret, it tells you which format matches. This is the setup-call tool.
3. Add a founder-only field in /studio onboarding (or firm settings) that writes
   firms.callrail_webhook_secret — no more manual DB edits per firm.
4. Add a webhook self-test: a founder-triggerable endpoint or script that POSTs a synthetic
   signed payload at /webhooks/callrail/[firm] and confirms 200 + call row created — so
   every setup call ends with a verified green check, not hope.
5. Failure loudness: on webhook 401/400, write error_log with firm + reason; if a firm gets
   3+ signature failures in an hour, that must surface (Session 3 wires alerting; here just
   make the data exist).
6. Write ops/drafts/callrail-setup-runbook.md: the exact 10-minute setup-call script for
   firm #1 (where in CallRail's UI, what to paste, how to fire a test call, what green
   looks like in /admin/status).

Verify with npm test + a unit test per signature format + the self-test loop locally.
/code-review when done. decisions.md entry.
```

### Session 2 — Saturday: Firm self-serve MP3 upload (kills the "email files to Ali" bottleneck)

```
There is NO firm-facing recording upload in the desk (grep upload src/app/desk → empty).
A firm without working CallRail must email files to the founder who hand-ingests via CLI.
That fails past 1–2 firms and is invisible to the firm. The Leak Audit uploader caps at
25MB (api/demo/upload-url MAX_BYTES) — a 45-min MP3 exceeds it — while the studio path
(/api/studio/recordings/upload-url) already allows 200MB via signed URLs.

On a branch off origin/main:
1. Build /desk/upload: firm-scoped recording upload reusing the studio signed-URL pattern
   (200MB, mp3/wav/m4a), auth'd to the signed-in firm, feeding the same
   intakeqa/call.received → scorePipeline path as the webhook. Show per-file status:
   uploaded → transcribing → scored (or "we hit a problem — we've been notified").
2. Raise the Leak Audit cap to match (or clearly state the real limit in the UI — the copy
   currently promises 25MB while Vercel direct mode dies at ~4.5MB; make copy = reality).
3. Surface upload/scoring failures to the uploader (failed_scoring exists in the DB but the
   firm never sees it — see the silent-failure list in BETA_WEEKEND_WARPLAN.md).
4. Add "Upload recordings" as a first-class option in the empty-queue first-run panel
   (HowCallsArrive.tsx) next to CallRail.

Non-technical law-firm staff use this: plain words, no jargon, generous file-type errors.
Verify end-to-end with e2e-synthetic + a real local file through the dev server (use the
preview tools; screenshot the flow). /code-review. decisions.md entry.
```

### Session 3 — Saturday: Mission control — instrumentation + alerting (you cannot run a beta blind)

```
There is zero product analytics in web/ (verified by grep: no PostHog/Plausible/track()).
The activation event is defined in BETA_ONBOARDING.md — "first callback marked done within
48h of first digest" — and measured nowhere. Errors land in error_log surfaced only if the
founder opens /admin/status. Fix the blindness on a branch off origin/main:

1. Minimal first-party event log (a migration + one insert helper through the Repository
   seam — no third-party analytics for confidential legal data): sign_in, desk_view,
   digest_sent, digest_link_clicked, callback_marked, upload_started/completed,
   audit_started/completed, apply_submitted. Wire the 8 call sites.
2. /studio/beta: per-firm health board — calls received vs scored vs failed (24h/7d),
   last activity, last digest outcome, callbacks marked, activation status (48h clock),
   and the two conversion funnels that decide everything per ops/insights.md B1/B2:
   audit→pilot and pilot→paid.
3. Founder alerting (email via the EMAIL_ENABLED path from Session 0, to FOUNDER_EMAIL):
   (a) any failed_scoring, (b) 3+ webhook signature failures/hour for a firm, (c) digest
   run skipped or failed, (d) new application, (e) daily 8am one-line beta pulse (per-firm:
   received/scored/acted). Batch, don't spam — one digest per trigger window.
4. Digest opens: BETA_ONBOARDING.md says "three consecutive unopened digests = call the
   firm" — wire Resend open-tracking (or a pixel) so that's measurable, and show streaks
   on /studio/beta.

Keep ALL of it founder-only. Verify with npm test + e2e-synthetic + preview screenshots of
/studio/beta with seed data. /code-review. decisions.md entry.
```

### Session 4 — Saturday: Onboarding autopilot + beta comms kit (staged, you press send)

```
Onboarding today: POST /api/studio/onboard-firm returns raw JSON (signin_url, one-time
password, webhook_url) that the founder hand-pastes into an email. One forgotten field
strands a firm at sign-in. On a branch off origin/main:

1. Make onboard-firm also compose the complete welcome email (rendered, firm-personalized:
   sign-in link, temp password, CallRail URL + "forward to whoever runs your phones", the
   upload page from Session 2, what happens next, Ali's cell). Stage it: save to the firm
   record + show in /studio with a copy button; auto-send via Resend only when
   EMAIL_ENABLED and founder clicks send. Never autonomous.
2. Draft the beta cadence templates in ops/drafts/beta-comms-kit.md, all staged per
   compliance-invariants §VII (Ali sends everything):
   - Day-0 welcome (above), Day-1 "your first calls are in" note, Day-3 check-in,
     Day-7 "your first week" mini-recap that mirrors the wins strip
   - The "we hit a problem with call X, here's what we did" incident note
   - The setup-call agenda (15 min: CallRail paste + test call + first upload + who gets
     the digest) — align with ops/drafts/callrail-setup-runbook.md from Session 1
3. Update DEMO_SCRIPT.md against the persona field guide in ops/insights.md (2026-07-10):
   run-it-on-THEIR-calls demo, never vendor ROI math, coordinator sees her own calls
   first, credit framing. The ROI spine for 1:1s: ~$284/lead verified; one recovered
   signable case (fee typically >$10k) pays a year of Core — present ranges, never point
   estimates.
4. Fix the apply-form gap: apply-form.tsx never collects records_calls or spanish_call_pct
   so qualify() always appends the not_recording_yet noise — add the two fields.

Nothing sends autonomously. Verify build + tests + preview the welcome-email render.
/code-review. decisions.md entry.
```

### Session 5 — Sat/Sun: Trust arsenal — BAA, security one-pager, runbook truth (docs lane, parallel-safe)

```
A diligent LA attorney's ops person asks for security/legal artifacts Monday. Current gaps
(verified): the site PROMISES a BAA (site-constants.ts BETA_CONDITIONS[0], the LACBA post,
MOU §6) but NO BAA document exists anywhere in the repo. No firm-facing security one-pager
(web/SECURITY.md is internal). GO_LIVE.md is pre-pivot (SMS-first framing, names migrations
0006/0007 as critical, ignores the digest desk). All work stages in ops/drafts — nothing
publishes without Yang/Ali.

1. Draft ops/drafts/external/beta-baa.md: a plain-English BAA template consistent with our
   actual posture (subprocessors: Vercel, Supabase, AssemblyAI, Anthropic, Resend, Twilio;
   the /security page's real claims: AES-256/TLS, per-firm isolation, never trains models,
   DATA_RETENTION_DAYS purge, breach-notice window). Mark it DRAFT — PENDING ATTORNEY
   REVIEW like the DPA, with Yang reviewer notes on the open questions (is a BAA even the
   right instrument vs the DPA for non-PHI PI intake? — flag it, don't decide it).
2. Draft ops/drafts/external/security-onepager.md: one page, firm-facing, from /security +
   SECURITY.md + web/beta/security-posture.mjs. Explicitly disclaims SOC 2/HIPAA per our
   no-overclaim rule. PDF-ready.
3. Rewrite GO_LIVE.md as the true Monday runbook: digest-first beta, EMAIL_ENABLED (Session
   0), the real migration floor (0034), the CallRail self-test (Session 1), the go/no-go
   gates that actually apply Monday vs the SMS gates that stay parked (A2P, twilio not even
   in package.json).
4. Narrow the NDA promise if needed: welcome/page.tsx, apply-form.tsx, api/beta/apply all
   promise the NDA "within one business day" while the template is un-reviewed. Propose
   (don't ship) two options for Ali: (a) keep the promise, send Yang the NDA tonight, or
   (b) soften to "we'll send our mutual NDA as soon as you're accepted." Stage the copy
   diff for option (b).

/code-review the copy changes. decisions.md entry listing what's staged and what's gated.
```

### Session 6 — Sunday: Pricing decision pack (makes Ali's 10-minute decision, then executes it)

```
Pricing is BLOCKED ON ALI with three inconsistent tables circulating (ops/decisions.md
2026-07-10 "OPEN DECISION FOR ALI"). The Wave 9 brief (ops/drafts/pricing-decision-brief.md)
recommends Table C: list $2,500/$5,000, founding $1,500 locked 12 months, capped to first
10 firms, and contains exact compliance-invariants §I replacement text in its §5.

1. Produce ops/drafts/pricing-final-onepager.md: the three tables side by side, the
   Wave 9 reasoning compressed to 10 lines, what each table implies for the founding-cohort
   promise already live on /pricing ("founding testers lock preferred pricing"), and a
   RECOMMEND line. One page. Ali reads, picks, replies.
2. Pre-stage the execution so the decision lands in minutes: a ready branch with (a) the
   §I replacement text applied to .claude/skills/compliance-invariants/SKILL.md, (b) the
   MOU §4 blanks (design-partner-mou.md) filled, (c) a dated ops/decisions.md entry
   template, (d) any site-constants copy that changes at launch (NOT during beta — pricing
   stays hidden until then; verify nothing leaks a number to the public site now).
3. Resolve the contradiction: the staged Intake Closer per-signed-case pricing mode
   violates "never outcome-tied, never a share." Draft the kill memo (or the argument for
   keeping it and changing the invariant — but per compliance-invariants supremacy, the
   default is: the pricing mode dies, the invariant stays).

Nothing merges until Ali's word. decisions.md entry says exactly that.
```

### Session 7 — Sunday: Conversion machinery — the top-ICE product pass (parallel with 6/8)

```
With the pipeline truthful (Sessions 0–3), ship the highest-ICE conversion items from
ops/backlog.md on a branch off origin/main. These are what make the desk survive week 3
(the make-or-break of beta adoption per the persona field guides in ops/insights.md):

1. B-010 (ICE 512) — queue hygiene: terminal cards collapse, oldest-actionable first.
2. B-013 (ICE 216) — statute clock on flagged cases: it's already PROMISED in the queue
   footnote and is currently vaporware. Show elapsed-time-since-call urgency honestly —
   NO computed statute deadline dates (compliance rail: urgency flags only, the firm's
   lawyer owns deadlines).
3. B-011 (ICE 336) — attempt-count nudge toward 6 touches (Velocify: 93% of conversions
   happen by call 6; most firms stop at 2). Frame as encouragement, never surveillance.
4. B-012 (ICE 280) — coordinator "your wins" tally: recognition is the only ethically
   permitted staff upside (per-case bonuses barred). Extend the wins strip.

Persona rails (from insights 2026-07-10): exception-based, credit-framed, no red-numbers-
without-a-path-to-green, one screen/one queue/one tap. Coordinator language, not analyst
language. Verify each with preview screenshots + npm test + e2e-synthetic. /code-review
with high effort — this is the surface firms live in. decisions.md entries per item.
```

### Session 8 — Sunday: Engine v2 week-2 ammunition (offline only, zero product risk — parallel-safe)

```
v2 stays OUT of production (activation gate needs attorney review + a dual-labeled corpus
that doesn't exist — see scoring-v2/README.md "Activation gate"). But the weekend can turn
v2 into an activation-ready candidate. All offline, nothing touches web/ or the firms:

1. Run phase-1 validation locally (needs only ANTHROPIC_API_KEY): score the six golds
   through scoring-v2/score-v2.js via the harness; then author + run the four canary
   transcripts the README names: over-conversion, Prop-213, Spanish-language, borderline
   develop/sign. Log verdicts to a git-ignored output/ dir.
2. Build a batch wrapper around compare-v1-v2.js that sweeps a folder of transcripts and
   appends one JSONL row per call (v1 score/flag vs v2 disposition/tiers/abstention) —
   the private delta log that becomes the evidence base for the week-2/3 Ali decision and
   the start of the phase-2 corpus.
3. Prototype the dark adapter: v2 verdict → a SIBLING record (never edit ScoredCall — hard
   rule in CLAUDE.md), behind a default-off flag, no UI. So activation later is a flag
   flip against exercised code.
4. Draft the activation paperwork in ops/drafts/: the decisions.md entry template + the
   PI-attorney/Yang §VII review checklist (prompt, gates, decline/refer language, fairness
   rails, Spanish four-fifths tripwire).

Do NOT merge feature/scoring-v2 into main. Keep everything inert. decisions.md entry.
```

### Session 9 — Sunday night: Red-team dress rehearsal (the last gate before Monday)

```
Adversarial pass on everything the weekend shipped. Treat it as a skeptical firm + a
hostile ethics counsel + a bored intake coordinator all hitting the product at once.

1. /security-review on the weekend's cumulative diff.
2. /code-review high on the cumulative branch (or /code-review ultra for the multi-agent
   cloud review if this is a PR).
3. Simulate the hostile week-1 inputs end-to-end on the dev server (preview tools): a
   corrupted MP3, a 100MB WAV, an m4a, a Spanish call, a 30-second hangup call, a
   single-speaker voicemail, a CallRail payload with a wrong signature, the digest cron
   with and without CRON_SECRET, a firm with zero member emails (the silent digest-skip
   path in sendMissedDigest). Every one must end in either a user-visible state or a
   founder alert — zero silent deaths. Fix what fails.
4. Hostile-ethics-counsel copy pass: every public page (/pricing, /security, /compliance,
   /honesty, /letter, /audit, /apply, /dpa, /msa, /terms) against compliance-invariants:
   no dollar figures aloud, no "AB 931 compliant" claims (retained review pending), no
   earnings claims, guarantee correctly suspended, DPA still marked draft, the two ground
   rules intact (firm's staff make every callback; we never contact prospects). Also
   Spanish posture honesty: language_detection is on but the frozen scorer is
   English-calibrated — ensure no surface claims validated Spanish scoring; Spanish calls
   should route to founder review with an honest label until the four-fifths audit exists.
5. Produce MONDAY_GO_NO_GO.md: the 15-minute morning checklist — deploy from origin/main,
   env presence check (npm run smoke), one synthetic call through the full pipeline on
   prod, digest dry-run, CallRail self-test green, /admin/status + /studio/beta clean,
   rollback command.

Report what was found and fixed, what's accepted-risk, and what's genuinely go/no-go.
```

### Monday 7:00am — Go/no-go

```
Run MONDAY_GO_NO_GO.md top to bottom against production. For each gate report PASS/FAIL
with evidence (response codes, screenshots, row counts). Anything FAIL: fix if <30min,
otherwise give me the honest workaround script for the setup calls (e.g. "CallRail deferred,
firms start on upload"). End with one paragraph: what I tell the first firm at 9am.
```

---

## Week-2 seeds (don't touch this weekend)

- v2 activation decision once the offline delta log has ~30 real calls + Yang's read
- B-014 fee-number unification; B-005 retained regulatory review → unlocks public compliance claims
- LACBA five-questions piece (B-020) once Yang clears Q1–Q3
- Outcome-data flywheel (`origin/feature/increment-0-flywheel` — staged dark, migration 0035)
- Cherry-pick review of the P0/P1 reliability commit on `origin/offer/charter-and-checkout` (085a902)
- Digest-unopened-streak intervention playbook once opens data exists

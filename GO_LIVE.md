# GO LIVE — the Monday beta runbook (digest-first)

**Rewritten 2026-07-11 for the digest-first beta.** The old version of this file was
written for an SMS-first launch. That launch is **parked**: the beta that starts Monday
is the **desk + daily email digest**. No SMS goes out. `TEST_MODE` stays `true`.

Two lists below. **Part A** is what must be true Monday morning. **Part B** is the old
SMS gate list — it stays parked and none of it blocks Monday, but do not delete it: it
comes back the day texting is turned on.

> Prove the pipeline end-to-end at any time, safely: from `web/` run
> **`npm run e2e-synthetic`** (fake data, nothing sent — every stage should print PASS).
> Fast readiness check: **`npm run smoke`**. Live guardrail board: **`/admin/status`**.

---

## Part A — Monday gates (all must be checked before firm #1's calls flow)

### [ ] A1. Hosted database is at the migration floor: **0034**
Apply **every** file in `web/supabase/migrations/` to the hosted Supabase database, in
order, through **`0034_firm_callrail_secret.sql`**. (The old checklist said 0006/0007 —
that is years of drift; the floor is 0034.) `npm run smoke` confirms the migration tracks
match in the repo; you still run the SQL on the hosted DB and confirm 0034 is applied.

### [ ] A2. Vercel environment variables present
Check each of these exists in the Vercel project (values live only there — never in code):

- `SUPABASE_URL` / keys, `ANTHROPIC_API_KEY`, `ASSEMBLYAI_API_KEY` — the pipeline.
- `FOUNDER_EMAIL` — gates the studio and the manual digest button.
- `CRON_SECRET` — authorizes the daily digest cron (`vercel.json` fires
  `/api/digest/run` at 15:00 UTC = 8:00am PT). **If this is unset the cron cannot run.**
- `DIGEST_LINK_SECRET` — signs the links inside digest emails.
- `RESEND_API_KEY` + `RESEND_FROM` — live email delivery (verified sender).
- `EMAIL_ENABLED` — **the email switch.** *Dependency note: this flag is being added in
  the Session 0 ship-blockers branch (it decouples digest email from `TEST_MODE`). Until
  that lands and deploys, digest email is still gated by `TEST_MODE`, which stays `true`
  — meaning digests render to files and nothing emails. Do not flip `TEST_MODE` to get
  email; wait for `EMAIL_ENABLED`.*
- `KILL_SWITCH=false` — the digest route halts everything while this is `true`. Flipping
  it back to `true` is still the one-move emergency stop.
- `TEST_MODE=true` — **stays true.** This is what keeps SMS simulated (Part B).
- `DIGEST_TO` — only if you want the internal approval-queue digest; it must be an
  **internal** address, never a firm's (Session 0 adds a guard for this).

### [ ] A3. Digest dry-run, then live send to yourself
1. With `EMAIL_ENABLED` off (or before Session 0 lands): trigger `/api/digest/run` (the
   founder "Send today's digests" button, or a GET with `Authorization: Bearer
   $CRON_SECRET`). Confirm it returns per-firm results and renders the digest file.
   Read the rendered digest — is it something you'd want a firm to receive?
2. With `EMAIL_ENABLED=true` and Resend keys set: run it again for a test firm whose only
   member email is **yours**. Confirm the email arrives, the links work (signed by
   `DIGEST_LINK_SECRET`), and nothing went to anyone else.

### [ ] A4. Synthetic call through the PRODUCTION pipeline
`npm run e2e-synthetic` locally proves the code path; before Monday also push one
synthetic call through the deployed prod pipeline (upload path or signed webhook) and
watch it land on the desk: received → transcribed → scored → flagged → visible at
`/desk`. If it sticks at "received," stop and fix before any firm connects.

### [ ] A5. CallRail webhook self-test for firm #1
Run **`web/scripts/callrail-selftest.mjs`** against the deployed webhook URL with the
firm's signing secret (per-firm secret lives in `firms.callrail_webhook_secret`,
migration 0034). *Dependency note: this script and the verified signature format are
Session 1's deliverable; until it lands, do NOT promise CallRail at a setup call — lead
with "send us your recordings" (upload path), which needs no webhook.* Green here means:
synthetic signed payload → 200 → call row created.

### [ ] A6. NDA logistics ready (the one-business-day promise)
The apply flow promises the mutual NDA "within one business day." Dropbox Sign is
sandboxed, so **you send it manually** — have the NDA ready to email the same day an
application lands, and check `/studio` for `nda_pending` applicants every morning.
**Open item routed to Ali/Yang:** the NDA template itself
(`ops/drafts/external/beta-mutual-nda.md`) has not had attorney review — see
`ops/drafts/nda-promise-options.md` for the decision (get Yang's read vs. soften the
copy). Do not send unreviewed contract paper without deciding that on purpose.

### [ ] A7. Provider data-terms check (moved EARLIER by the pivot, not later)
The old checklist put "Anthropic BAA/zero-retention" and "AssemblyAI BAA" behind the
texting gate. That was wrong placement: those agreements are about **real client call
audio touching the pipeline**, which starts **Monday**, texting or not. Before firm #1's
real calls flow, either (a) have written confirmation of the data-processing/no-training
terms with AssemblyAI and Anthropic on file, or (b) Ali explicitly accepts, in writing in
`ops/decisions.md`, that the beta runs on the providers' standard terms until the signed
versions land. Do not let this be decided by default.

### [ ] A8. Guardrail board green
Open `/admin/status`: kill switches, pending approvals, recent errors. `npm run smoke`
passes. The error log is empty of unexplained entries.

---

## Part B — PARKED: the SMS gates (none of these block Monday)

**Everything here stays exactly as it was — parked.** `twilio` is not even installed in
`web/package.json`; all send paths are simulated while `TEST_MODE=true`. These gates
come back the day Ali decides to turn texting on, and **all** must pass before
`TEST_MODE` is ever flipped to `false`:

1. **A2P 10DLC brand + campaign APPROVED** in the Twilio console (not "pending").
2. **Twilio actually installed and wired** through the single send chokepoint
   (`web/messaging/send.mjs`) — no code path may send around it.
3. **Quiet hours + opt-out verified with YOUR OWN phone** in staging: no sends
   8:00pm–8:00am recipient-local; STOP/UNSUBSCRIBE/CANCEL/QUIT/END/REVOKE/OPT OUT all
   mark the number opted-out immediately, logged, never texted again.
4. **PILOT MODE confirmed on**: a human approves every outbound text in the queue —
   this is never turned off.
5. **Kill switch tested against SMS**: throw it, attempt a send, verify blocked.
6. **Firm's retainer template loaded in Dropbox Sign** and verified (out of sandbox
   deliberately, not by accident).
7. **Ethics-counsel sign-off on file** for the flat-fee arrangement and the inbound-lead
   TCPA posture.
8. **Only then: `TEST_MODE=false`.** The single switch that starts real texting.

---

## After go-live — keep these true (unchanged)

- **KILL_SWITCH is one move away.** `KILL_SWITCH=true` halts digests and (later) sends.
- **PILOT MODE stays on** whenever texting exists: a human approves every message.
- **Data retention:** transcripts purge on the rolling `DATA_RETENTION_DAYS` sweep.
  The code default is 90 days and the public /security page promises a 90-day window —
  **make sure the deployed env value says 90**, because `.env.example` still says 30
  (an inconsistency flagged 2026-07-11; whichever number is deployed must match the
  public promise).
- **Secrets** live only in environment variables — never in code, never committed.

**If in doubt at any point: set `KILL_SWITCH=true`, stop, and ask.**

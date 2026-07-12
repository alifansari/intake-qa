# CallRail setup-call runbook — the 10-minute connect script

*The setup call ends with a verified green check, not hope. Draft for firm #1;
reuse for every beta firm. Written 2026-07-11 (beta weekend, Session 1).*

**What this connects:** every call the firm's CallRail account records starts
flowing into their Intake QA desk automatically, verified by CallRail's webhook
signature so nobody can spoof calls into their desk.

**CallRail's real signature spec** (verified against their published test
vector, https://apidocs.callrail.com/ → Security → Validating Payloads):
CallRail sends a `Signature` header containing an **HMAC-SHA1 of the raw POST
body, Base64-encoded**, keyed with the account's **signing key**. One signing
key per CallRail *account* — you can't choose it, and firm #2's key is not firm
#1's. That's why every firm needs its own key stored (step 3).

---

## Before the call (5 min, you alone)

1. Firm exists (onboarded via `/studio/onboard-firm`) and you have their
   **webhook address** from the onboarding result / welcome email:
   `https://plaintiffops.com/webhooks/callrail/<firm-id>`
   (also shown in their desk: `/desk/settings`).
2. Confirm migration `0034_firm_callrail_secret` is applied to hosted Supabase
   (until then, per-firm keys can't be saved — the save button will say so).
3. Have a terminal open in the repo (`web/`) for the self-test.

## On the call (10 min, screen-share their CallRail)

### 1 — Open their webhook settings (2 min)
Have them sign in to CallRail and go to:
**Settings → (their company) → Integrations → Webhooks.**
If they have multiple companies in one account, pick the law firm's company.

### 2 — Paste the webhook address (1 min)
In the **Post-Call** webhook field, paste their firm's address:

    https://plaintiffops.com/webhooks/callrail/<firm-id>

Save. (Post-call is the one that fires when a call ends — that's what feeds
the desk. If they also have "Call Modified" available, paste the same URL
there too; our ingest handles both shapes and dedupes.)

### 3 — Copy their signing key into the studio (2 min)
On that same CallRail Webhooks/API page, find the account's **signing key**
(CallRail generates it; it's shown alongside the webhook integration —
sometimes labeled "signing token"). Have them read it to you or paste it in
chat, then in YOUR browser:

1. Open `/studio/onboard-firm` (founder-only).
2. In the **CallRail signing key** card, enter the firm id + the key.
3. Save. You should see "Saved. … verifies against its own CallRail signing key."

No key visible in their CallRail UI? Their plan may only expose it via
CallRail's API (`GET /v3/a/{account_id}/integrations.json` returns
`signing_key`). Worst case: skip to step 4, capture one real webhook, and run
`callrail-verify` on it later — but do NOT end the call telling them it works
until the self-test is green.

### 4 — Fire a real test call (2 min)
Have someone at the firm call one of their own tracking numbers, let it ring
to voicemail or answer and hang up after a few seconds. CallRail fires the
post-call webhook when the call ends.

### 5 — Run the self-test (2 min, you)
From the repo:

    npm --prefix web run callrail:selftest -- <firm-id> \
      --base-url https://plaintiffops.com \
      --secret <their-signing-key>

Green looks like:

    ✓ signed POST accepted: 200, call_id=…, created=true
    ✓ replay deduplicated: created=false (a CallRail retry can't duplicate calls)
    ✓ bad signature rejected: 401 (verification is on; failure logged for /admin/status)
    ALL GREEN. Firm <firm-id>'s webhook is live and verified.

The self-test call shows as caller **"Intake QA Self-Test"** — synthetic,
ignore it in their desk.

### 6 — Confirm the real call landed (1 min)
- Their desk (or your `/admin/status`) shows the test call from step 4 within
  a minute or two of hang-up.
- `/admin/status` shows **no new
  `webhooks.callrail_firm.bad_signature` errors** for this firm. That error
  source is exactly what fires when the key is wrong — if you see it, the key
  stored in step 3 doesn't match their account.

**Say on the call:** "You're live. Every call from here on shows up on your
desk automatically — nothing about how your team answers the phone changes."

---

## When it is NOT green — triage in order

1. **Self-test step 1 fails with 401** → the key you passed isn't what the
   server verifies with. Re-check the stored key
   (`GET /api/studio/callrail-secret?firm_id=<firm-id>` → `secret_configured`)
   and re-save it in the studio.
2. **Real call never arrives but self-test is green** → CallRail side: wrong
   company selected, webhook saved on the wrong integration, or the tracking
   number they called isn't in that company. Re-check step 1–2.
3. **`bad_signature` errors in /admin/status from the firm's real calls** →
   the signing key stored is wrong (typo'd, or from the wrong CallRail
   account/company). Capture one real webhook (temporarily point CallRail at a
   request-capture URL, save headers + raw body byte-exact to a file) and run:

       npm --prefix web run callrail:verify -- <capture-file> <their-signing-key>

   It prints which signature format matched, or every computed digest vs. what
   CallRail sent, which tells you whether the key or the body is the problem.
4. **Sanity-check the tooling itself** (uses CallRail's published test vector):

       npm --prefix web run callrail:verify -- --self-check

## Notes for us

- Signature verification accepts CallRail's documented format first
  (sha1-base64) and falls back to sha256-base64 / sha256-hex / sha1-hex; the
  server logs which format matched on each firm's first verified webhook —
  check the log line `[callrail] firm=… signature format=…` once per firm and
  note anything that isn't `sha1-base64`.
- Every signature 401 writes an `error_log` row
  (`webhooks.callrail_firm.bad_signature`) with the firm slug and the formats
  tried — Session 3 wires alerting on 3+ failures/hour; until then, check
  /admin/status during week 1 mornings.
- Nothing in this flow can send anything to a caller. Compliance guardrails
  (pilot-mode approval, quiet hours, kill switch) are untouched.

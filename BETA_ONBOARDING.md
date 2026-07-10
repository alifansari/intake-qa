# Beta onboarding runbook — apply to live desk, step by step

The whole journey a firm travels, and exactly what you (Ali) do at each step.
Total founder effort per firm: ~20 minutes, most of it the setup call.

## The firm's journey

1. **They apply** at `/apply` (under a minute). They immediately see the timeline:
   NDA today → sign-in + setup call after signing → misses within days of calls flowing.
2. **NDA.** The application triggers the NDA flow (simulated until Dropbox Sign is
   live — check `/studio` or the DB for `nda_pending` applicants and send the NDA
   manually until then).
3. **You provision them** at **`/studio/onboard-firm`**: firm name + their email +
   (optionally) their average case fee. One click creates the firm, their sign-in
   account, and the membership that scopes the desk to them — and composes the
   welcome email with their sign-in link, one-time temporary password, and their
   firm's paste-once webhook address. Copy, paste into your email client, send.
4. **They sign in** → land directly on **Missed cases**, scoped to *their* firm.
   With no calls connected yet they see "One step left: connect your calls" with
   the three integration paths — never a false all-clear, never plumbing errors.
5. **The 15-minute setup call** — connect their calls (pick one):
   - **CallRail**: paste their webhook address (shown on their Settings screen and
     in the welcome email) into CallRail → Settings → Integrations → Webhooks
     (post-call). Done; every call flows automatically.
   - **No connectable system**: they upload/email recordings on whatever rhythm
     suits them.
   - **Anything else**: you wire it (concierge is the promise on their screen).
6. **CRM (optional, same call)**: their Settings → "Connect your CRM" opens the
   connector (Lead Docket / Filevine native; anything else via signed webhook).
   Create-only — their existing matters are never touched; nothing writes until
   they approve a test record.
7. **Live.** Misses appear on their desk the same day calls are read; the daily
   digest goes to their sign-in email; the monthly statement lands in Documents.

## What each piece is (for reference)

- `/apply` → `POST /api/beta/apply` — application + ICP check + NDA flow + waitlist.
- `/studio/onboard-firm` → `POST /api/studio/onboard-firm` — firm + auth user
  (bcrypt via pgcrypto; if the password path ever misbehaves, magic-link sign-in
  still works because the account exists) + `firm_members` mapping.
- `firm_members` is what scopes the desk: a signed-in user sees their firm only.
  No membership → pilot fallback (demo firm) so your own founder session still
  demos everything.
- Per-firm webhook: `/webhooks/callrail/<firm-id>` (same shared secret and ingest
  path as the original single-firm route, which still works).
- Analyst review is founder-only; firms never see it.

## Prod checklist (once, in Vercel)

`DATABASE_URL` (the **pooler** URL), `FOUNDER_EMAIL`, `APP_URL=https://plaintiffops.com`,
`CALLRAIL_WEBHOOK_SECRET` — plus the existing keys. Without `APP_URL`, welcome
emails and Settings show plaintiffops.com by default (correct in prod anyway).

## Activation + churn watch (from the simplicity research)

- **The activation event** is one thing: *first callback marked done within 48 hours
  of the first digest/miss.* If a new firm doesn't hit it, call them — at this
  scale that's a query and a phone call, not a CS tool.
- The daily digest should send **even on zero-miss days** ("14 calls read, all
  handled") — silence must never be ambiguous with "broken." When real email is
  enabled: three consecutive unopened digests = call the firm.

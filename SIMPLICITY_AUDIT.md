# Simplicity audit — "as intuitive as buying a notebook" (2026-07-10)

Full-surface analysis of how a stranger understands, values, signs up for, uses, and
accesses the product — and what was changed. Method: exhaustive inventory of all 16
marketing pages + every CTA, every funnel traced through code, the signed-in IA, and
the redirect layer.

## The diagnosis (what failed the notebook test)

1. **Too many things with names.** One product was presented as ~13 named artifacts
   (Leak Audit, Missed-Revenue Statement, Recoverable-Lead Alert, Saved-Case Ledger,
   Team Coaching, the letter, manifesto, concierge, beta, demo, three unpublished
   price tiers…). A notebook is one thing.
2. **Signing up did not exist.** The beta-application API (`/api/beta/apply` — ICP
   qualification, NDA gate, waitlist) was fully built with **no form anywhere on the
   site**. The only actions were the free audit upload and emailing Ali.
3. **Dead ends at the moment of interest.** The homepage "See a real sample
   Statement →" sent anonymous visitors into a login wall (`/statement` → 308 →
   `/desk/documents` → `/login`). The audit report's "Book a walkthrough" button
   silently vanished when `AUDIT_CALENDAR_URL` was unset (it is unset).
4. **The product entrance was stale.** Post-login landed via a redirect hop; the
   product nav's 7 links all 308-redirected to 3 desk screens with mismatched
   labels; desk nav used insider words ("Leaked-case queue", "Statements & readouts",
   "Calls & reconciliation").
5. **A truthfulness bug.** Three pages claimed "our own analysis and transcription
   models" while the DPA's subprocessor table names AssemblyAI and Anthropic
   (Rule 7.1 / compliance §V problem, and a trust hole for any diligent buyer).

## What changed

| Area | Before | After |
|---|---|---|
| Signup | No form; email Ali | **`/apply`** — 5 fields, one button, wired to the existing NDA/waitlist API; linked from nav CTA row, homepage (3 places), pricing, footer, and the audit report |
| Homepage | 17 sections, 7-step mechanism list | 11 sections, **3-step "How it works"**, one primary CTA (free audit) + one secondary (apply); agency-accountability, months-2-12, comparison-table, duplicate-independence, founder-note, newsletter sections cut |
| Hero sample link | `/statement` → login wall | `/audit/sample` (public sample report) |
| Marketing nav | Manifesto / How it works / Beta & pricing / Compliance / The letter | **How it works / Pricing / Compliance / FAQ** (manifesto + letter + error rate moved to footer) |
| Audit report CTA | Walkthrough button vanished without config | Always renders (falls back to email); **"Apply for a founding seat"** added |
| Pricing | Free-audit CTA + mailto only | **Apply** as the primary action, audit as step one |
| Post-login | `/queue` → 308 hop | Straight to `/desk/queue` |
| Product nav | 7 stale redirected links, wrong labels | 4 links matching the desk's real screens |
| Desk labels | "Leaked-case queue", "Statements & readouts", "Calls & reconciliation", "Review queue" | **"Missed cases", "Documents", "Calls", "Analyst review"** |
| Onboard success | Linked to two dead routes | Links to the real desk |
| Truthfulness | "our own models" ×3 | "specialist engines under our DPA (every subprocessor named)" — matches the DPA |
| Local DB | `db.*.supabase.co` (IPv6-only, breaks on IPv4 networks) | Pooler host in `DATABASE_URL` (works everywhere; use the same on Vercel) |

## The journey now

**Understand** (one breath): "We read your intake calls, find the signable cases that
walked, and show you what they cost. Flat fee, never a share." →
**Value** (one scroll): sample statement + 3 steps + 4 stats →
**Sign up** (one minute): `/apply`, five fields → NDA lands by email →
**Use**: sign in → land directly on Missed cases →
**Access**: 4 plain-word desk tabs; everything else one click from the footer.

## Deferred (worth doing, not done in this pass)

- `/how-it-works`, `/faq`, `/compliance` are still walls of text — they now carry
  less of the burden but would benefit from the same cut.
- The `/desk` first-run experience still shows demo-firm data or setup errors for a
  brand-new firm; a real empty state ("your first calls land here") needs design.
- `/onboard` remains unlinked (it doesn't create an account; linking it would add a
  second signup story — decide its fate).
- The 8 shadowed page files behind the 308 redirects are dead code; delete when
  convenient.
- "Leak Audit" vs "audit" vs "spot-check" wording could collapse to one term
  everywhere ("the free audit").

## Part 2 — the product itself (the desk), same day

**Message: the desk saves your staff time; using it requires zero learning.**

| Screen | Before | After |
|---|---|---|
| Missed cases (home) | Header said "Leaked-case queue" (nav said "Missed cases"); jargon subtitle ("Qualified PNCs…"); raw setup errors ("apply migrations 0014–0015", "run npm run seed:demo") for a fresh firm | Header matches nav; subtitle states the deal in one breath ("We read every intake call so your team doesn't have to… call them back, then mark what happened"); every degraded state renders a friendly first-run panel with the integration story, never plumbing |
| Case cards | Workflow-ese buttons ("Mark sent by staff", "Mark contact resumed", "Terminal status.") | What a coordinator would say: "We reached out" → "They responded" → "They signed / They passed" |
| Documents | "Statements & readouts" | "Documents" + "lands here automatically — nothing to build, export, or remember" |
| Calls | "Calls & reconciliation" | "Calls" + "proof we read every call so your team never has to; if it doesn't balance, it's our problem, not yours" |
| Analyst review | In every firm's nav (internal tool) | Founder-only; firms never see it |
| Settings | Started with a deletion button; notification form silently saved nothing | Starts with "How your calls get here" (three paths, all "we handle it", **no workflow changes**); the fake form replaced by the honest promise (daily digest to your sign-in email; email us to change it) |

The integration story is a shared component (`HowCallsArrive`) shown on first-run and in
Settings: (1) your phone system connects once, (2) or just send recordings, (3) or we do
the whole thing — "your team changes nothing about how they answer the phone."

## Part 3 — the breakage sweep + research-driven pass (same day, second round)

**Found broken and fixed (security first):**
- `/admin/*` operator console was reachable by ANYONE (no guard, not in the
  middleware matcher) → founder-only now, both at the middleware and the page APIs.
- All four `/api/admin/*` routes authorized on "signed in" not "is founder" — any
  firm user could toggle any firm's flags, void invoices, release audit reports →
  founder-gated.
- `/desk/review` listed every firm's sessions to any signed-in user → founder-gated.
- `/billing` + `/settings/integrations` cross-tenant IDOR (`?firm=<anyone>` or
  defaulting to the first firm) → resolve the user's own firm; `?firm=` honored
  only for the founder.
- Double navigation stacked on `/apply`, `/for-callers`, `/msa`, `/dpa` (missing
  from the marketing-routes list) → one header.
- "Request data deletion" was a local-state no-op that claimed "request recorded" →
  now opens the written request (matching the stated policy) instead of lying.
- 8 dead page files shadowed by permanent redirects deleted; bare `/desk` now
  redirects home; stale links/labels/comments fixed; the audit artifact is titled
  "Leak Audit" to match the offer name everywhere.

**Research-driven changes (see the 10-principle SaaS research in this repo's chat):**
- **One screen, one verb:** every missed case now leads with "Call back now · <number>"
  (tap-to-dial) — `caller_phone` added to the leak queries.
- **Never-blank desk:** the all-clear state cites the work ("We've read N calls…");
  zero-calls firms see the setup story instead.
- **Law-firm vocabulary:** "webhook address" → "call-feed address" in firm-visible copy.
- **Digest-first desk** (the research's #1 recommendation) recorded in ROADMAP.md —
  gated on real-email sign-off; activation event + churn watch added to
  BETA_ONBOARDING.md.

**Still open (needs product decisions):** LeakCard status buttons persist per-device
only (needs a save-status API — the state machine exists in messaging/); document
PDF endpoints need auth once real firm data flows; digest-first build awaits email
enablement.

## Part 4 — the disgruntled-attorney walk (round three)

Method: modeled a firm going through every step as a busy attorney with 200 cases,
plus a second research pass on first-session abandonment (key findings: value must
land in the first ~5 minutes; state-loss bugs are the most trust-expensive class;
busy owners delegate setup, they don't do it).

**The rage moment, fixed for real:** the queue's status buttons were device-local —
mark three callbacks done, reload, all back to "Needs a callback." Now persisted:
`flag_status` sibling table (supabase 0030 + sqlite 0022, flags stays frozen),
firm-scoped API (`/api/desk/flag-status`, ownership checked BEFORE the write),
optimistic UI with revert-on-failure. **Verified in the browser: click → reload →
status survives.**

**Delegation, not documentation:** "Send these instructions to whoever runs your
phones" button (Settings) — a prefilled email containing the firm's own call-feed
address and the exact CallRail steps. The attorney forwards; done.

**Smaller rage-removals:** login page now says who has accounts and routes the
account-less to /apply; Settings gained "set your own password" (the welcome email
told people to change it with no way to); welcome email leads to the magic-link
path too; /audit gained the "no time for uploads? email the recordings" escape
hatch; /apply success gained the "in a hurry? reply with times" line.

## Part 5 — round four: walking the wedge with real audio

Method: generated two realistic intake-call recordings (TTS) and walked
/audit as a real visitor, with a third research pass on operational trust
("is this thing even on?").

**Three real bugs found in the money funnel, all fixed:**
1. **The submit was broken for half of visitors** — `start`'s useCallback deps
   omitted `consent`, freezing consent=false in the closure. Anyone who attached
   files THEN checked the consent box was told forever they hadn't checked it.
2. **A fully-failed session produced a $0 report** — errored calls counted as
   "done," so processing failures redirected to "$0 walked in these 0 calls,"
   a false all-clear handed to a prospect. Now: the poll refuses to redirect
   when nothing scored (owns the snag, gives the human path), and the report
   page itself guards callsReviewed===0 the same way.
3. **The scoring engine broke on any repo path containing a space** —
   `new URL(...).pathname` kept `%20`, so the frozen engine couldn't open its
   own system prompt ("Plaintiff Ops" has a space). fileURLToPath fix in
   lib/score-call.js + re-vendored.

Also: both AI keys were EMPTY in web/.env.local (real values lived in the root
CLI's .env) — filled locally; the same values must exist in Vercel.

**Research (operational trust) applied:** the desk queue header now carries the
heartbeat — "Listening for calls · N calls received · last call Xh ago ✓" —
the one signal that answers the quiet fear. The full architecture (dead-man's
switch per firm, proactive incident banner+email, Friday proof-of-work
receipt) is recorded for the next build round.

## Part 6 — the Leak Audit report rework + live progress (round five)

**Live progress (Ali's ask):** the two-minute dead "Scored 0 of 1" replaced by a
stage-accurate panel driven by the pipeline's real statuses: per-call rows
("Listening to the call, word by word…" / "Scoring the handling against the PI
rubric…"), a weighted progress bar, and an honest countdown ("about 70 seconds
left"). Verified live mid-run.

**Report rework (from the PI-attorney research; one-page constraint honored —
every add paid for by a cut):**
- ADDED: marketing-waste + adjuster-urgency framing under the headline ("you
  already paid to make these calls ring… every day unsigned, the adjuster
  negotiates alone"); Clio-cited industry context on the handling score (only
  40% of firms answer their calls — Legal Trends secret-shopper study);
  "How we counted" methodology footnote (fee-at-risk math, strict "signable"
  definition, no-staff-shaming statement); "How callers are protected" strip
  (redaction, deletion timeline); top-3 evidence cards with the rest collapsed
  into one expandable row; an honest good-news block when nothing walked.
- CUT: the monthly projection box (the most attackable, least verifiable
  element), the 4-tile numbers grid (now one line), the second CTA (one action:
  book the walkthrough; email capture stays as delivery, not a second ask).

Research follow-ups deferred: per-call leak-type tags (MISSED/LANGUAGE/
AFTER-HOURS/NO-ASK) need a pipeline classification field; "salvageable now"
box with masked contact + SOL clock needs caller-PII handling decisions.

## Part 7 — the whole-product simplification (every surface, one pass)

Method: three parallel code audits (studio+admin, desk+public funnel, the
"download and start using" journey) plus a live browser walk of every screen,
then a 107-agent verified deep-research pass on SaaS onboarding/activation.
Research verdict: keep demos ungated (doesn't hurt paid yield), keep concierge
onboarding (assisted activation 41.6% vs 34.6% self-serve), short pull-based
guidance over wizards (5+ step tours collapse to ~16% completion), and
first-value-in-minutes is top-decile (median SaaS time-to-value ≈ 1.5 days).

**One chrome per surface:** the root desk nav rendered on top of /studio,
/admin, /demo, /login, /welcome, /digest/confirm (double headers, login-walled
links, a public "Demo mode" toggle that toggled a feature used nowhere).
Root nav is now allowlist-only (/billing, /settings); demo-mode dead code
deleted; /demo and /audit/sample got home links.

**One login:** /studio/login retired to a redirect stub → /login (password +
magic link); the not-authorized bounce now explains itself on /login.

**One name:** every studio/admin kicker says "Intake QA · Studio" (was five
different brands: Intake System, Spot Check Studio, The Mirror, Operator…).

**Studio:** nav gained Firms (new /studio/firms index — onboarding + firm
details were orphans before); Today gained the "Applications waiting on you"
tile (apply used to land silently — the tile IS the notification, nothing
emails); onboard-firm lists waiting applications with one-click form prefill;
window.prompt() chains (up to 3 per action) replaced with inline forms that
remember the operator's name; every raw enum (gov_claims_notice, hot/warm,
book/escalate…) renders through src/lib/intake/plain-labels.ts; the Ledger's
?fee=12000 URL-editing replaced with a real month picker + fee field; runner
buttons explain themselves and answer in sentences; recording analysis got
plain stat labels, an error stop (was an eternal spinner), and a slow notice.

**Desk:** LeakCard keeps the phone number through every status; reconciliation
no longer tells firms to "run npm run seed:demo" / "apply migrations"; the
demo documents table is labeled as example data; Settings links the orphaned
/billing page; deletion-request copy stopped claiming an unrecorded receipt.

**Public funnel truthfulness:** "What does it cost? →" became "Pricing & the
beta →" and /pricing now answers directly (free beta / flat at launch / never
a share); the apply success no longer says "check your email for the NDA"
when TEST_MODE means no email went out (now: "within one business day" —
Ali must honor that turnaround); the footer's "La carta (español)" link hides
until the page exists; the intake-demo's raw JSON dump became a plain-language
summary card with the JSON in a collapsed details.

**Getting started:** web/README.md is a real quickstart (was create-next-app
boilerplate); web/.env.example documents every env var the code reads
(DATABASE_URL was missing entirely — the one variable firm onboarding requires);
`npm run db:migrate:postgres` wired; `npm run smoke` no longer fails by design
on the intentional 0023+ Postgres-only migrations.

**Security hardening:** all four /admin pages now call requireFounderPage()
themselves (they relied on middleware alone).

Verified: tsc clean, 409/409 tests, production build green, and a full live
browser walk — founder sign-in, claim→resolve on a real escalation, ledger fee
form, apply→tile→prefill loop, a complete intake-demo conversation to the
summary card. Lint's 90 pre-existing errors are unchanged (verified identical
at HEAD).

**Open for Ali:** rotate the live secrets in web/.env.local (they include the
production DB superuser password in plaintext — git-ignored but readable);
confirm the one-business-day NDA turnaround promise; decide launch pricing.

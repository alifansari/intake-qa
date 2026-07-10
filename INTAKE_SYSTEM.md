# The Intake System — operator's guide (plain English)

Built 2026-07-09/10 across seven phases. Everything below is live in the app and the
hosted database (migrations 0024–0029 applied). **Nothing sends anything, ever**:
alerts and CRM writes go through mock chokepoints gated by `KILL_SWITCH`/`TEST_MODE`
(both default ON), and real senders/CRMs/telephony are deferred in [ROADMAP.md](ROADMAP.md)
until you sign off per integration.

## Sign in

Go to `/login` — the one sign-in for everything (password or "email me a sign-in
link"; rotate the password in Supabase dashboard → Authentication → Users whenever
you like). Old `/studio/login` bookmarks redirect there. For the deployed site, set
`FOUNDER_EMAIL` in Vercel.

## The surfaces (all linked from /studio, the cockpit)

| Where | What it is | What to do there |
|---|---|---|
| `/studio/shops` | **The Mirror** — mystery-shop audits | Start a shop, grade each channel (Captured/Fumbled/Lost + rings/latency/human-vs-machine), attest the CIPA protocol, approve the narrative, finalize → print the firm-branded report. A finalized demo shop exists (ref MS-20260708-DEMO). |
| `/intake-demo` | **The chat intake agent** — the thing to show firms | Run a conversation. Consent first, one question at a time, contact captured early. Try the off-script chips ("What's my case worth?") — the fixed deflections prove the agent never evaluates, quotes, or advises. Every conversation (even abandoned) lands as a lead. |
| `/studio/escalations` | **Escalation console** | Every fired trigger, hottest first. "Ack (claim)" puts YOUR NAME on it; then Mark actioned → Resolve. "Run ack sweep" advances anything past its deadline down the waterfall to the backstop. |
| `/studio/ledger` | **The Ledger** — the monthly receipt | Pick the month and enter the firm's own average case fee in the controls at the top (dollar lines appear only with a fee; without it, counts only). Misses are printed in red. Every number has a "details" toggle to the underlying records. Printable. |

## What runs underneath (and its safety posture)

- **Qualification tree**: a fixed graph (MVA, premises, dog-bite paths + SOL gate +
  emergency screen). No AI decides what to ask; the one narrow AI task (summarizing
  the visitor's narrative into data fields) never touches routing and never speaks
  to the visitor. UPL/CIPA rationale is documented in
  `web/src/lib/intake/guardrails.mjs`.
- **Routing**: deterministic four buckets — Book / Escalate / Human-handoff /
  Decline-by-design. Low confidence always goes to a human, never to a decline.
- **Escalations**: four trigger families, three tiers. Protected triggers (emergency,
  gov claims-notice, SOL-near, evidence-decay) can't be silenced or quietly
  downgraded — loosening one requires typing an exact confirmation phrase AND named
  approval.
- **On-call**: solo defaults (everything → you), manual hold > swap > holiday >
  rotation, hot tier can never be configured slower than a 10-minute ack floor.
  Unacked escalations waterfall to the backstop: book a callback + dashboard alarm.
- **Tuning**: dispositions (false-positive requires a reason; "didn't convert" is
  tracked separately and never counts against a trigger) → monthly PROPOSALS only;
  you approve by name. One missed real case re-escalates a downgraded trigger
  instantly.
- **CRM handoff**: create-only by construction (the connector interface has no
  update/merge method), duplicates flagged never merged, review-then-write default,
  consent travels with every payload. Mock CRM only.

## Founder-only API runners (buttons exist in the consoles; these are the raw endpoints)

- `POST /api/oncall/sweep` — one ack-timeout pass
- `POST /api/tuning/run` — one tuning-loop pass (inserts proposals)
- `POST /api/crm/run` — `{action: "enqueue" | "process" | "approve", id?, by?}` against the mock CRM

## What is deliberately NOT built (see ROADMAP.md)

Real telephony/voice, real alert senders (SMS/call/push), live CRM credentials,
any outbound TCPA-gated messaging, real peer-benchmark fieldwork (needs the
CIPA-safe protocol + Yang sign-off before dialing).

## Tests / build

`npm --prefix web test` (397+ green) · `npm --prefix web run build` ·
dev: `npm --prefix web run dev` → http://localhost:3000

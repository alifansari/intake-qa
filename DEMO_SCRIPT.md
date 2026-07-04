# DEMO_SCRIPT.md — a 10-minute click-through

A repeatable walkthrough for showing Intake QA safely. Everything here runs with
`TEST_MODE=true` — no real number is ever texted, no real retainer ever sent. Nothing in this
script transmits anything.

## Before the demo (once)

```bash
npm --prefix web run smoke          # confirms schema + guardrails are in order
npm --prefix web run e2e-synthetic  # optional: prove the whole loop in the terminal (all PASS)
npm --prefix web run dev            # http://localhost:3000
```

Keep `TEST_MODE=true` and `KILL_SWITCH` as-is. The point of the demo is that the safety is on.

## The story (say this)

"Small PI firms lose signable cases when intake drops the ball. We score every intake call, flag
the ones your team let slip with the fee at risk, and draft a compliant follow-up text — but a
human approves every single message. Nothing sends on its own, and nothing sends at all until the
firm is legally cleared."

## The click-through

1. **`/demo` — see it on one call (public, no login).**
   Upload a sample call recording. Watch the status move transcribe → score. The result shows the
   qualification score, whether it's a leaked signable case, the estimated fee at risk, and the
   exact quotes that justify the flag. Point out: the audio is never stored and results purge in
   72h; the demo is fully isolated and can never send a text.

2. **Deadline Watch + Case-Ready Summary (on the same result).**
   Show the California statute-of-limitations estimate (with the government-claim / MICRA / general
   rules) and the one-screen triage memo. Stress the disclaimer: this is an attorney-verifiable
   estimate computed by deterministic date math, not an LLM guess — and it is never legal advice.

3. **`/onboard` — bring a firm on in 5 steps.**
   Firm basics → case types (with default fee estimates) → compliance acknowledgement (required)
   → message templates → review. Try saving a template WITHOUT an opt-out line: the wizard rejects
   it, because it runs the same compliance guard the send layer enforces. Fix it, finish, and show
   the generated firm config. New firm is born with its kill switch ON.

4. **`/getting-started` — the plain-English orientation** a non-technical firm sees next: how it
   works in four steps and the five guardrails, in their words.

5. **`/queue` — the approval queue (the compliance heart).**
   Show drafted texts awaiting approval, batch-approve, keyboard shortcuts, and the "overdue"
   highlight for anything waiting too long. Emphasize: Approve / Edit / Reject per message; nothing
   leaves this queue automatically.

6. **`/admin/status` — the operator board.**
   Read-only readiness: TEST_MODE ON (simulated), kill switches, pending approvals, recent errors.
   This is where an operator confirms the system is safe before and after go-live.

7. **The reconciliation views** (`/`, `/funnel`, `/calibration`, `/statement`) — the honest
   reporting layer. Recovered dollars count **signed cases only**; unsigned leads are funnel counts,
   never dollars. That honesty is the credibility of the weekly report.

## Close

"Every guardrail is enforced in code at one send chokepoint — quiet hours, opt-out, kill switch,
human approval, and simulated-until-compliant. `GO_LIVE.md` is the checklist that turns real
texting on, and it can't be skipped by accident."

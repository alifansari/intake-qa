# Roadmap — explicitly deferred (documented so nothing is lost, nothing half-built pretends to be real)

This file lists work that is **deliberately not built** in the current intake-system
build (Phases 1–7). Each item is deferred by design — usually because it crosses a
compliance gate (compliance-invariants §II/§III/§VII) or requires credentials/vendors
we will not touch without explicit per-integration sign-off from Ali.

| Deferred item | One-line description | Why deferred |
|---|---|---|
| Real telephony / voice provider integration | Twilio ConversationRelay (or equivalent) wiring for the voice intake agent designed in INTAKE_CLOSER_DESIGN.md. | Live calls to real people; CIPA consent chokepoint + vendor contract must be in place first. |
| Production alert senders (SMS / call / push) | Connecting the Phase-3 escalation engine's `AlertSender` port to a real Twilio/push sender. | Outbound messaging is gated (§III/§VII); the mock/log sender is the only implementation until sign-off. |
| Live CRM connections (Lead Docket / Filevine / Litify / Clio) | Real credentials + live create-only writes through the Phase-7 connector port. | Firm-scoped auth + per-integration approval required; mock CRM only until then. |
| Outbound TCPA-gated follow-up (SMS/email to prospects) | Any automated re-engagement of a captured lead. | TCPA discipline + human-approval chokepoint; nothing sends in this build, period. |
| Ledger conversion read-back | Pulling signed/converted outcomes back from the firm's CRM into the Phase-6 Ledger. | Depends on a live CRM connection (above); until then the Ledger shows captures only. |
| Real peer-benchmark fieldwork batches | Replacing the seed rows in `studio_peer_benchmarks` with measured cohort shops. | Fieldwork requires the CIPA-safe protocol + Yang sign-off BEFORE dialing (§II); seed rows stay clearly labeled illustrative until then. |
| Digest-first desk (P1 of the simplicity research) | The daily digest becomes the primary UI: each missed caller in the email body with signed one-click "We called them" action links needing no login. | Sends real email — gated behind Resend enablement + sign-off; the desk already carries the same information. |

Rule of thumb: if a feature would send, dial, publish, or write into someone else's
system, it lives here until Ali signs off on that specific integration.

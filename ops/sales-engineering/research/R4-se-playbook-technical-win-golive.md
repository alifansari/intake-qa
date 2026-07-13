# R4 — SE Playbook: Technical Win + Go-Live (research brief)

> Source: deep-research pass, 2026-07-12. Best-practice claims cited; `[Judgment]` = synthesized.
> Consumed by: go-live-cutover runbook, POC acceptance-criteria template, technical-objection matrix.

---

# SE Playbook: Selling Autonomous Voice AI ("Intake Closer") to California PI Law Firms

*Best-practice claims are cited; items marked **[Judgment]** are synthesized for this product/buyer.*

## 1. The Technical Win: The SE Deliverable Set

The SE's job is to make a non-technical, trust-gated attorney *feel safe saying yes*. You win the technical evaluation with a small, named artifact set — not a feature dump. Great POCs work backward from the customer's current state, agreed future state, business objectives, and 3–5 workflows to prove, with success defined up front to prevent scope creep ([Vivun](https://www.vivun.com/se-101/poc-vs-pov-a-sales-engineers-guide-to-validation-methods-that-boost-sales-and-buyer-success), [Storylane](https://www.storylane.io/blog/technical-win)). SEs win by translating capability into business value (signed cases), not showcasing features ([tryopine](https://tryopine.com/blog/how-to-improve-technical-win-rates-strategies-for-sales-engineers)).

**Recommended named artifacts:**
1. **Technical Discovery Questionnaire** — current phone stack (carrier, VoIP/PBX, forwarding rules), call volume + after-hours %, current answer rate + missed-call count, intake CRM, case-type mix, Spanish %, who answers and when. `[Judgment]` For solos the highest-value question is "how many calls go to voicemail after 6pm and on weekends?" — that quantifies the leak.
2. **Solution Design Document (SDD)** — future-state call-flow diagram (after-hours → overflow → primary), qualification logic, escalation/warm-transfer rules, CRM write-back mapping, and a numbered success-criteria table both parties sign.
3. **POC / Value-Pilot Success Criteria** — signed, measurable, time-boxed.
4. **Security & Architecture One-Pager** — data flow, where PII/recordings live, encryption, retention/deletion, subprocessors, failover. `[Judgment]` Pair with a plain-English "who can hear the call and where does it go" paragraph — beats a diagram for lawyers.
5. **Compliance One-Pager** — AI-disclosure, recording-consent, "no legal advice" guardrails.

## 2. POC / Value-Pilot Acceptance Criteria

Write "pass" down *before* running anything; track success rate, latency, accuracy, intervention rate *together* ([AI agent eval](https://aiagentsquare.com/blog/ai-agent-evaluation-metrics)). Regulated buyers require higher accuracy thresholds ([masterofcode](https://masterofcode.com/blog/ai-agent-evaluation)).

| Metric | Definition | Target (pilot pass) | Basis |
|---|---|---|---|
| Answer rate | % inbound answered (esp. after-hours) | ≥ 95% | `[Judgment]` core promise |
| Containment | Handled without human escalation | 60–80% | Enterprise 70–90%, FAQ 40–60% ([Hamming](https://hamming.ai/resources/voice-agent-evaluation-metrics-guide)) |
| Qualification accuracy | Correct case-type + merit vs. human review | ≥ 90% | Regulated bar ([Hamming](https://hamming.ai/resources/voice-agent-evaluation-metrics-guide)) |
| Escalation/warm-transfer | % correctly routed to human when out of scope | false-negative ≈ 0 | safety metric `[Judgment]` |
| Response latency | Turn-level, caller-perceived | < 2s typical; p50 sub-250ms achievable | ([Hamming](https://hamming.ai/resources/voice-agent-evaluation-metrics-guide), [Prodinit](https://prodinit.com/blog/production-voice-ai-agents-latency-architecture)) |
| Signed-case lift | Retained vs. pre-pilot baseline | positive lift = the win | ([agility-at-scale](https://agility-at-scale.com/ai/generative/pilot-implementation-with-real-metrics/)) |
| Zero-harm guardrail | No legal advice, no wrong-fact commitments | 0 incidents (kill-criterion) | ([autointerviewai](https://www.autointerviewai.com/blog/ai-voice-agent-demo-production-gap-failure-modes-2026)) |

**Pilot rules:** 2–4 weeks; baseline first; start on **after-hours only**; weekly review; pre-agreed pass/fail *and* rollback. ~60% of voice deployments that pass a demo fail within 90 days of production ([autointerviewai](https://www.autointerviewai.com/blog/ai-voice-agent-demo-production-gap-failure-modes-2026)) — measure on *live* calls.

## 3. Time-to-Value = #1 retention lever

First value inside 14 days → **82% retention at month 12 vs. 42%** past 30 days ([SaaS Mag](https://www.saasmag.com/time-to-value-saas-onboarding-retention-2026/)); top B2B delivers first value within ~7 days ([digitalapplied](https://www.digitalapplied.com/blog/customer-onboarding-time-to-value-2026-saas-metrics-framework)). `[Judgment]` For Intake Closer, "first value" = **first real after-hours call answered and logged to CRM**; target live on after-hours in **≤ 3 business days**. Config-driven (case-type templates, script presets, CRM connectors), not a project.

## 4. Go-Live / Cutover skeleton

**Run dual systems, migrate safest traffic first, keep the old path warm, define rollback authority before you start** ([Tier One](https://www.tieronetechnologies.com/blog/lokno6np8lbuufn3iyngmepsd3ouz0), [ConnexCS](https://connexcs.com/blog/cloud-pbx-migration-checklist-what-to-audit-before-you-transition/)). Keep legacy path operational through a 48–72h stabilization window ([ActiveCalls](https://activecalls.com/blog/pbx-migration-2025-2026-cost-timeline-downtime-complete-blueprint/)).

- **Pre-cutover:** inventory forwarding/hours/voicemail/IVR/transfer targets; provision AI number + warm-transfer targets; test CRM write-back end-to-end; AI-disclosure + recording-consent live in greeting; rollback criteria + named owner + one-click revert documented.
- **Phased ramp:** Phase 1 after-hours only → Phase 2 overflow (no-answer/busy) → Phase 3 primary (only after 1–2 pass).
- **Smoke tests each phase:** end-to-end test call (answer→qualify→CRM→escalation); after-hours routing + voicemail fallback; **failover: kill AI path, confirm auto-forward to human/voicemail, no dropped call** ([needtoknowcomms](https://needtoknowcomms.com.au/guides/voip-cutover-checklist-australia/)); Spanish path verified.
- **Post-cutover:** legacy forwarding warm 48–72h; day-1 call-log review with attorney; confirm first value event.

## 5. Technical objection-handling

| Objection | SE answer | Proof asset |
|---|---|---|
| Dead air / pauses | Streaming at every layer, turn latency < 2s, p50 sub-250ms, SLOs monitored ([Prodinit](https://prodinit.com/blog/production-voice-ai-agents-latency-architecture)) | Live latency dashboard |
| Hallucination / says something wrong | Scoped retrieval-grounded scripts; no free-form legal answers; out-of-scope → warm transfer; 0-incident kill-criterion ([autointerviewai](https://www.autointerviewai.com/blog/ai-voice-agent-demo-production-gap-failure-modes-2026)) | Guardrail spec + transcript review |
| Goes down mid-call | Auto-failover forwards to human/voicemail; call never dropped; 99.9% w/ sensible failover ([CallSphere](https://callsphere.ai/blog/ai-voice-agent-failover-reliability-patterns)) | Failover smoke-test |
| Where does PII/recording go | Encryption in transit/at rest, retention+deletion, named subprocessors, PII out of LLM logs ([autointerviewai](https://www.autointerviewai.com/blog/ai-voice-agent-demo-production-gap-failure-modes-2026)) | Security one-pager + data-flow |
| Demo great — holds in prod? | Pilot measured on *live* calls w/ pass/fail; closes the ~60% demo-to-prod gap ([autointerviewai](https://www.autointerviewai.com/blog/ai-voice-agent-demo-production-gap-failure-modes-2026)) | Live-traffic pilot report |
| Accents / Spanish | Bilingual by design; accuracy measured per-language in pilot | Per-language accuracy |

## 6. Legal landmines (SE framing only — legal team owns detail)

- **UPL:** qualify/schedule, **never give legal advice**; scripted "I'm the AI assistant for [Firm]… I can't provide legal advice" ([RealVoice](https://www.realvoice.ai/blog/ai-receptionist-legal-compliance-guide)). Frame as *intake*, not counsel.
- **CA AI disclosure:** AB 2905 (eff. 1/1/2025) requires upfront disclosure of AI voice; penalties $500+/undisclosed call ([Captain Compliance](https://captaincompliance.com/education/ai-voice-calls-and-the-consent-gap-thats-sending-companies-to-court/)). *[SE note: cross-check exact bill number/scope with legal before any public claim.]*
- **CIPA / two-party recording consent:** CA all-party; recording consent distinct from call consent ([Dialzara](https://dialzara.com/blog/call-recording-laws-ai-agents-by-state), [CaseClerk](https://caseclerk.ai/blog/do-ai-voice-intake-agents-for-law-firms-have-to-comply-with-call-recording-and-twoparty-consent-laws-2025-statebystate-guide)). Capture consent before recording.
- **TCPA:** AI voices = artificial-voice calls; outbound needs prior express consent ([Ginsburg](https://ginsburglawgroup.com/2026/02/ai-robocalls-the-tcpa-consent-rules-you-need-to-know/)). `[Judgment]` inbound-answering lower risk; flag any callback/outbound to legal early.
- **Malpractice imputation:** `[Judgment]` attorney always in the loop on retention; agent qualifies, human signs — keep "human owns the legal decision" explicit in the SDD.

# Sales Engineering / Solutions — Lane Charter

> **Lane owner:** Sales Engineering / Solutions (org map §I.3).
> **Product served:** *Intake Closer* — the autonomous bilingual (EN/ES) AI voice agent that
> answers, qualifies, and closes PI intake calls for small/solo California PI firms
> (see [`INTAKE_CLOSER_DESIGN.md`](../../INTAKE_CLOSER_DESIGN.md)).
> **Supreme doctrine:** `.claude/skills/compliance-invariants/SKILL.md` outranks everything here.
> **Operating agreement:** [`ops/OPERATING-PROTOCOL.md`](../OPERATING-PROTOCOL.md) governs approval routing.
> **Created:** 2026-07-12.

---

## 1. The one job

**Own the technical win, then own the go-live.** Everything upstream (marketing, SDR, AE) creates
interest; everything downstream (delivery, CS) keeps the firm. Sales Engineering sits in the
middle and is accountable for the moment a skeptical, non-technical, risk-averse attorney says
*"yes, technically I believe this will work in my firm and I'm willing to route my calls to it."*

Concretely, four surfaces:

1. **Call-flow design** — the per-firm conversation blueprint: answer → consent → empathy →
   qualify → triage/score → close → e-sign → CRM handoff, configured for that firm's case types,
   disqualifiers, SOL rules, fee language, routing, and escalation.
2. **CRM / telephony wiring** — get the agent connected to whatever the firm already runs
   (Litify / Filevine / Lead Docket / Clio / CASEpeer / SmartAdvocate / CallRail) and route live
   phone traffic to it (forwarding vs. porting, warm transfer, failover).
3. **Spanish tuning** — make the Spanish agent as good as the English one for that firm's
   dialect (CA Latino / Mexican-Central-American), glossary, and register, and *prove* parity.
4. **Go-live** — cut the firm's real calls over to the agent without dropping a single one, with
   a tested rollback, staged from after-hours → overflow → primary.

## 2. Why this lane is a moat, not overhead

In a trust-gated buyer set, **the proof is the product.** A generic voice-AI wrapper can be
demoed in a browser; it cannot survive a PI managing partner's technical evaluation ("what happens
when it mishears a fatality call at 2am and my carrier is down?"). Every SE artifact that makes
the technical answer *undeniable and repeatable* is a durable asset:

- It compresses **time-to-first-signed-case** — the #1 retention lever (§IV.1 of the org map).
- Each deployment feeds a reusable pattern back into the platform (forward-deployed-engineering
  as moat, org map §VII.7).
- The integration runbooks become switching-cost (org map §II.6).

## 3. Metrics this lane owns

Traceable to the company goal ($1M ARR / signed pilots → paid). SE is judged on:

| Metric | Definition | Why it matters |
|---|---|---|
| **Technical-win rate** | % of scoped opportunities that clear the technical evaluation | The gate between AE interest and a signed pilot |
| **Time-to-first-signed-case** | Days from contract to the agent signing its first real case for that firm | #1 retention lever; the headline onboarding SLA |
| **Go-live cycle time** | Days from kickoff to live call traffic on the agent | Config-driven onboarding target: **days, not weeks** |
| **Integration coverage** | # of the top PI CRMs with a proven, repeatable connect runbook | Removes "will it work with my system?" as a blocker |
| **Bilingual parity pass rate** | % of firms whose Spanish agent passes the parity QA suite at go-live | Protects the core wedge and the AI-governance gate (org map §III.4) |
| **Escalation/failover proven** | Every go-live has a tested human-transfer + carrier-failover path before first live call | The objection that actually loses deals |

Readings live in [`ops/sales-engineering/scoreboard.md`](scoreboard.md) (created when the first
firm is in flight; blank is honest, fabricated is not).

## 4. The deliverable set (what this lane produces)

The SE "kit" — each is a reusable, versioned asset. Status tracked in
[`backlog.md`](backlog.md).

**Pre-sale (win the technical eval):**
- **Technical Discovery & Scoping Questionnaire** — the structured scoping call that de-risks the
  deal and feeds the SDD. → `templates/technical-discovery-questionnaire.md`
- **Solution Design Document (SDD) template** — the per-prospect architecture: their stack, the
  call-flow, the integration path, the go-live plan, the success criteria. → `templates/solution-design-document.md`
- **Technical objection-handling matrix** — every blocker (latency, hallucination, failover,
  PII, UPL) with a credible answer and a proof asset. → `technical-objection-handling.md`
- **Architecture / security one-pager** (co-owned with Brand & Trust §I.8) — how it works and
  why it's safe, one page. → `templates/architecture-onepager.md` *(prospect-facing → stages for Ali)*

**Design (the call-flow):**
- **Call-flow design system** — the master blueprint + the per-firm configuration model:
  case-type modules, disqualifier rules, SOL screening, fee-language slots, routing/escalation.
  → `call-flow-design-system.md`
- **Per-case-type qualification modules** — MVA, slip-and-fall, dog bite, product, premises,
  wrongful death, etc. — the questions a 10-year intake veteran would ask. → `call-flow/*`

**Build (wire it up):**
- **CRM integration matrix + per-system runbooks** — one runbook per CRM. → `runbooks/crm-*.md`
- **Telephony wiring runbook** — forwarding vs. porting, warm transfer, failover. → `runbooks/telephony-wiring.md`
- **Spanish tuning playbook + parity QA suite** — tune and prove. → `spanish-tuning-playbook.md`

**Prove + ship (go-live):**
- **POC / pilot acceptance-criteria template** — measurable gates so a pilot converts, not drifts.
  → `templates/poc-acceptance-criteria.md`
- **Go-live / cutover runbook** — the staged, reversible cutover with smoke tests and rollback.
  → `runbooks/go-live-cutover.md`
- **Demo engineering spec** — the "hear it audibly sign a mock lead in Spanish" demo environment
  the whole GTM motion rides on. → `demo-engineering-spec.md`

## 5. How this lane plugs into the ops loop

Same protocol as every agent (CLAUDE.md → "The compounding loop"):

1. Read `compliance-invariants`, then `ops/metrics.md`, `ops/insights.md`, `ops/decisions.md`,
   then this charter and `backlog.md`.
2. Pull the top ICE-scored item from `ops/sales-engineering/backlog.md`.
3. Ship it. Run the **two adversarial QC passes** before calling anything ready.
4. Log a dated entry to `ops/decisions.md`.
5. Feed new findings to `ops/insights.md` / the SE backlog.

**Approval routing for this lane specifically:**
- Runbooks, templates, research, call-flow config schemas, integration code, the ledgers →
  **internal/backend → ship autonomously** (commit to `main` in `claude/`).
- Anything a prospect reads or hears (the architecture one-pager, demo scripts that go out, the
  SDD *once it's for a named firm*, any pricing or product claim) → **staged for Ali, final only.**
- Anything touching a real firm's live phone traffic, real caller PII, DNS, secrets, or a novel
  regulated posture → **stop for Ali (Yang for novel regulated).**

## 6. Standing constraints (from the supreme docs)

- **UPL wall:** the agent gives legal *information*, never case-specific legal *advice* — in
  both languages. SE encodes this as a deterministic guardrail in every call-flow, never as a
  soft prompt instruction.
- **Attorney-in-the-loop:** an engagement is finalized only after a licensed attorney approves.
  SE designs the gate to run in *minutes*, and every go-live must demonstrate it.
- **Consent chokepoint (CIPA/all-party):** every call passes one consent gate before audio is
  retained, spoken in the caller's language. No SE call-flow may route around it.
- **Pricing is not SE's to set:** per-signed-case pricing is a `compliance-invariants` §I gate
  routed to Yang. SE designs to *any* pricing mode; it never bakes one into the product.
- **No real dialing / real caller audio until the provider data-terms and legal review land**
  (see `GO_LIVE.md` A7 and the CIPA §632 mystery-shop protocol). SE stages; Ali/Yang clear.

## 7. The north-star sentence for this lane

*"A California PI firm can go from a first technical conversation to live, bilingual, closing
call-traffic on the agent — wired into their existing CRM, with a proven human-failover path —
in days, and the Sales Engineer has a repeatable kit that makes each next firm faster than the last."*

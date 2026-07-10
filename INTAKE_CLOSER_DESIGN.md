# Intake Closer — Master Design (Clean-Sheet Pivot)

> **Status:** DESIGN / STAGED FOR APPROVAL. Nothing here is live. No old code has been
> deleted. Everything is on branch `intake-closer-pivot`.
> **Decision of record:** Full pivot from the *independent-scorer* product (Intake QA) to an
> *autonomous bilingual intake-and-closing agent* (Intake Closer). Owner (Ali) authorized the
> pivot and the associated legal risk on 2026-07-08.
> **The one open gate:** per-signed-case pricing conflicts with `compliance-invariants` §I as
> written. That doctrine is the supreme document in this repo and §VII says pricing changes route
> to Yang. See §7. The *product core* below has no such conflict and can be built immediately.

---

## 0. TL;DR of the build

We are building **one autonomous loop**: a phone number that answers in under one ring, 24/7,
in English **or** Spanish; runs an empathy-first, trauma-informed intake with a scared caller;
scores the case in real time (statute of limitations, liability, damages tier, coverage,
prior-representation, red flags); **actively closes** — handles objections, explains the
contingency, and gets the retainer e-signed on first contact; and writes a clean, structured
matter into the firm's CRM — **with a licensed attorney approving the engagement in the loop**.

We keep everything that already works in this repo (the calibrated scoring engine, the
Repository seam, Supabase+RLS, Twilio, Dropbox Sign, Inngest, Resend) and add a real-time
**voice** layer in front of it. This is an extension of the existing architecture, not a rewrite.

**The wedge (how we get in the door):** *"We answer and sign the cases you're missing at night,
on weekends, and in Spanish."* Start as after-hours / overflow + Spanish, prove signed-case lift
in 30–60 days, then expand to primary intake.

---

## 1. What replaces what

| Old (Intake QA — independent scorer) | New (Intake Closer) | Disposition |
|---|---|---|
| Positioning: independent recovery desk, *not a vendor* | Positioning: the firm's autonomous front-door intake agent (a vendor) | **REPLACE** copy/positioning |
| Product = score recorded calls after the fact + SMS win-back | Product = answer live, qualify, **close**, e-sign, write to CRM | **REPLACE** as primary; scoring becomes an internal sub-feature |
| Calibrated scoring engine (`scoring/`, root CLI, `lib/score-call.js`) | Same engine, repurposed for **real-time case triage** during/after the call | **REUSE** (do not edit the calibrated prompt) |
| Repository seam (`web/src/lib/repository.ts`) | Same seam, extended with new record types | **EXTEND** |
| Supabase + RLS, migrations `0001–0020` | Same DB; additive migrations `0021+` | **EXTEND** |
| Twilio = SMS win-back only | Twilio = **Voice (real-time)** + SMS follow-up | **EXTEND** |
| Dropbox Sign = handoff link | Dropbox Sign = retainer e-sign closed *in-call* | **REUSE/EXTEND** |
| Marketing site: "independent scorer / Moody's of intake" | Marketing site: "the intake agent that signs the cases you miss" | **REPLACE** copy (retirement list in §9) |
| `ops/` agent OS, backlog B-001…B-013 (benchmark, seal, index) | New backlog oriented to the Closer wedge | **RE-ORIENT** |

**Reused wholesale (zero change):** the calibrated `scoring/system-prompt.md` + gold examples
(CLAUDE.md forbids editing them), the ports-and-adapters discipline, the single-send compliance
chokepoint pattern, SOC 2 / HIPAA / RLS posture.

---

## 2. Architecture (on the existing stack)

```
   Inbound PSTN call (the firm's tracking number / after-hours forward)
        │
        ▼
   Twilio Voice ──(TwiML: <Connect><ConversationRelay>)──►  low-latency STT + TTS + barge-in
        │                                                     (Twilio ConversationRelay handles
        │                                                      speech I/O + bilingual voices)
        ▼  bidirectional WebSocket (text tokens both ways)
   ┌──────────────────────────────────────────────────────────────────────┐
   │  Intake Orchestrator  (web/src/lib/voice/orchestrator.ts)             │
   │   • CONSENT gate first turn (CIPA all-party, both languages)          │
   │   • language detect + auto-switch (EN/ES parity)                      │
   │   • Claude (Sonnet 4.6, streaming) = the dialogue brain               │
   │   • state machine: greet→consent→empathy→qualify→score→close→sign     │
   │   • deterministic guardrails: NEVER gives legal advice (UPL wall)     │
   │   • live case-scoring via the calibrated engine (SOL/liability/…)     │
   │   • distress-cue detection → warm human transfer                      │
   └──────────────────────────────────────────────────────────────────────┘
        │                        │                         │
        ▼                        ▼                         ▼
   Dropbox Sign            Attorney-in-the-loop        Repository seam
   (retainer e-sign,       approval gate               (IntakeCall, Consent,
    sent in-call via       (SMS/push to attorney;      CaseScore, Signature,
    SMS link + spoken      "approve to finalize"       Matter) → Supabase (RLS)
    guidance)              in minutes, not hours)              │
                                                               ▼
                                                    CRM write-back connector
                                                    (CasePeer/Filevine/Litify/
                                                     Clio/SmartAdvocate/Lawmatics)
        │
        ▼ (async, durable — Inngest)
   Post-call: AssemblyAI transcribe → calibrated score → QA record → reconciliation
```

**Why ConversationRelay:** it keeps us on Twilio (already in the stack + A2P/10DLC work done),
gives sub-second bilingual STT/TTS with barge-in out of the box, and lets **Claude remain the
brain** turn-by-turn over a websocket. There is no Anthropic realtime-voice API, so this is the
pragmatic low-latency path. (Alternative fallback if latency is insufficient: a dedicated
speech-to-speech vendor behind the same orchestrator interface — the orchestrator is written to a
`VoiceTransport` port so the provider can swap with zero change to dialogue logic. Same
ports-and-adapters discipline as the Repository seam.)

**Concurrency / "no busy signal on a TV-ad surge":** ConversationRelay + serverless websocket
handlers scale horizontally; each call is an isolated session. The SLA promise (sub-60s answer,
infinite concurrency) is architecturally real, not marketing.

---

## 3. The dialogue state machine

Each state is a deterministic node; Claude generates the language, guardrails constrain it.

1. **GREET** — warm, human, names the firm. `"Thank you for calling [Firm]. I'm the intake
   assistant — I can help you right now."`
2. **CONSENT** (CIPA chokepoint, §6) — all-party consent for recording, spoken in the caller's
   language, logged before any audio is retained. No consent → no recording, graceful path.
3. **EMPATHY** — trauma-informed first 30–90 seconds. Acknowledge, slow down, reassure. This is
   a measured conversion lever, not fluff.
4. **QUALIFY** — practice-area-configurable: incident date (→ SOL), liability facts, injury +
   treatment, insurance/coverage, prior representation, red flags (pre-existing injury, no
   treatment, gaps). Structured, not an interrogation.
5. **SCORE** — real-time forensic triage (§5). Produces a ranked, tiered case score with a
   confidence level (BI-RADS-style, per the citation guard we keep from §IV).
6. **CLOSE** — *the differentiator.* Explain the contingency ("no fee unless we win"), handle
   objections, reduce the fear, create urgency honestly. This is a sales close, executed with
   care, never with pressure that would be unethical toward an injured person.
7. **SIGN** — send the retainer via Dropbox Sign (SMS link + spoken walk-through) **after the
   attorney-in-the-loop gate clears** (§8). Auto-decline junk politely and protect staff time.
8. **HANDOFF** — write the structured matter to the CRM; schedule human follow-up; SMS
   confirmation.

**Escalation** is available from any state: distress cues, "I want a human," or a
red-flag/edge case → warm transfer to on-call human (or take a message with a guaranteed
callback SLA if truly after-hours).

---

## 4. Bilingual English/Spanish parity (highest-ROI CA feature)

- Language auto-detected on the first caller turn; the agent switches and **stays** switched,
  including consent, closing, and the retainer walk-through.
- Native-quality Spanish TTS voice (ConversationRelay voice config), not machine-translated
  English. Empathy phrasing is authored natively in Spanish, not translated.
- The retainer and all SMS follow-ups are delivered in the caller's language.
- Spanish intake data gets the *same* privacy protection as English (compliance §VI — no lower
  bar). This directly reuses our existing doctrine.

---

## 5. Forensic case-scoring / triage (reuse the calibrated engine)

We reuse the existing calibrated engine rather than inventing a new one:

- **Real-time (in-call):** a lightweight scoring pass on the running transcript produces a
  provisional tier so the CLOSE state knows whether to push toward signing, book a consult, or
  decline. Deterministic SOL math (we already have statute logic in the product-dev lane) flags
  time-bar risk — **the agent flags, it never advises** (UPL wall).
- **Post-call (durable, Inngest):** full AssemblyAI transcription → the calibrated
  `scoring/system-prompt.md` + gold examples pass (prompt caching ON, temp 0, model per
  CLAUDE.md) → a permanent `CaseScore` record with cited spans and a confidence tier.
- Junk auto-decline is a first-class outcome: politely closes, logs the reason, protects the
  attorney's time and the firm's reputation.

Output dimensions: SOL status, liability strength, damages tier, coverage/policy-limit signal,
prior-representation flag, red-flag list, overall tier + confidence. Attorney wakes up to a
**ranked queue of qualified, signed (or ready-to-sign) cases**, not a pile of voicemails.

---

## 6. CIPA / consent chokepoint (single point, mirrors the send chokepoint)

We reuse the proven pattern from the SMS product: **one chokepoint no code path may bypass.**

- `web/src/lib/voice/consent.ts` — every call must pass the consent gate before any audio is
  persisted. All-party consent captured at call start, in the caller's language, timestamped and
  logged with its basis (mirrors the ConsentEvent record we already have).
- **No-training contract term:** call content is never used to train models; the vendor is a
  pure processor extension of the firm (the *ConverseNow* CIPA lesson — liability turned on the
  vendor's *capability* to use call data for its own ends; we contractually foreclose it).
- Configurable retention; recordings/transcripts purged per `DATA_RETENTION_DAYS`.
- Kill switch (`KILL_SWITCH`) halts the voice agent instantly, same as SMS.

---

## 7. The compliance fork (the one thing that must go to Yang)

**Conflict, stated plainly:** `compliance-invariants` §I currently *prohibits* per-signed-case
pricing and even the *words* "per signed client / success fee." The Intake Closer strategy's
most compelling economics are per-signed-case. These cannot both stand unamended.

**How the design handles it (does not resolve it — that's Yang's + Ali's call):**

- Pricing is a **configurable layer**, not baked into product behavior. Three modes:
  1. **Flat subscription** (Core/Pro) — fully compliant today, zero change to doctrine. Ships now.
  2. **Fixed per-signed-case *technology* fee** — explicitly not a share of legal fees, no client
     referral/steering payment; the strategy's recommended defensible compromise. **Gated on Yang
     clearance** vs. Rule 5.4 / SB 37 (private right of action, contracts on/after 2026-01-01) /
     AB 931.
  3. **Flat + signed-case guarantee** — premium flat fee with a performance guarantee; the
     fallback if even mode 2 is too risky.
- **Default = mode 1** until Yang clears mode 2. The product does not depend on which mode is on.
- A proposed amendment to `compliance-invariants` §I is drafted in `ops/decisions.md` and routed
  to Yang. **I am not editing the supreme doctrine file unilaterally** — §VII forbids it.

Other objections from the strategy are already dissolved by design and by our existing posture:
UPL → attorney-in-the-loop + deterministic "I'm not an attorney" guardrails; CIPA → §6;
security → SOC 2 + HIPAA BAA + RLS (already our posture); "my staff does this" → after-hours
overflow wedge; lock-in → month-to-month + data portability.

---

## 8. Attorney-in-the-loop gate (kills UPL, keeps conversion)

The agent runs the *close* autonomously but a licensed attorney must approve before an engagement
is finalized. Mechanics designed for **minutes, not hours**:

- At SIGN-readiness, the attorney gets a push/SMS with the case tier, the one-line summary, and
  the red flags. One tap = "approve to send retainer."
- Below a configurable tier, the agent books a consult instead of closing (no attorney needed to
  decline/route).
- The gate is logged (who approved, when) — this is the record that converts the legal analysis
  from UPL to ordinary supervision/competence.

---

## 9. Data model (extend the Repository seam — no UI touches fs/SQL)

New sibling records, added to `web/src/lib/repository.ts` (never editing `ScoredCall`):

- `IntakeCall` — one live call: firm, number, language, start/end, state reached, transport ids.
- `ConsentEvent` (voice variant) — basis, language, timestamp, recording y/n.
- `CaseScore` — the triage output (dimensions above + tier + confidence + cited spans).
- `Signature` — Dropbox Sign envelope status, retainer version, signer.
- `Matter` — the structured record written to the firm's CRM (+ write-back status).
- `AttorneyApproval` — the in-the-loop gate record.

New additive migrations `0021_intake_calls.sql … 0026_*` with **RLS on every firm-data table**
(hard requirement per CLAUDE.md). Repository grows new methods; `JsonFileRepository` gets a local
impl for pilots; `SupabaseRepository` implements the same interface — zero UI change (the whole
point of the seam).

---

## 10. Phased build plan (maps to the strategy's Stage 0–2)

**Stage 0 — Validate the wedge (weeks 1–6):** bilingual, sub-60s after-hours voice agent that
answers → consent → empathy → qualify → **soft-close/book** → writes to one CRM (start Clio or
CasePeer). Flat pricing. Attorney-in-the-loop optional (booking, not signing). Ship to 5–10 CA PI
design partners. *Threshold: 2–3 extra signed cases/mo attributable to after-hours/Spanish.*

**Stage 1 — Prove closing + compliance (weeks 6–20):** add autonomous CLOSE + retainer e-sign
behind the attorney gate. Lock CIPA consent, SOC 2 Type II, HIPAA BAA, no-training contracts
*before* scaling (gating, not optional). *Threshold: blended lead→signed moving toward 15%+, zero
compliance incidents.*

**Stage 2 — Pricing + expand (weeks 20–40):** introduce the Yang-cleared per-signed-case tech fee
(or fallback), expand after-hours→primary, deepen CRM integrations. *Threshold: NRR >100%,
durable lift across 20+ firms, defensible compliance story.*

**What changes the plan** (from the strategy, kept as live triggers): tighter CA fee-sharing
enforcement → revert to flat + guarantee; an incumbent ships autonomous bilingual closing first →
retreat to the hardest-to-copy wedge (Spanish parity + closing quality); empathy still reads
robotic in testing → lean on the human-escalation safety net; CIPA class-action risk escalates →
make zero-retention + all-party consent the headline.

---

## 11. Immediate next steps (this branch)

1. This design doc + a `ops/decisions.md` entry (done alongside).
2. Scaffold `web/src/lib/voice/` (transport port, orchestrator skeleton, consent chokepoint,
   state machine types) — real files, no secrets, staged.
3. Twilio Voice webhook route (`web/src/app/api/voice/incoming/route.ts`) returning
   ConversationRelay TwiML — behind a feature flag, `TEST_MODE` on, no real calls.
4. Repository seam extensions + additive migrations `0021+` (RLS on every table).
5. **STOP for review** before deleting any old routes (retirement list below) and before any
   pricing/positioning copy goes live (compliance §VII gate).

### Retirement list (proposed — NOT yet executed, needs your OK)
- Marketing copy under `web/src/app/(marketing)/*` positioning "independent scorer" → rewrite to
  Intake Closer. **Retire after new copy is approved.**
- `ops/backlog.md` B-001/B-002/B-006/B-012/B-013 (benchmark, seal, index, independence moat) →
  archive; replace with Closer-oriented hypotheses.
- Studio "Spot Check" founder tool (`/studio`) → keep as an internal QA tool, de-emphasize
  publicly.
- CLAUDE.md "What this is" / mission / agent-OS sections → rewrite for the new product.

Nothing above is deleted until you approve the retirement list.

# Intake Simplicity — Research Brief (how to make ops / UI / usage as simple and effective as attorneys want)

*Date: 2026-07-12. Author: research pass (2 deep-research rounds, 39 subagents, ~1.75M research tokens + 3 codebase-grounding agents). Status: STAGED for Ali. Nothing here is published, priced, or shipped — it is analysis. Every load-bearing stat is either sourced or flagged as weak. Respects compliance-invariants: flat-fee only, staff-makes-every-callback, human-approval-gated, AI-quiet, no-citation-no-claim.*

---

## 0. One-line answer

The attorney's daily footprint is **already tiny and already right** (an exception-based email digest → a single "call back now" queue → a monthly PDF). The simplicity work is **not** on the attorney's screens. It is on the three things around them: **onboarding (make concierge fast + repeatable), trust (ship the artifacts the site already promises), and the digest/queue plumbing (make it scanner-safe, delegation-safe, and self-proving).** Effectiveness comes from **positioning around the gaps a human can't cheaply close** (always-answers, never-quits follow-up, their-language) — not from "we answer in seconds," which has commoditized.

---

## 1. The one reframe

Grounding the three product maps against the market research produced a single clarifying insight:

> **There are two "simplicity" problems and they are not the same one.**
> **(a) Daily-use simplicity** — the attorney/coordinator's every-day experience. Your desk is a 4-tab app whose real interactive surface is ~3 things. This is *already* near best-in-class (single queue, one verb, tap-to-dial, one-tap outcomes, credit framing, no scores on the queue). Do **not** re-architect it. Harden it.
> **(b) Setup + trust complexity** — everything that happens *before* value: ~26 env vars, 6 intake paths, a dual data-plane, all concierge-gated; plus the trust artifacts a cautious firm asks for. **This is where the friction and the risk actually live.** This is the work.

Every incumbent (Litify, Filevine, Lead Docket, SmartAdvocate) is the mirror image: usable-enough daily, brutal on setup (3–8 week implementations, certified partners, five-figure onboarding). **"Live this afternoon, one webhook paste" is your sharpest, most defensible wedge — and it's a setup story, not a feature story.**

---

## 2. What attorneys actually want (merged + ranked, with stat hygiene)

Ranked by evidentiary strength after adversarial verification. ✅ = safe to say in copy; ⚠️ = directionally true but do **not** quote the number; ❌ = kill from all copy (fails §IV/§V).

1. **Answer every lead live — nights and weekends especially.** ✅ Best-evidenced want. Independent, non-vendor: IIHS Fatality Facts 2024 (~48% of US crash deaths Fri–Sun, night-heavy); SSRN 2026 study of 1,000 PI firms (40.9% after-hours non-answer; 29.2% of "Open 24 Hours" advertisers still failed to answer — Strammiello & Stein). ~15–20% of prospects leave a voicemail; the rest dial the next firm.
2. **Be the first live conversation.** ✅ ~78% hire the first lawyer they actually speak with (FindLaw). ❌ Do **not** use the mis-attributed "79%" general stat or the non-legal Velocify "391%."
3. **Never make an injured person repeat their story.** ✅ Warm handoff with a structured summary before a human picks up.
4. **Keep following up automatically to ~6 touches.** ⚠️ ~44% quit after one follow-up; ~93% of conversions reached by the 6th (Cirrus/ZoomInfo lineage, B2B-sourced — use as directional design rationale, not a firm-facing number). Humans fail at the boring part; software should absorb it.
5. **Sign on first contact via mobile e-sign.** ✅ Print/scan and "we'll email the paperwork" kill conversion.
6. **True bilingual English/Spanish from the first hello.** ✅ demand is real and structurally under-served. ❌ **Kill every specific Spanish lift stat** ("40% more likely to retain," "15–25% vs 10–18% conversion," "<12% of firms bilingual," "95% capture") — all trace to circular intake-vendor blogs cross-citing each other; a bar-compliance liability. Defensible pillars only: ACS (~16–18M limited-English Spanish speakers) + CSA Research "Can't Read, Won't Buy."
7. **Free the firm from phone duty without hiring/training a churny intake team.** ✅ For solos, the software *is* the intake team (legal turnover ~24%; up to 20% in first 45 days).
8. **One glanceable "who needs me now" surface, not a metrics wall.** ✅ Working memory ~4 chunks; vanity dashboards get ignored. (Your desk already does this.)
9. **Proof in dollars and cases, not software metrics.** ✅ 65% of B2B buyers call vendor ROI math inflated — show *his* arithmetic, not ours.
10. **Zero setup cliff, zero learning curve.** ✅ Configuration complexity + long rollouts (not daily use) are the universal adoption killer; "buy license + send training email" lands at ~20% adoption.

---

## 3. The shipping product — concrete simplifications, mapped to your code

### 3.1 The daily digest (the real daily surface)

*Files: `messaging/digest.mjs`, `messaging/missed-digest.mjs`, `messaging/digest-links.mjs`, `src/app/digest/confirm/page.tsx`, `src/app/api/digest/run/route.ts`.*

- **[P0] GET must never mutate.** Corporate inbox scanners (Defender/Safe Links, Proofpoint, Mimecast, Barracuda) and Gmail's image proxy fire a GET on every URL *before the human opens it* — a GET-based "mark reached/dismiss" will silently resolve your queue overnight and burn single-use tokens. Method-split: **GET renders an interstitial (shows case + buttons only); the state change happens only on POST from a tap.** This is the exact rationale behind IETF RFC 8058. **Your `/digest/confirm` already does this** (GET shows confirmation, POST server-action writes it — good instinct; verify every digest link follows it, and test against live Defender/Proofpoint/Mimecast tenants before go-live).
- **[P0] Keep all caller PII/PHI out of the email body.** Body carries only non-identifying hooks ("Auto accident, called 6:14pm, no callback logged, flagged signable"); name/number reveal only on the tokenized page. This makes a forwarded/intercepted email leak nothing — and makes the confidentiality one-pager (§3.5) *truthful*.
- **[P0] Scope delegation tokens to firm + today + action-only.** Attorneys forward the digest to their coordinator; the token must grant login-free access to *this firm's flagged cases today*, nothing else — never settings/billing/other firms.
- **VIEW token idempotent/re-openable; ACTION token single-use** (so a scanner prefetch never yields "link expired" for the real user; a double-tap/re-forward is a no-op).
- **`tel:` links are safe inline** — scanners don't dial — so "Call back now · (555) 123-4567" can live directly in the email.
- **Subject formula:** firm + exact fact + count, front-loaded for ~40 mobile chars: `"[Firm]: 3 signable cases, no callback logged"` / `"All clear — 0 missed cases today."` ❌ **Never put a dollar/recovery estimate in the subject or body** (unverifiable, reads as marketing, edges toward outcome framing).
- **Fixed daily structure, same local time** (Morning Brew/Slack habit pattern): headline count → single most-urgent case with one action → scannable rest → persistent "Open full queue." Each row answers five things: who / what / why flagged / the one action / age of miss.
- **Ship the "all-clear" digest.** "All clear — every intake call handled, 0 leaked cases today" (or firm opts to "only email when there's something"). The all-clear is what sells "always watching" and prevents "is this even on?" churn. (Your code already renders zero-miss states honestly — extend to a positive all-clear.)
- **Mobile-first mechanics (non-negotiable):** single column ≤600px, one full-width bulletproof-HTML button per case ≥44px tall, ≥4.5:1 contrast, 16px+ text, ALT text, dark-mode-safe (Apple Mail forcibly inverts).
- ⚠️ **Metric to drop internally:** do **not** track email open rate (Apple Mail Privacy Protection auto-fires proxy opens for this iPhone-heavy audience). Measure **tap-through + action-completion on the tokenized page** — the surface you control.

### 3.2 The callback queue (`/desk/queue` + `LeakCard`)

*Files: `src/app/desk/queue/page.tsx`, `components/desk/LeakCard.tsx`, `src/app/api/desk/flag-status/route.ts`, `lib/labels.ts`.*

Your queue is already ~90% of the best-practice pattern. The deltas:

- **Keep the single dominant button = tap-to-dial** ("Call back now · <number>"). ✅ You do this.
- **Pre-sort so the top card is always the single best callback right now** (freshest high-merit signable first) with one reason line ("Auto-accident · called 47 min ago · no callback yet"). The worklist decides; the coordinator works top-down and never sorts.
- **Move outcome buttons one tap away, not five equal choices on the resting card.** Today `LeakCard` can show the dial button *and* the outcome set — that's up to six competing choices per item (Hick's Law). Fix: after the dial attempt, surface a **"How did it go?"** row for that card. Order by real frequency: Left message / Spoke to them / Bad number / They signed / They passed.
- **Replace any confirmation dialog with instant action + ~6s undo toast** ("Logged: Left message · Undo"). You already have optimistic UI + revert-on-failure + Undo/Reopen — keep it; ensure no modals.
- **One tap must suffice to log** — no required free-text; optional notes behind a secondary tap.
- **Compliance-in-the-interaction:** no outcome button/copy/sort may imply the software will contact the caller or tie visibility/pricing to "They signed." Outcomes are a log for the firm's own staff. ✅ You already suppress scores on the queue — hold that line.

### 3.3 Concierge onboarding that scales (the moat, not a cost)

*Files: `src/app/studio/onboard-firm/page.tsx`, `onboarding/firm-config.mjs`, `components/desk/HowCallsArrive.tsx` / `ForwardToPhonePerson`.*

Assisted onboarding out-activates self-serve (SLG 41.6% vs PLG 34.6% activation — Userpilot 2024, n=547, verified). The PI vertical does **not** self-onboard. Keep concierge; make it a **runbook**:

1. **Pre-call intake form, ≤5 fields:** firm name, practice areas, CallRail/phone account, staff emails for the digest, timezone. The 15 minutes is *verify-and-paste*, not *gather*.
2. **Auto-generate a pre-filled onboarding project the moment a firm says yes** (handoff-at-close). If they ever log in they see "3 of 4 done — last step: review your first flagged case," never a blank wizard.
3. **The customer's only visible action is pasting one webhook URL.** The ~26 env vars + 6 intake paths are done *for* them off-screen.
4. **Delegation, not documentation.** The owner rarely holds CallRail access. Give one forwardable "hand this to whoever runs your phones" brief + a **magic link that lets the coordinator finish the webhook paste without creating a login.** (`ForwardToPhonePerson` is the right seed — extend it to a login-free completion link.)
5. **Fixed 15-min script + recorded Loom + auto checklist**, so any ops hire (or you in 15 min) runs an identical go-live. **Track median go-live time; target sub-15-min.**
6. **[P0] Kill the empty-first-digest failure mode** — the product's single biggest activation *and* month-1-SLG-retention risk, because value is passive and delayed. **Backfill the firm's own last 2–4 weeks of recorded intake** during the concierge call so the first digest shows a *real* recovered case; if no history is reachable, **seed one clearly-labeled sample.** Never auto-send a zero-scored digest.
7. **[P1] Redefine the activation event** from "webhook connected" (vanity) to **"intake staff logged a first outcome on a real flagged case."** Instrument time-from-paste-to-that; target <72h. Add a **48-hour first-win confirmation touch** (concierge verifies the first flag was a genuine missed signable case and tap-to-dial worked — catches dead integrations before silent churn). This matches your existing `BETA_ONBOARDING.md` activation definition ("first callback marked done within 48h") — make it the instrumented north-star.

**Guardrail:** never build a multi-step self-serve wizard (tour completion ~72% at 3 steps → ~16% at 7; Chameleon 550M-interaction benchmark, verified). Cap any in-app nudge at 3 steps and make it user-initiated (click-triggered tours complete 67% vs 31% auto-triggered).

### 3.4 Operational simplicity (the config-burden problem)

*This is the highest-leverage backend simplification, from the ops map.*

- **[P1] Collapse the "which of 6 intake paths / SQLite-vs-Supabase" complexity behind the concierge**, not the customer. The customer never sees a path choice. Internally, converge the dual data-plane toward one for hosted firms (the SQLite pilot plane is a source of firm-id mismatch — `CALLRAIL_FIRM_ID ?? "1"` hardcodes leak).
- **Ship PI practice-area templates** (auto accident, slip-and-fall, workplace) so a firm is live day one with zero case-type config. "Templates reduce setup to customization only."
- **Wire the unscheduled manual runners** (`api/rescue/run`, `api/crm/run`, `api/tuning/run`, `api/oncall/sweep`) to schedulers or make them one-click, so "operational simplicity" isn't founder-time. Right now these are founder-hand-cranked — the binding scaling constraint per your own path-to-$1M model is *founder hours per closed firm*, so automating these directly buys runway.
- **Compliance as invisible defaults:** new firms already ship `TEST_MODE=true` + `KILL_SWITCH=true` + kill-switch-ON at the DB. Keep that. The attorney should never configure a consent/TCPA matrix.

### 3.5 The minimum trust-artifact set + order to present it

*Grounding flagged: the site + LACBA post promise a BAA that **does not exist in the repo.** That's a §V/§VII problem right now.*

A solo/small PI firm asks four plain questions — *where's the data, who can see it, do you train on our calls, what happens to recordings* — and its sophisticated gatekeeper is its **malpractice carrier at renewal.** The legal standard is **ABA Rule 1.6 Cmt 18 "reasonable efforts" + Rule 5.3 vendor supervision + ABA Formal Op. 512 (2024)** — a risk-based test, **not a certificate.** Order to present:

1. **Public, ungated, plain-English one-pager** — "How we handle your calls and your clients' data": data-flow diagram (webhook in → scored → flag out), storage location + encryption, **exact list of who can access recordings**, bold **"We never train models on your calls,"** deletion-on-request + auto-delete-on-offboarding, breach-notification commitment. **Never gate this behind an NDA.** This is what actually satisfies Rule 1.6 Cmt 18. ✅ Strongest hook: intake recordings of *prospective* clients carry **full confidentiality weight under Rule 1.18** (Cal. Rule 1.18 + Cal. Formal Op. 2021-205) even with no engagement — a real, verifiable duty, better than any carrier stat.
2. **Mutual NDA** — signed at/before the concierge call. (You have a DRAFT pending Yang.)
3. **DPA / confidentiality-processing-deletion addendum** on the order form — the correct core instrument for CA caller PII (stands on Rule 1.6/1.18 regardless of CCPA thresholds, which many small firms fall below).
4. **BAA — offered on request, NOT led with.** A plaintiff PI firm representing injured people is generally **not** a HIPAA covered entity, so a BAA is likely the wrong *lead* artifact. ⚠️ Genuinely contested (U.S. Legal Support calls it "ambiguous"), so: keep a BAA *available*, and **[P0] stop promising a BAA on the site/LACBA post until it exists.**
5. **Published methodology + published tier precision** — the credibility engine (§3.6).

**The killer asset:** a forwardable **"Vendor Due-Diligence File"** mirroring the ABA Op. 512 package — "adopt us and we hand you a renewal-ready due-diligence file for your carrier." ⚠️ Don't overclaim that carriers demonstrably demand it (the "60% of LPL carriers / CNA's five questions" figures trace to a circular ecosystem — no primary CNA doc locatable). **Tiered trust center:** PUBLIC = one-pager, methodology, published error rate, subprocessor list, "SOC 2 Type 1 — in progress, target [date]." Silence on SOC 2 reads worse than an honest "in progress." Pursue **Type 1 now** (~3–8 mo, ~$12–40K); don't block launch on Type 2 (no solo PI firm demands it).

### 3.6 Presenting findings credibly (the independent-rating discipline)

Your "Moody's/Michelin/JD-Power of PI intake" positioning maps cleanly onto how respected raters (Michelin, S&P/Moody's, BI-RADS, ICD-203) actually work:

1. **Tiny fixed tier vocabulary at the decision point, never a raw number.** Keep the queue to two glanceable tiers (Strong flag / Moderate flag). FIRST/ICD-203 explicitly endorses tier-only presentation as "the least complex way to communicate uncertainty" (verified). ✅ You already do this.
2. **Label each tier by ACTION, not adjective** (BI-RADS pairs each category with a follow-up). "Strong flag" = "Call back now"; "Moderate" = "Worth a look."
3. **Never let a tier stand alone — attach exactly one verbatim evidence line in the queue** (the caller's own words: "…I was rear-ended and I'm still in PT"). A coordinator argues with "Strong flag" but not with the caller's words. This is what converts a rating from arguable to self-evident.
4. **[P2] Add a third honest tier — "Couldn't tell / needs a listen"** (BI-RADS Category 0 "incomplete") instead of forcing ambiguous calls into Moderate.
5. **Never fuse merit and confidence into one composite number** (ICD-203). Tier = our confidence in the flag; the report's merit notes = case-strength reasoning; keep them as two distinct lines.
6. **Publish the false-alarm/confirmation rate as a standing visible line** ("Of last month's Strong flags, X% were confirmed signable on callback"). Screening-medicine evidence shows disclosure *builds* trust, not distrust (verified). This is also your §IV invariant ("publish the false-alarm rate") made into a feature.
7. **Open method, private per-item number.** Publish a **versioned rubric** ("v1.4" changelog) while keeping the raw per-call score in the report only, **out of the queue.** This is the strongest anti-gaming defense: the peer-reviewed L.A. County restaurant-grade study (140k+ inspections) found scoring manipulated in ~26.6% of cases *where a visible numeric threshold had consequences* (Goodhart's Law). Keeping the number off the queue is a design *virtue*.
8. **Make structural independence explicit and repeated in-product:** "We charge a flat monthly fee. We never touch your fee, we are never paid more when you sign more, and you cannot suppress or edit a flag." (The 2008 issuer-pays ratings lesson applied defensively.)
9. **Score only what's observable in the call** (caller's words, coordinator's handling) — **never outcomes the firm controls** (whether they signed). Like Michelin scoring the meal not the reservation — the *only* model compatible with flat-fee, no-outcome-pricing reality.

---

## 4. The strategic fork (framed for Ali/Yang — not resolved here)

The docs contain two live, contradictory directions. Research can inform this; it cannot decide it — it crosses a §VII regulated-area gate (route to Yang).

| | **Independent Scorer / Recovery Desk** (shipping now; war-plan 7/11) | **Autonomous Bilingual Voice Closer** (pivot; 7/08) |
|---|---|---|
| What it does | Reads calls, flags leaked cases, *firm's staff* call back | AI *answers, qualifies, and closes/e-signs* the call |
| Pricing fit | ✅ Flat fee, clean under §I | ⚠️ "Most compelling economics" leans per-signed-case = **prohibited** under §I |
| Compliance surface | Low (no caller contact, human-gated) | High (CIPA consent, TCPA/AI-voice, UPL, privilege waiver, AI-disclosure) |
| Positioning | "Switzerland — audit whoever handles the call" | Competes *with* the intake team it would otherwise audit |
| Market evidence | Strong for the *desk*; incumbents form-anchored | **The premise number does not exist** |

**What the research actually says about the closer** (so the decision is evidence-based):
- **The head-to-head number the pivot is premised on does not exist.** No study measures AI-close vs qualify-then-same-night-human-callback signed-retainer rates on distressed PI callers. Even Eve's "60% of transfers signed" is a **hybrid** (AI qualified + warm-transferred; a *human* closed).
- **Essentially all measurable lift comes from answer + qualify + instant handoff, not the AI performing the emotional close.** 84% of consumers prefer a human when contacting a law firm; 47% say heavy AI reliance reduces trust; positive-review rate 56% (human) vs 10% (chatbot); synthetic empathy can *backfire* on distressed callers (USF study). A bot arguing a grieving caller into signing risks both the signature and a one-star review.
- **Recommended re-scope (if the pivot proceeds):** build it as **one decision fork, not a persuasion engine** — after qualifying, either (a) offer a retainer e-sign to clear-merit, low-emotion cases (framed as *document delivery*, not advice) or (b) create an urgent human-callback task with full transcript. Ship a per-firm toggle **defaulted to book-human**, and **instrument the split so you own the first real datapoint in the market.** Latency is a real differentiator: engineer **sub-800ms tail** on a **turn-based STT→LLM→TTS** pipeline (cheaper on long calls, better audit trails than speech-to-speech).
- **Tension to resolve first:** the solo/small segment you target has *no human to warm-transfer to at 2am* ("software IS the intake team"). For that segment, "book a human callback" and "close now" partially collapse — which sharpens, not settles, the question.

**My read (advisory):** ship and win with the **scorer/desk** now; treat the **closer as an instrumented, book-human-default experiment inside the beta**, priced flat, gated by Yang on consent/UPL/privilege. Do not bet the company's positioning on the closer until the beta produces the datapoint the whole market is missing. This keeps §I clean and preserves the independence moat.

---

## 5. Pricing & metrics (flat-fee compatible only)

- **Pricing stays flat monthly. §I is a bright line.** List $2,500 / $5,000, founding $1,500/mo locked 12 months (per `pricing-decision-brief.md`, Table C). ❌ The market's per-lead / per-minute / per-signed-case norms are **research context only** — never a recommendation. If the closer ships, price it flat + (optionally) a generous included-voice-minutes bucket with one published overage rate — **never a cent tied to signing or fee %.** The words "per signed case / per retention / % of fee / success fee / we only get paid when you do" appear nowhere.
- **Kill the framing conflict:** the engine-v2 summary's "$200–500/mo QA" and §I's "$2,500/$5,000" cannot both be the pitch. Recommendation: hold the premium audit-desk price — "an independent audit desk priced like a gym membership undercuts its own authority." Route the final number to Ali (it's blocked on you).
- **What to show (the money screen):** leads in → answered → qualified/flagged → signed → revenue recovered, by source, in *dollars and cases* — **his arithmetic, not ours.** Hero tiles = the durable gaps (after-hours answer rate, persistence-to-6, bilingual share). Negative proof is the trust-builder: "12 calls after hours this week that would have gone to voicemail." Report **Spanish outcomes side-by-side with English** or the firm is blind on its biggest lever.

---

## 6. Stat-hygiene ledger (what's safe vs what must be killed) — read before any copy touch

**❌ KILL from all copy/pitches (fail §IV/§V — vendor-laundered, circular, or mis-attributed):**
- Every specific Spanish lift number ("40% more likely to retain," "15–25% vs 10–18%," "<12% bilingual," "95% capture").
- "79% hire the first lawyer" (general) and Velocify "391%" — use FindLaw's ~78% legal-specific instead.
- "67% abandon forms / 33%→78% completion" (single-vendor Perspective AI).
- "60% of LPL carriers ask about AI / CNA's five questions" — no primary source.
- Notification-fatigue stats ("60% unsubscribe / 47% disable wk1 / 72% stressed") — one un-primary SuprSend blog.
- "23 minutes to refocus" and "61% faster with keyboard" — not peer-reviewed / no primary source.
- Power-dialer "40% answer rate," radiology-worklist vendor quotes, "80% of iPhone users use dark mode" (real email figure ~37% iOS / ~7.5% Apple Mail).

**⚠️ DIRECTIONAL ONLY (design rationale, don't quote the number to a firm):** the 6-touch/93% follow-up lineage; ~47-second attention span (real but over-generalized); per-field form-completion drop (~3–7%); restaurant-grade health-outcome effects (peer-reviewed but academically contested).

**✅ SAFE, primary-sourced, load-bearing:** SSRN 2026 after-hours 40.9% non-answer; IIHS 2024 crash-timing; FindLaw 78%; Userpilot 2024 (n=547) activation 41.6% vs 34.6% and SLG month-1 retention 39.1% vs 48.4%; Chameleon 550M-interaction tour-completion; ABA Op. 512; FCC Feb-2024 AI-voice/TCPA; Cal. Rule 1.18 + Formal Op. 2021-205; ICD-203/FIRST tier guidance; BI-RADS action-paired categories; L.A. County 26.6% manipulation-where-consequential; ACS Spanish-speaker counts + CSA "Can't Read, Won't Buy."

---

## 7. Merged roadmap (P0 → P2, mapped to files)

**P0 — blocks a safe, honest launch:**
1. **GET/POST method-split + interstitial on every digest action; test vs live Defender/Proofpoint/Mimecast.** `messaging/digest-links.mjs`, `digest/confirm`.
2. **Remove the BAA promise from the site + LACBA post until the artifact exists.** (compliance-invariant §V/§VII)
3. **Kill the empty-first-digest** — backfill or seed a labeled sample; never send a zero-scored digest. `onboarding/*`, `messaging/digest.mjs`.
4. **Ship the ungated plain-English confidentiality one-pager** (satisfies Rule 1.6/1.18).
5. **Keep all caller PII out of the email body; scope delegation tokens to firm+day+action-only.**
6. **Keep the numeric score out of the queue; two action-labeled tiers + one verbatim evidence line.** `LeakCard.tsx` (already close).

**P1 — makes it genuinely usable + credible:**
7. Redefine activation = "staff logged a first outcome on a real flag"; instrument time-to-it; add 48-hour first-win touch.
8. Callback-queue polish: post-dial "How did it go?" row (not 6 competing buttons), instant-action + undo (no modals).
9. Templatize the 15-min runbook: 5-field pre-call form, auto pre-filled checklist, forwardable delegation brief + login-free magic link, script + Loom; track median go-live.
10. Publish versioned rubric + standing confirmation-rate line + flat-fee-independence statement in-product.
11. Fixed daily digest structure + subject formula + same-time send + all-clear zero state.
12. Ship NDA (pre-call) + DPA/confidentiality-deletion addendum; stand up tiered trust center with "SOC 2 Type 1 — in progress."
13. Reduce founder-time: wire the unscheduled manual runners; converge the dual data-plane for hosted firms.

**P2 — hardening / differentiation:**
14. Attorney+coordinator assign/claim split; offline optimistic logging.
15. Desktop single-key triage + swipe-to-log (user-test mappings first).
16. Forwardable "Vendor Due-Diligence File" sales asset (attribute carrier claims carefully).
17. Third "Couldn't tell / needs a listen" tier.
18. Begin SOC 2 Type 1; publish roadmap.
19. PI practice-area templates for zero-config day-one.
20. If the closer proceeds: book-human-default per-firm toggle, instrumented closer/qualifier + Spanish/English A/B, sub-800ms turn-based pipeline — Yang-gated on consent/UPL/privilege.

---

## 8. Open empirical questions — only your beta firms can answer these (not more web research)

1. Which bleed is bigger for these firms — **follow-up (recovery) vs selection (merit)**? (Your whole thesis rides on "follow-up.")
2. Does "value-determining questions resolved within SLA" **actually correlate with recovered dollars**? (The staged hero-metric swap depends on it.)
3. What share of after-hours PI calls are **clear-green low-emotion** (safe to bot-e-sign) vs **distressed/ambiguous** (must route human)? (Determines whether the closer is worth building.)
4. **Spanish-vs-English answered-to-signed delta** — no audited number exists anywhere; make it the beta's #1 instrumented metric.
5. Does an **up-front AI-disclosure opener** reduce sign/booking rates for distressed English and Spanish-dominant callers? (No data; instrument per-firm.)
6. **Two vs three confidence tiers**, and "attorneys prefer a tier over a number" — hypotheses to hallway-test with real coordinators.
7. **Privilege-waiver** exposure of a third-party vendor recording privileged intake absent "agent-of-attorney" framing — resolve with Yang before any launch claim.

---

*End of brief. This document is staged, not published. It contains no outbound action. Product-claim, pricing, and regulated-area items above are flagged for the §VII human-approval gate and, where novel, for Yang.*

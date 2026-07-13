# IntakeQA — How To Make It Irresistible

Deep-research synthesis, 2026-07-13. Research only. Nothing here changes code.

## 0. Honesty note on this pass

I fanned out 11 expert agents (5 auditing the product internals, 6 on external market/competitor/buyer research). The account hit its **weekly Claude usage limit mid-run** (resets Jul 17, 2pm PT), so most external agents died partway. What is fully grounded here:

- **Complete:** firm-facing Desk UX audit, operator-side reliability/observability audit, "what makes SaaS irresistible" market research (source-cited).
- **Fragments only:** competitor scan (Eve/EvenUp raised ~$103M Series B and CaseGen flagged as frontier threats; Answering Legal solo plan ~$3.60/min ≈ $360/mo), and the finding that the SMS approve→send control surface is a **Node CLI** with no operator UI.
- **My own:** full codebase route map, the triage engine shape, project memory, and domain knowledge of PI economics, speed-to-lead science, TCPA/CIPA, and CA bar rules.

Anything labeled **[VERIFY]** should be re-sourced after the reset. Everything else is grounded in the actual repo or the completed audits.

---

## 1. The one-sentence diagnosis

**IntakeQA is a beautifully built retrospective call-grader wearing the costume of a rescue engine, sold under a positioning ("the independent scorer") that quietly contradicts what actually makes a firm money.** The product is a vitamin dressed as it should be a painkiller. Almost every high-leverage improvement is the same move: **stop selling the grade, start selling the recovered signed case, and make that recovery undeniable, habitual, and impossible to walk away from.**

---

## 2. The central strategic problem: three identities fighting for the wheel

The product currently claims to be three different companies at once, and they pull in opposite directions:

1. **The independent scorer** — "the Moody's / J.D. Power of PI intake," a neutral rating authority that does not participate in outcomes. (Mission in CLAUDE.md, the manifesto, pricing page: "never a percentage, never a share of recoveries.")
2. **The rescue engine** — human-approved SMS re-engagement that wins back leaked signable cases. This *does* participate in outcomes. (v1 scope, the whole brand name.)
3. **The intake closer** — an autonomous bilingual voice agent that answers and closes calls. (INTAKE_CLOSER_DESIGN.md pivot.)

These are not the same product and they cannot share one homepage. An "independent rating authority" that also texts your leads and closes your calls is not independent — it is a vendor with a rating attached. The firm senses the contradiction even if they can't name it.

**Resolution (recommended): collapse to ONE spine — "the intake safety net."** The scorer is not the product; it is the *sensor*. The product is: *nothing signable ever slips through your intake again — we catch it, we help you win it back, and we prove the money every month.* The "independent, neutral, evidence-first" values become **how** the safety net earns trust (it grades honestly, it cites the transcript, it never flatters), not a separate business model. The "closer" is the eventual top of the funnel (catch the call live), not a competing identity. One promise, three depths: **catch → recover → (later) answer.**

Why this matters for "irresistible": a firm cannot crave a product it can't categorize. The Moody's framing is elegant intellectually but it makes the buyer's brain file you under "analytics/reporting" — a vitamin, discretionary, first to be cut. "The thing that makes sure I never lose another $40k case I already paid for" is a painkiller. Pick the painkiller.

---

## 3. The reframe that changes everything

Denominate the **entire product in signed cases and dollars, never in scores.** This is the single most important change and it is almost free — it is mostly copy, hierarchy, and one honest measurement loop.

The PI managing partner runs on exactly one mental model: **cost per signed case** and **value of a signed case**. Industry benchmarks (agency-sourced, directionally consistent, **[VERIFY]** against your own beta firms): cost per signed case ranges roughly $685–$1,466 by channel; an auto case runs $2,500–$3,500 to acquire; ~70% of legal leads never convert to a signed retainer. That last number *is* the leak IntakeQA sells against. Every screen, email, and sales line should plug into that model:

- Not "this call scored 62/100" → "**this call was a signable auto case your intake let go — ~$18k in fees walking out.**"
- Not "Signable-Save Rate 41%" (a house metric they must learn) → "**you signed 41% of the cases worth taking; the median firm your size signs 55%; that gap is ~$Xk/month.**"
- Not "your audit is ready" → "**you leaked $210k in signable cases in the last 90 days. Here are the 5 worst-lost calls, with the exact sentence where each one slipped.**"

This is what turns a vitamin into a painkiller. Everything in §4 and §5 is downstream of this.

---

## 4. The five highest-leverage moves (the money list)

Ranked by impact on *would a firm buy and never cancel*. Detail and provenance in §5.

1. **Wire the SMS rescue action into the Desk, and harvest wins automatically.** The company is *named* around human-approved SMS re-engagement, and it does not exist on any firm-facing screen — the Desk offers only tap-to-dial. Meanwhile "won back" (the entire ROI proof) depends on a staffer remembering to tap "They signed." Put "Send approved text" on the leak card, and actively harvest signed outcomes (CRM reconcile + follow-up prompt + weekly "confirm your saves" email) so the money number is never silently zero. *This is the difference between a call-list and a rescue engine.* (Desk audit #2, #6.)

2. **Ship the free "Leaked-Case Audit" as the wedge, and make it the aha in under an hour.** Ingest a firm's last 30–90 days of real calls, return one screen: "$X leaked, here are your 5 worst-lost calls with the flip-fact." Their own leaks, not a demo. This is the highest-converting land motion in vertical SaaS (Auvik's free-audit playbook), and it collapses time-to-first-real-value from "~a month" to "same day." Today first login shows *fake* sample cases and the first honest dollar figure is a full month out. (Irresistible-SaaS research Play 3, 7; Desk audit #4.)

3. **Denominate everything in dollars + signed cases; ship a monthly "Recovered Receipts" statement, emailed.** A one-screen, screenshot-able, partner-forwardable proof: "This month we flagged 14 signable calls your intake would have lost; 6 signed = ~$90k in fees; your cost $X; ROI Ny." Tied to *their* average case value. This is the #1 retention mechanism — it kills the 22%-of-churn "value gap" and makes cancelling feel like turning off a money printer. (Irresistible-SaaS research Play 2; §3 reframe.)

4. **Fuse the two queues and auto-triage from the recording.** Right now there are two disconnected, near-homophone queues: "Call these **back**" (retrospective leaks) and "Call these **first**" (live triage), sharing no data. And live triage makes staff key in ~15 fields by hand for a call the system *already transcribed and scored*. Fuse them: a graded call the firm didn't sign flows automatically into the rescue queue, and triage pre-fills from the read call so staff confirm a grade in one tap. This removes the biggest friction in the product and makes the live console feel like magic ("it already knew"). (Desk audit #1, #9, idea 2.)

5. **Turn the account into a compounding, un-portable asset: the calibrated model + the leak-trend history + the CA benchmark.** Calibration-by-example already reads a firm's own appetite from real decisions — after a month it becomes a tuned model of *this firm's* judgment that a competitor starts from zero on. Pair it with a visible leak-trend history ("$Xk lost over 90 days to *not asking about prior treatment*, down 40% since you started coaching it") and, once you have enough firms, "here's how your intake compares to the CA PI benchmark." That is accruing benefit + mounting loss + a single-player→multiplayer data moat no new entrant can replicate. (Irresistible-SaaS Play 6; Desk audit ideas 4, 5.)

---

## 5. Surface-by-surface improvement map

### 5A. The Engine (scoring + deterministic triage) — the trust problem and the value ceiling

What exists: an LLM scorer (AssemblyAI → Claude against a calibrated system prompt + firm config + 3 gold examples) that flags leaked signable cases; a v2 engine running in shadow; and a **deterministic** CA triage engine (`scoring-v2/triage-live.mjs`) that outputs a letter grade, disposition (sign_now / decline_with_grace / refer_out), value tier, the flip-fact, an SOL "filing clock," and CA gate citations, with calibration-by-example and a firm-appetite profile.

Weaknesses and improvements:

- **Trust is asserted, not demonstrated.** A skeptical attorney's first question is "how do I know your grade is right?" The product needs a *visible ground-truth loop*: show the firm, over time, that flagged-signable calls the firm *did* sign confirm the flag, and that declined ones didn't. Every score should carry the transcript quote it rests on (the testimonial-injustice principle: represent the caller fairly, in their words). **Improvement:** a per-firm "calibration report" — "on your last 90 days, when we said *sign*, you signed 88% of the time; when we said *pass*, you passed 91%." That single artifact converts "AI I don't trust" into "a second opinion that agrees with me, and catches the ones I miss."

- **The v1→v2 shadow/cutover is stuck for the right reason and should be resolved with measurement, not courage.** The public site publishes v1's false-alarm rate; v2's is unmeasured, so compliance holds the flip. **Improvement:** run v1 and v2 in parallel on the shadow corpus, publish v2's measured false-alarm rate the same way, and flip only when v2 is provably >= v1 on precision *and* recall of signable cases. Make the *published, measured error rate itself a selling point* ("we publish our miss rate; no competitor does"). This is category-authority behavior.

- **The deterministic triage engine is the moat — protect it and extend it.** Determinism is the right call for legal facts (SOL, comparative fault, MICRA caps, lien math, minor tolling, government-claim deadlines) because it is auditable, reproducible, and defensible in a way an LLM guess is not. **Risks to close:** (a) CA law currency — statutes and caps change; there must be a dated "law version" and a review cadence, or the SOL clock embarrasses you. (b) Edge cases that make it look dumb — government defendants, minors, UM/UIM stacking, workers-comp overlap, dog-bite strict liability, dram-shop. Each needs a golden test. (c) The engine should *say what it doesn't know* rather than guess (explicit "unknown" states already exist in `observed()` — lean into them: "policy limits unknown — ask this").

- **The value ceiling: today it grades calls. The 10x is predicting the case.** No competitor credibly does per-firm, CA-specific: **liability probability, settlement-value range, collectibility/net-to-client, and lien exposure** at intake time, deterministically, with citations. That is the difference between "your intake missed this" and "take this case, it's worth $60–90k net after a ~$12k lien, sign it today." The 4th hidden lien/net-to-client gate you already built is the seed of this. Make net-to-client the headline number — it is what actually decides whether a PI case is worth taking.

- **Outside-the-box engine ideas:** (1) **Referral-out value** — when the engine says "refer out," it should name *who* and estimate the referral fee, turning a decline into revenue. (2) **Per-attorney conversion coaching** — the engine already sees every call; it can tell a partner "your intake person loses 30% more signable soft-tissue cases than your best closer, specifically by not asking about prior treatment." (3) **A live "second opinion" whisper** during the call, not just after. (4) **Settlement-range priors from your own corpus** as it grows — the benchmark competitors can't rebuild.

### 5B. The Desk (firm-facing UX) — from the completed audit

The Desk is the best-built part of the product and still has the most valuable gaps, because the gaps are exactly the promises the company is named for. Ranked findings (full audit on file):

1. **Two disconnected, near-homophone queues** ("Call these back" vs "Call these first") that share no data and no cross-link; triage is reachable only from one black header button and is never mentioned on home. → Unify to one spine (§4 move 4).
2. **The SMS rescue action is absent from every firm screen.** → Put "Send approved text" on the leak card (§4 move 1). *Highest-leverage single fix.*
3. **No daily habit hook** — settings literally tells firms "you don't need to check the desk." A tool you're told not to open is a tool that's easy to cancel. → Make the morning callback queue a texted/emailed daily nudge; give home a standing "today" strip even on all-clear days (calls graded, saves this week, streak).
4. **Day-1 value is fictional, real value is a month out.** First login = labeled-but-fake sample cases; the shareable statement is gated "after your first full month." → Bring the Leak Audit inside onboarding so the firm sees *their own* real number within the hour (§4 move 2).
5. **The "$X on the table" number is category-average, not case-specific**, backed by one footnote. → Show the derivation on demand and let the firm tune their own average fee inputs so the number is *theirs* (a number they helped set is one they defend, not discount).
6. **"Won back" depends on a staffer remembering one un-prompted tap** — the single most important renewal number can silently read $0 forever. → Actively harvest wins (§4 move 1).
7. **Callback workflow has no scheduling** — it preaches the 6-attempt cadence but schedules none of it; a "left a message" card just sits. → Add "remind me / try again at [time]" that re-surfaces the card (and, with SMS, auto-drafts the next approved touch).
8. **Enum/jargon leakage in triage** ("value tier", "MIST", "ERISA", "dram shop", "decline with grace" rendered raw) for non-lawyer intake staff. → Plain-language every enum; hide lawyer-only fields behind "more detail."
9. **Triage is ~15 fields per live call** and re-enters data the system already has. → Progressive form + auto-prefill from the read call (§4 move 4).
10. **Triage is desktop-shaped; intake staff are on phones.** → Single-column, thumb-sized, verdict-below-form, sticky "Grade" at 375px.
11. **Stale nav / dead-end redirects** ("Missed cases" links that land you back on the same page) contradict the "one simple screen" promise. → Delete `desk-nav.ts` legacy tabs; relabel.
12. **A money card can wear an "Unrated" badge** — claiming "$25k on the table" and "Unrated" at once spends the exact trust the brand is built on. → Never pair a dollar claim with "Unrated."
13. **Scorecard leans on a coined metric ("Signable-Save Rate") and an unsourced benchmark.** → Define it in one plain sentence at the top; source the benchmark or reframe as "firms like yours in our data."
14. **Settings notifications/CRM/deletion are "email Ali" promises, not controls** — reads as "not built" and signals dependence on one person. → Make digest cadence a real toggle; every "email Ali" is a churn seam.
15. **No onboarding state machine** — connecting calls is a CTA, not a tracked outcome; a firm that forwards the webhook has no confirmation the pipe is live until a call happens to appear. → 3-step live strip: Connect → First call received → First readout ready.

### 5C. The Studio / operator model — the thing that breaks at scale

This is where the business dies quietly if unaddressed, and where a completed reliability audit found real landmines.

- **The SMS approve→send control surface is a Node CLI, with no operator UI. [fragment, grounded]** For a non-coder founder, the compliance-critical human-approval step — the one thing that legally *must* stay human — runs from a terminal. This does not scale past a handful of firms and is fragile in the founder's own hands. **Improvement:** a proper in-app approval queue (Approve / Edit / Reject, with quiet-hours and opt-out enforced in the single chokepoint) is table stakes before onboarding beyond the founding cohort.

- **Alerting is off-by-default and the operator flies blind.** Every founder alert is gated behind `EMAIL_ENABLED` (default false) + `RESEND_API_KEY` + `CRON_SECRET` + `FOUNDER_EMAIL`; if any is unset, alerts render to an ephemeral file and email nobody. **Improvement:** a loud red banner on `/admin/status` when production is running with alerting disabled ("you are running blind").

- **A firm with a wrong/absent CallRail secret can leak *every call* with zero alert.** `no_secret` errors match no alert classifier at all; sub-threshold signature failures (a low-volume firm doing 1–2 calls/day with a wrong secret) never trip the 3-per-hour threshold and never retry — CallRail treats the 401 as permanent. From the operator's chair, "broken firm" and "quiet firm" look identical until they churn. **Improvement:** alert on the *first* ingest failure per firm per day; add a standing "firms whose calls cannot ingest" section; surface an unresolved-failures count that survives a missed email.

- **Failed CallRail calls are terminal, never retried, and invisible to the firm.** A transient AssemblyAI/Anthropic blip marks a call `failed_scoring` forever; for a CallRail call (vs an upload) it appears nowhere the firm looks. **Improvement:** bounded retry (2 attempts) before terminal; surface failures on the firm desk.

- **Inngest is a single point of failure for scoring work** (both the fast path and the "fallback" sweep are Inngest functions); detection is correctly decoupled to a Vercel cron, but recovery is not. **Improvement:** a non-Inngest execution fallback, or at minimum an explicit provider-down alert and a heartbeat so a broken cron doesn't fail silently.

- **The 4MB upload cap without the service-role key means a real 30-minute intake call cannot be uploaded at all**, and the friendly error never renders (the body dies at the platform edge). **Improvement:** make storage mode (service-role key) a hard production requirement with a status-page check; pre-flight file size client-side.

- **Unit economics / white-glove at scale:** the human-in-the-loop must be surgically minimal — humans on (a) SMS approval and (b) genuinely ambiguous grades only. Everything else (ingest health, onboarding steps, win-harvesting, digests) should be automated and self-healing so one operator can carry 50+ firms. The service should *feel* white-glove (a human reviews your rescues) while being mostly automated underneath.

### 5D. Onboarding / integrations / the wedge — time-to-value

- **The wedge is right (Leak Audit) but buried and slow.** It should be the front door: a firm uploads or connects 90 days of calls and gets their leaked-dollar number the same day. Make it *viral* — the audit result is a shareable artifact ("[Firm] leaked $210k last quarter"), and referral of a peer firm earns something. (Irresistible-SaaS Play 3.)
- **CallRail-first is correct** (it is the dominant PI call-tracking tool) but connection must be self-serve with an in-app "pipe is live" confirmation, not an operator-set-up secret that fails silently (§5C).
- **Name the CRMs that matter and integrate the top ones two-way [VERIFY the current top 3-4]:** Lead Docket (Filevine), Litify, CASEpeer, Clio Grow, SmartAdvocate. The dead-lead rescue import already exists (`lib/crm`) — the expansion is two-way sync so a "signed" in the CRM auto-confirms a save (closing the win-harvest loop) and a leaked call auto-creates a lead.
- **Time-to-first-value target: under one hour to the first real leaked-dollar number, first rescued case within week one.** That is the retention-predicting aha moment. Anything that defers the first honest dollar figure by weeks is bleeding activation.

### 5E. Positioning / pricing / the offer

- **Pricing is deliberately flat monthly, "never a percentage, never a share of recoveries."** This is the *legally correct* instinct and should be defended, not abandoned: a "% of recovered fee" model in California risks **improper fee-splitting with a non-lawyer (Rule 5.4)** and **running/capping (Bus & Prof 6152)**, and outcome/attribution disputes would poison renewals anyway (the firm will argue "we'd have signed that case regardless"). **Do not build the core model on a contestable "% recovered" metric. [VERIFY with CA counsel before any performance language ships.]**
- **But flat monthly alone is a vitamin price for a vitamin story.** Anchor the price to the buyer's model: "less than the cost of losing one signable case a year." Then add **risk reversal**, which is the real lever for a cautious professional buyer: a **capped guarantee** — "if in 90 days our ledger doesn't show at least $[N] in flagged, recoverable signable cases, you don't pay / we refund." A guarantee denominated in *found* cases (not *won* cases) is defensible, honest, and sidesteps the fee-split and attribution problems. The internal champion can defend it to the partners.
- **Proof must be bulletproof.** Memory notes a prior letter shipped a false error-rate claim (since fixed). The lesson: every number on the site should trace to measured data. Turn that discipline into the pitch — "we are the only ones who publish our miss rate."
- **Category design: own the rating.** Publish a recurring, anonymized **"California PI Intake Leak Report"** (average leak rate, callback speed, save rate by firm size) and get it cited by CAOC / bar publications / marketing agencies. Establish the intake grade as the number firms brag about. This is the Gainsight/J.D. Power move — become the benchmark others quote, and you own the category rather than fighting in it.

### 5F. Compliance as a moat, not a chore

PI partners have one silent, deal-killing objection: malpractice / confidentiality / bar-ethics risk. The product already has strong compliance bones (single send chokepoint, quiet hours, opt-out, kill switch, consent logging, CIPA §632 recording consent). **Turn it into the pitch:**

- Lead the sale with **BAA/NDA + a one-page confidentiality/security brief** — part of the *offer*, not paperwork sent later. (Memory flags BAA as still open; close it.)
- The **all-party consent (CIPA §632)** handling and **human-approved-every-text** design are features to *advertise*, not hide: "the compliant way to win back a lead — a human approves every message, quiet hours enforced, opt-out honored instantly, every consent logged."
- On **Rule 7.3 solicitation**: re-engaging a lead who *already called the firm* is defensible (they initiated contact), and you already have a "warm-callback shield" talking point in memory. **[VERIFY current CA Rule 7.1–7.3 scope; this is the one that needs a real lawyer's sign-off before scaling SMS.]**
- **AI disclosure / UPL:** keep the tool positioned as *assisting a human decision*, never *giving legal advice or evaluating a case autonomously*. The deterministic engine + human approval design already supports this; say it explicitly.

Compliance-by-design + published error rates + a real BAA is how you become the *safe, obvious* choice and out-compete sloppier AI-intake startups who will cut these corners.

### 5G. The data moat and network effects

The true defensibility is not the UI (copyable) — it is the **corpus of scored CA intake calls + outcomes** (which flip-facts actually convert to signed cases), plus each firm's **calibrated appetite model**. Two compounding lock-ins:

- **Per-firm accruing benefit:** the CA Law Engine + calibration-by-example gets sharper the longer a firm uses it; leaving means starting from zero and losing the record of their own improvement.
- **Cross-firm benchmark (single-player → multiplayer):** once enough firms are on, ship "how your intake compares to the CA PI benchmark" — impossible for a new entrant to replicate without the data. This is the Veeva/EvenUp pattern.

---

## 6. Competitive landscape (knowledge-based — [VERIFY] all after reset)

Grounded fragments: **Eve / EvenUp** raised a large Series B (~$103M) and is the sharpest frontier threat with an explicit "largest structured PI dataset" moat, though it targets *demand letters / case work-up*, not intake QA. **CaseGen** flagged as an emerging frontier player. **Answering Legal** solo plan ≈ $3.60/min (~$360/mo). The rest below is from my own knowledge and must be re-sourced:

- **Human answering / virtual receptionist:** Smith.ai, Ruby, Answering Legal, Alert Communications, Nexa, LEX Reception, Back Office Betties. They *answer* calls; they do not *grade* your intake or tell you which signable cases you lost. Overlap is thin; they are a channel IntakeQA can sit on top of (score the calls they handle).
- **AI voice intake (the closer-pivot competitive set):** a fast-growing 2024–2026 field (Rosie, Goodcall, and legal-specific voice agents). This is where the "intake closer" identity competes; it is the most crowded and best-funded lane. Entering it late as a third identity is the strategic risk — the safety-net positioning is more defensible.
- **Legal CRM / intake management:** Lawmatics, Lead Docket, Litify, CASEpeer, Clio Grow, SmartAdvocate, GrowPath. These *own the workflow* and could add "intake QA" as a feature — the main build-vs-buy threat. IntakeQA's defense is the CA-specific deterministic legal engine + the independent-grader trust position, which a CRM vendor grading calls that flow through its own funnel cannot credibly claim.
- **Call analytics / conversation intelligence:** CallRail Conversation Intelligence, Invoca, CallTrackingMetrics; and down-market threats from Gong / Observe.ai. These score calls generically but have **no PI-specific case-merit engine, no CA law, no rescue, no net-to-client math.** That gap is IntakeQA's white space.

**The white space IntakeQA can own:** *the CA-specific, deterministic, independent intake safety net that grades honestly, predicts case value/net-to-client, recovers leaked cases compliantly, and publishes the benchmark.* No incumbent occupies all of that. The generic-CI players lack the law engine; the CRMs lack independence; the answering services lack the grading; the AI-intake startups lack the compliance rigor and the trust position.

**Biggest threat:** a legal CRM (Lead Docket/Litify) bundling "good-enough" AI call scoring for free. **Defense:** be CA-deep where they are horizontal, be the trusted independent rating where they are the interested party, and lock in the calibrated per-firm model + benchmark data they can't replicate.

---

## 7. The irresistible offer, assembled

Using the value equation (Dream Outcome × Perceived Likelihood) ÷ (Time Delay × Effort):

- **Dream outcome:** "Stop leaking signed cases you already paid to acquire. Never lose another one silently."
- **Perceived likelihood ↑:** named CA-firm dollar-receipt case studies + the published CA Intake Leak Report (third-party-feeling proof) + the per-firm calibration report ("we agree with your own best judgment 90% of the time, and catch the ones you miss").
- **Time delay ↓:** first real leaked-dollar number within the hour (Leak Audit wedge); first rescued case within week one.
- **Effort ↓:** "plugs into your existing CallRail, zero workflow change, no new logins for your staff, a human approves every text."
- **Risk reversal:** capped 90-day guarantee denominated in *found* recoverable cases (not won cases — legally and practically clean) + BAA/NDA/confidentiality brief up front.
- **Price:** flat monthly, anchored as "less than one lost signable case a year." Never a percentage.

That is a Grand Slam offer a risk-averse solo PI partner would feel foolish declining.

---

## 8. Prioritized roadmap — what to improve, ranked (not built yet)

**P0 — the product must actually be what it claims, and must not lose the money it finds:**
1. Put the human-approved **SMS rescue action on the Desk leak card** (§4.1, Desk #2).
2. **Auto-harvest signed outcomes** (CRM reconcile + follow-up prompt + weekly confirm-your-saves) so ROI is never silently $0 (§4.1, Desk #6).
3. **Operator SMS approval UI** to replace the Node CLI (§5C) — required before scaling beyond the founding cohort.
4. **Alerting-on by default + ingest-failure classifier + unresolved-failures count** so a broken firm can't leak every call silently (§5C).
5. **Fix the real-call upload path** (service-role key hard requirement, client-side size pre-flight) (§5C).

**P1 — make value undeniable, fast, and habitual:**
6. **Leaked-Case Audit as the front-door wedge**, real number in under an hour (§4.2, §5D).
7. **Monthly Recovered Receipts statement, emailed**, denominated in $ + signed cases (§4.3).
8. **Denominate the whole UI in dollars + signed cases**; kill jargon/enum leakage; fix "Unrated + $25k" and the unsourced benchmark (§3, Desk #8/#12/#13).
9. **Fuse the two queues + auto-prefill triage from the read call** (§4.4, Desk #1/#9).
10. **Daily morning callback nudge** (SMS/email) as the habit loop; standing "today" strip on all-clear days (Desk #3).
11. **Mobile-fix triage** for phone-based intake staff (Desk #10).

**P2 — the moat and the category:**
12. **Per-firm calibration report** (the trust artifact) + resolve the **v2 cutover with published measured error rates** (§5A).
13. **Case-value / net-to-client / liability-probability prediction** at intake (the 10x engine, §5A).
14. **Two-way CRM sync** for the top 3–4 PI CRMs (§5D).
15. **Publish the CA PI Intake Leak Report** and own the intake-grade benchmark (§5E, §5G).
16. **Compliance-as-pitch:** BAA/NDA + confidentiality brief in the offer; advertise human-approved + all-party-consent design (§5F).

**Not now / risk-flagged:**
- The autonomous voice **"closer" as a co-equal identity** — most crowded, best-funded lane; enter as the *top of the safety-net funnel* later, not as a competing homepage.
- Any **"% of recovered fee" pricing** — fee-split / solicitation risk; do not ship without CA counsel.

---

## 9. What to re-research after the usage reset (Jul 17, 2pm PT)

The agents that died before finishing — re-run these directly (single-threaded, no nested fan-out):

1. **Competitive pricing + reviews** for Smith.ai, Ruby, Alert Communications, Nexa, Answering Legal, LEX Reception, Back Office Betties; AI-voice-intake (Rosie, Goodcall, legal-specific); legal CRMs (Lead Docket, Litify, CASEpeer, Clio Grow, SmartAdvocate); CallRail CI / Invoca / CTM; Eve/EvenUp & CaseGen. Confirm real numbers, PI-firm complaints, and build-vs-buy threat.
2. **PI firm buyer psychology / JTBD** — the emotional/social/functional jobs, buying triggers and objections, where they discover tools (PILMMA, GLM, CAOC, listservs), willingness-to-pay psychology.
3. **Speed-to-lead + intake conversion science** — verify the actual Lead Response Management numbers (not the memes), attempts-to-contact, after-hours and Spanish-language conversion cost, whether QA/coaching measurably lifts conversion and by how much.
4. **CA legal ethics deep-dive** — Rule 7.1–7.3 solicitation scope for re-engaging an inbound lead; Rule 5.4 / 6152 on any performance pricing; CIPA §632 consent language; AI-disclosure/UPL. Needs a real CA lawyer's sign-off before SMS scales.
5. **The internal-research mine** — synthesize ops/insights.md, decisions.md, backlog.md, prior deep-research rounds (PI triage, callback-flow, engine-v2, lead-response economics) so this builds on them.
6. **Scoring-engine deep audit** — calibration method, drift detection, confidence calibration, the ground-truth loop, and the full CA-law-currency review of the deterministic gates.

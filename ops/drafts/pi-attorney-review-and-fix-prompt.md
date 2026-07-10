# Intake QA — the PI-attorney's teardown + the fix prompt

Two parts: (1) exactly what a skeptical CAALA-member plaintiff trial lawyer would say is wrong with the system, grounded in the real rubric (`scoring/system-prompt.md`) and gold examples; (2) the Claude Code prompt to fix it.

---

## PART 1 — As the attorney you're selling to: everything I'd say is wrong

### The core defect: you score intake as a CONVERSION funnel. I run it as a TRIAGE operation.
- **The receipts:** Category B "Conversion Behaviors" = **25% of the score** (`system-prompt.md:75`). Your flagship output `lost_signable_case` + `revenue_at_risk` (§3D, lines 55–64) treats *any* signable-but-unsigned call as lost money. Your **exemplary** gold call (gold-example-2, score **94**) earns B1=100 for *"I can text you our agreement right now and you can sign it on your phone while we're on the line."* Gold-example-1 scores a strong commercial-truck case **30/intervention** and flags **"$45,000 lost"** specifically because *"the ask never came."*
- **Why I object:** my single most important decision at intake is which cases NOT to take. Your product has **no concept of a case I correctly declined.** It only ever flags UNDER-conversion, never OVER-conversion. The *signed dog* — the minimum-limits, low-property-damage, disputed-causation file that eats two years for a nuisance fee — is invisible to you. You'd score that intake a **success.** That single fact tells me your scorer optimizes for the wrong objective, and it makes me distrust the whole "independent analyst of record" positioning.

### The MIST / property-damage blind spot — and it's your headline example
- Your rubric screens F1 liability, F2 injury, F3 collectability, F4 statute (§3A) — but **nothing** for impact severity / MIST-risk / causation defensibility. A low-property-damage rear-ender with soft-tissue injury is the archetypal **MIST** case carriers manufacture (a ~$1,000 PD threshold) to lowball and force to trial. Respected plaintiff lawyers (Miles Cooper, *Plaintiff* mag) take MIST *"reluctantly"* or refer out.
- So when an auto-generated scorecard tells me **"the one expensive failure was asking about vehicle damage,"** I conclude your analyst doesn't understand case economics — the intake person asking for photos may be running a rational MIST screen.
- **Your own logic hole:** you call the case "signable" *while attacking the firm for gathering the one variable (impact severity) that determines whether it's a clean case or a MIST trap.* You assumed the conclusion. "Treated injury" doesn't rescue you — MIST cases *by definition* have treated soft-tissue injuries.

### "Signable" ≠ "worth signing": you screen coverage EXISTENCE, not ADEQUACY
- Credit where due: your **engine** does ask about coverage (F3 `insurance_collectability`, A4 recovery-source). So "no collectability dimension" is true of the *Studio scorecard* but **not** the engine.
- But your signability default (line 46) is *"identifiable at-fault party, real injury with treatment, plausible recovery source, within statute."* A **$15k minimum-limits policy is a "plausible recovery source"** — so a min-limits soft-tissue rear-ender = `likely_signable` → your alert fires *"$12k at risk."* Min-limits on a MIST impact isn't worth the file. You conflate **coverage exists** with **coverage makes this economically viable.** I checked: no policy-limit *adequacy* screen exists anywhere in `scoring/`.

### Your dollar figure is gross fee at a flat average — I think in NET
- `revenue_at_risk = firm_average_fee_for_case_type` (§3D, lines 61–62). A marginal min-limits case gets flagged at the **average** mva fee ($12k), not its real ~$3–5k fee, and never nets the **cost** of the file (fee-earner hours, advanced costs). A false *"you lost $45k"* is exactly what you warn against (lines 64, 128) — but your definition *manufactures* inflated losses on precisely the cases I'd rationally decline.

### The exemplar rewards the settlement-mill close; it penalizes disciplined vetting
- B1 100 = *"e-sign sent on-call, assumptive framing"* (line 76). B1 0 = *"No ask on a likely_signable call."* A firm that says *"this looks promising — let me pull the police report and confirm limits before we sign you"* gets a **zero** on 35% of the conversion category. You've enshrined *"sign them on the phone"* as best practice. That's one legitimate style (high-volume/turnkey), **not consensus** — to a selective firm it reads as coaching my staff to sign before they've vetted.
- *"No ask on needs_development = 0"* (line 76) actively pushes signing **before the case is developed.** Develop-before-sign is frequently the correct move.

### Where you're RIGHT (so you know this is fair, not reflexive)
- **Speed-to-lead:** near-total consensus, your strongest ground.
- **The six critical fails** (SOL/CF-1, UPL/CF-2, guaranteed-outcome/CF-3, represented-caller/CF-4, hostile/CF-5, adverse-statement/CF-6): real malpractice/ethics exposure, well-drawn. And gold-example-3 **correctly defers** on the AC Transit government-entity case (`needs_development`, no false alert) — that discipline is genuinely good.
- **The empathy rubric** (OARS/MI reflections, orienting statements, peak-end, pacing): evidence-based and defensible.
- *"Never let the caller's case quality bleed into the rep's behavior scores"* (line 131) — good principle. You just don't apply the **converse**: you let *conversion* bleed into the case-quality alert.

### Smaller tells a sophisticated buyer clocks
- **E2 scores intake on "how did you hear about us"** (line 93) — a marketing-attribution KPI, not a case-quality or client-service behavior. It reveals the tool's lead-gen DNA.
- The whole deliverable is **"Missed-Revenue Statement" / "leak"** — one-directional (money left on the table), with no "cases you shouldn't have signed" counterpart.
- The **Studio scorecard's six dimensions** (reachability, human-vs-barrier, rapport, legal-danger, capture, follow-up) **drop** the engine's collectability screen — the document I actually receive is a *lossier, more conversion-flavored* projection than the engine underneath.
- Your default `minimum_case_criteria: default` + gold config `esign_on_call_enabled: true, same_call_sign_policy: encouraged` means you calibrated on a **high-volume firm.** None of your three gold examples is a marginal MIST case where declining is correct — so the rubric has *never been tested* against the case I most need it to get right.

### The segment mismatch, named
High-volume / lead-gen / turnkey firms (Lawmatics e-sign-at-first-contact) **do** optimize conversion — your rubric matches them. The trial-lawyer / case-selection firms (CAALA, CAOC, OCTLA — who read *Advocate* and *The Gavel*, whom you want to publish among and sell to) optimize **inventory quality** and treat aggressive conversion with suspicion. **You are selling to Group B with Group A's rubric.** Fix that before it fixes itself in a bad meeting.

---

## PART 2 — The Claude Code prompt (paste into Claude Code at the repo root)

> Start by exploring; do not change scored logic until you've completed the audit and I've confirmed the plan. The scoring engine is marked FROZEN in CLAUDE.md — treat lifting that freeze as a deliberate, reviewed "rubric v2," not a silent edit.

**Role & objective.** You're working in the `intake-qa` repo. A sophisticated plaintiff-trial-lawyer buyer (CAALA/CAOC-type, case-selection-conscious) has identified that the intake scoring system optimizes for **conversion** when the target customer optimizes for **triage** (signing the good cases *and* declining the money-losers). Rework the scoring so it scores intake as a triage operation, not a conversion funnel — without breaking what's genuinely good (the critical-fail scan, empathy rubric, speed emphasis).

**Milestone 1 — audit only, then STOP for my confirmation.** Read and report: `scoring/system-prompt.md` (the frozen rubric), all three `scoring/gold-example-*.md`, `scoring/firm-config-template.md`, `web/src/analysis/fee-value.mjs` + `leak-taxonomy.mjs`, the leak-report/statement composition + copy (`web/src/lib/leak-report/*`, `web/src/lib/documents/*`), the Studio rubric + mapper + scorecard (`web/src/lib/studio/{rubric,mapper,scorecard-content}.mjs`, `web/src/app/studio/scorecards/*`), and the public positioning (`web/src/lib/site-constants.ts`, the marketing pages, the letter). Confirm exactly where each defect below lives, and flag anything I've missed. **Do not edit scored logic yet.** This is a rubric-philosophy change with real legal/economic stakes — it must be reviewed by a PI attorney before it ships; treat that as a hard gate.

**The changes (in priority order), as a reviewed "engine v2" — keep v1 intact for comparison and re-validation:**

1. **Add case-economic viability to signability.** In §3B, distinguish coverage EXISTENCE from ADEQUACY. Introduce a firm-config damages/limits threshold and a MIST-risk / impact-severity / causation-defensibility factor. A case with clean liability + treated injury but **low property damage, minimum limits, or a causation red flag** is classified **"marginal / attorney-judgment,"** NOT `likely_signable` — and declining it is a **defensible business decision, not a leak.** Never let `lost_signable_case` fire on an economically marginal case.

2. **Make the flagship output two-sided.** Today the only alert is the *missed* signable case. Add the counterpart — a **"questionable sign / over-conversion" signal** when intake signed or hard-pushed a case carrying a coverage-adequacy or causation red flag. The product must speak to the *signed dog*, which is the selective firm's equal-or-greater fear.

3. **Fix `revenue_at_risk`.** Net of an estimated file cost and **capped by known/likely policy limits**, not the flat gross case-type average; conservative and clearly bounded; never fire on a marginal case. Keep the existing "false alert destroys credibility" discipline — extend it to economic marginality.

4. **Fix Category B ("the ask", line 76).** Stop making on-call e-sign the *universal* 100. Make the top score **context-appropriate**: reward a same-call sign where the firm's policy is that AND the case is clean; **equally reward a disciplined "we'll vet, then sign" with a specific next step** where vetting is warranted (marginal cases, missing liability/limits). Remove the penalty for *not* signing a case that shouldn't be signed on the spot. Consider reducing Category B's overall weight relative to qualification/triage.

5. **Add a firm-segment posture to FIRM CONFIG** (`case_selection_posture: high_volume | selective`) that shifts the weights/anchors — a high-volume firm legitimately wants conversion; a selective firm wants triage accuracy. The rubric should honor both instead of imposing the high-volume worldview on everyone. `esign_on_call_enabled` / `same_call_sign_policy` already exist — build on them.

6. **Re-anchor the gold examples.** Re-score the three existing golds under v2, and ADD a fourth: a **marginal low-PD / min-limits soft-tissue rear-ender that intake correctly develops-then-defers (or declines),** scored WELL — so the calibration set finally contains the case the current rubric gets wrong.

7. **Surface triage into the Studio scorecard.** Add a **"Coverage & Collectability"** dimension and a **"Case-selection appropriateness"** signal to `web/src/lib/studio/rubric.mjs` (mapped from the engine's F3/A4 + the new viability layer), so the handed-to-firm document reflects the engine instead of a conversion-flavored subset.

8. **Kill the vehicle-damage "expensive failure."** In the Studio narrative generator (`mapper.mjs`), NEVER frame "asking about impact/damage/photos" as a failure; only surface unambiguous process failures no PI attorney defends (no callback capture, hours-late response, rude/dismissive, blew off a clearly-strong case). Add a guard/test.

9. **Reframe the positioning + report copy** from "missed revenue / conversions left on the table" to **"mis-triage: the good cases you lost *and* the marginal cases you're carrying."** This is public/marketing → stage as a PR, route the substance past the PI-attorney advisor, keep it flat-fee/no-outcome-claim compliant. Drop the E2 "how did you hear about us" item's prominence, or reframe it as ops-only, not a client-quality behavior.

**Validation & guardrails.** After v2: re-score all golds + the new marginal case; get a PI-attorney (Yang or a retained plaintiff-side advisor) to review the rubric philosophy *before* it scores a real firm's calls; if you have expert scores, report QWK v1-vs-v2. Do not touch `main` for the public/copy changes without a PR. Keep the critical-fail scan, empathy rubric, and speed emphasis — those are correct. Commit per change; build + tests green.

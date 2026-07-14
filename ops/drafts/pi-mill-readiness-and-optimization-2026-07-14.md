# IntakeQA → PI Mill Readiness & Full Optimization Plan
**Date:** 2026-07-14
**Trigger:** Roberta Yang asked whether to approach high-volume PI mill firms with real call volume.
**Method:** 7 parallel research streams (3 codebase-mapping, 4 deep web research w/ ~30 sub-agents) covering the scoring/triage engine internals, firm-facing UI, prior strategy drafts + live copy/pricing, PI-mill operations & buying, the competitor landscape, and mill-specific objections/fit. Cross-checked against `compliance-invariants`.

---

## VERDICT

**Not ready to market to a PI mill today — but the gap is packaging, scale, and positioning, not the intelligence.** The core engine is arguably *more* mill-ready than the product wrapped around it. Three sentences:

1. **The intelligence is real and differentiated.** A deterministic, CA-statute-grounded, citation-guarded merit engine calibrated on a *high-volume* firm is genuine white space — every intake-moment competitor (Supio, EvenUp, Lead Docket LeadsAI, predict.law, Perspective AI) is LLM/black-box, and every deterministic tool (the CRMs) is law-blind.
2. **The product is a one-firm, one-operator, CA-pilot concierge tool.** Single shared login, no roles, unpaginated `.map()` lists, serial ~95s/call scoring (<900/day ceiling), mock-only CRM write-back, Spanish forced to human review, 4MB upload trap, checkout hard-disabled, Ali hand-reviewing 100%, capacity ceiling of 8 audits/month. None of that survives contact with a firm doing thousands of calls/month.
3. **The positioning actively repels a mill.** It sells selection discipline and independence to "solo/small CA firms," pitches "send us 10 calls," and frames triage as *screen harder* — but a settlement mill signs broadly, near-independent of merit (Engstrom/Stanford). You'd be selling a diet plan to someone who came in for a bigger plate.

**The move is not "make the current product bigger." It's re-aim the same engine at the one thing a mill actually feels — recovered signed cases they already paid to acquire — and rebuild the surface (scale, multi-seat, integrations, Spanish) to survive volume.**

---

## THE ONE REFRAME THAT CHANGES EVERYTHING

**Do not sell a mill "better case selection." Sell "recover the signed cases you already paid for," and reposition triage as disposition-routing, not gatekeeping.**

- Mills sign volume and sort later. Engstrom (Stanford) documents settlement mills bargain against past "going rates," "relatively independent of merit-based assessments." A firm needing 350–500 signed cases/month to break even does not want a tool that says "decline more."
- So **lead with the QA/recovery half** (the leaked, signable, dollar-tagged case that walked out), which is the pain a mill *feels* every day — 95%+ of intake calls are never reviewed; 28–35% of calls go unanswered; 60%+ after-hours miss rate.
- **Reposition merit-triage as "route already-signed volume to its highest-net disposition."** Triage genuinely bites a volume firm in exactly four places (sell here, not "say no"):
  1. **Liens / net-to-client** — Medicare/Medi-Cal liens can eat 50–100% of a recovery; flagging net-negative cases saves real money on files they'd otherwise work for free.
  2. **Attorney capacity** — at 60–70 litigation / 250+ pre-lit files per attorney, *which signed case to invest in* is a live dollar decision.
  3. **CA referral-fee routing** — California uniquely allows pure referral fees (25–50% of net, Rule 1.5.1); tagging "keep vs. refer-out-for-a-fee" turns overflow into revenue.
  4. **Marketing-spend allocation** — merit/value carried back to lead source tells them which channels produce *signable, collectible* cases. This is the attribution insight incumbents leave on the table.

---

## WHAT'S ALREADY RIGHT — KEEP AND LEAN IN

- **Deterministic CA Law Engine** (`ca-gates.mjs`, `statutes.mjs`, gates G1–G4, decision table) — the moat. Transparent + citable is the defensible edge vs. black-box EvenUp/Supio. Legal-AI still errs ~1 in 6 (Stanford HAI); ~1,348 documented hallucination cases by 2026. "We don't hallucinate your intake" is a *gift* of a story.
- **Citation guard** ("no citation, no claim," Levenshtein 0.9) — this is what lets you make dollar claims a mill's COO will trust.
- **Signable-Save-Rate scorecard** — the right north-star metric; nobody else grades a firm's *own* staff on case-value saved.
- **Money-first desk** (leak-red hero, callback queue, fee chips gated on confidence) — the correct emotional frame; keep the design law.
- **Flat pricing** — not a limitation, a legal necessity (see compliance). Keep it and make it a *feature*.
- **Engine v2 already has `case_selection_posture: high_volume | selective`** and is calibrated on a high-volume firm — the mill posture is half-built. It's just shadow/unvalidated.
- **Bilingual fact-capture in v2** (false-friend guard, lay-Spanish clinical normalization) — genuinely sophisticated; it's gated, not missing.

---

## WHAT MUST CHANGE — BY LAYER

### A. Positioning & copy (word-level)
- Kill the small-firm signals a mill's buying committee will reject: "solo founder… will this be around in a year?" (FAQ), "all five founding firms," "send us 10 calls," "make *her* a champion" (single-coordinator mental model).
- Replace the category line. Today: *"the independent intake desk for personal injury firms."* For a mill, lead the recovery frame: the money already spent to make the phone ring is sunk at intake — this recovers the signable cases that leaked.
- Reframe from **grade → recovered case**. Every headline should name a dollar-valued recovered signed case, not a letter grade. ("Call #4417, Sat 9pm, clear-liability rear-end, went to voicemail, now at the firm across town — ~$14K in fee.")
- Add an **enterprise/volume surface** (multi-office, intake-department language, "additive to your Filevine/CasePeer/Litify — no migration"). The single most deal-de-risking sentence is "sits on top of your existing stack."
- Make **flat pricing a selling point**: "your fee is the same whether we surface zero cases or fifty — we're never a cut of your fee, which is exactly why we can grade you honestly and why it's compliant under CA Rule 5.4."

### B. Pricing & packaging
- **Re-enable checkout** (currently `CHECKOUT_DISABLED_DURING_BETA = true` → hard 503). A mill cannot pay today.
- **Add tiers above 800 calls/mo.** Core caps at 400, Pro at 800; mills run thousands. Need Enterprise/volume tiers (flat, by call band) — WTP is anchored by CPA ($2,500–$3,000/signed case), not tool cost, so a tool recovering 1–2 cases/month is worth thousands. Realistic band: $300–$1,500/mo small, materially higher flat for mill volume.
- **Money-back / ROI guarantee denominated in *found* cases** ("if we don't surface ≥X recoverable signed cases in 60 days, you don't pay") — the *compliant* substitute for the % -of-recovery pricing a mill will instinctively ask for. Guarantee is currently suspended for beta; design the launch version now.
- **Never** per-case, per-signed-client, per-recovered-dollar, or % pricing — that is textbook capping/fee-split (B&P §§6151–6152, Ins. §750, RPC 5.4, 2026 ABS ban BPC §6156). §6154 *voids the firm's retainers and divests fees* on capper-procured contracts. This is the hardest bright line in the whole plan.

### C. Scoring engine
- **Validate v2 and flip it (or keep v1) — but resolve the split.** Live v1 emits `revenue_at_risk.amount_usd` (dollars at intake); shadow v2 forbids dollars. That's an internal contradiction the compliance layer would catch. Decide the dollar-at-intake stance and make one engine firm-visible. v2 flip is gated on 100–150 dual-labeled transcripts, QWK ≥0.70, PI-attorney + Yang review — start collecting that corpus from mill volume immediately (mills *are* the corpus).
- **Ship the `high_volume` posture as the default for mill accounts** — thresholds that reward the on-call close, not disciplined vetting.
- **Fix throughput before onboarding volume** (see G) — the engine's *intelligence* scales; its *pipeline* does not.
- **Expand case-type coverage.** No mass tort / class action / sexual-abuse-revival (AB218) — big mill revenue lines that currently fall through to a neutral `other_pi` prior *silently*. At minimum, flag unknown types instead of degrading silently.

### D. Auto-triage
- Keep it deterministic and instant (the `triage-live.mjs` O(1) design is correct and scales).
- **Reframe output for volume**: disposition-routing (sign/develop/refer-out-for-fee/lien-watch), not accept/decline. Add a **lien / net-to-client gate** and a **refer-out-for-a-fee** disposition (CA Rule 1.5.1) — the two triage outputs a mill will actually pay for.
- Auto-triage-from-call currently hard-codes `sol_urgency:"unknown"` and `flip_fact:null` (no reliable incident date from a transcript) — fine, but surface it as "confirm filing clock" rather than a blank.
- Carry triage value back to **lead source** for spend-allocation reporting.

### E. UI/UX (the biggest build)
- **Roles.** `firm_members.role` exists in schema but is *dead* (zero reads). Implement agent / manager / admin. A mill has a floor of interchangeable agents + an intake director + a COO — all get the same shared login today.
- **Per-agent identity + assignment** on the callback queue. Today it's a shared mutable board; nobody owns a callback. Add ownership, "my calls today," and reliable rep attribution (uploads carry no `rep` — fix ingestion).
- **Volume ergonomics everywhere.** Every firm list is an unpaginated, unfiltered, unsortable `.map()` (desk queue, `/desk/calls`, triage queue capped at 100 with no "load more"). Add pagination, search, date/case-type/status/agent filters, sort, and bulk actions (assign, dispose).
- **Manager dashboards.** Add time-series (week/month trends), per-agent leaderboards, per-agent recovered-revenue, and **CSV/export** (there is none anywhere in the firm UI). A mill manager buys on the dashboard.
- **Self-serve, multi-seat onboarding.** Today provisioning is 100% founder-operated, one account per firm, manual CallRail key entry. A mill needs bulk seat provisioning and SSO-ish team setup.
- **Spanish staff UI.** The engine is Spanish-aware but the desk/triage/coaching/openers are English-only (no i18n; Spanish letter is "scaffolded, not published"). A bilingual mill floor needs the *operator* UI localized, not just the transcripts.

### F. Integrations
- **Build real CRM write-back.** Field mappers exist for Lead Docket/Filevine/Litify/Clio but the *only* connector is `createMockCrm` — no transport layer. Two-way sync is how a mill harvests wins and how you sit "on top of the stack." Priority order by mill prevalence: CallRail (done), Lead Docket/Filevine, Litify, CasePeer, SmartAdvocate.
- **CallRail is real** (per-firm HMAC, encrypted secrets) — good. Harden the silent-failure mode (a wrong per-firm secret leaks/drops calls quietly).
- Missing entirely and worth scoping: CasePeer (no mapper), Ringba/pay-per-call (lead-buyer mills), power dialers, text-to-sign.

### G. Architecture / scale
- **Serial scoring is the hard ceiling.** `scoreUnscored` processes calls in a plain `for` loop, ~95s each, *two* LLM calls (v1 + v2 shadow) + polling transcription → ~900 calls/day/worker theoretical max. A mill blows past this. Needs: concurrency/batching, drop the double-LLM (pick one engine), webhook-based transcription (AssemblyAI is polling today).
- **Inngest is a scoring SPOF** with only a 15-min cron fallback — no queue-depth management or autoscaling.
- **4MB Vercel upload trap** — real-length calls only work via the Supabase signed-URL path (200MB) which needs `SUPABASE_SERVICE_ROLE_KEY`; without it "a real call cannot be uploaded." CallRail ingest bypasses this, but the upload path is a silent failure.
- **Rate limiter is in-memory, single-instance, fails open** — useless across serverless instances at scale.
- **No bulk/batch import** for the scoring path.

### H. Bilingual
- Wire the Phase-2 Spanish scoring additions (`language_match`, `cultural_rapport`) that are `TODO(phase2)`.
- Get v1 (or the flipped v2) to fully score Spanish instead of down-scoring to `scored:"partial"` and force-routing to human review behind the `spanish_module` flag. A bilingual mill's Spanish volume can't hit a human-review bottleneck on every call.
- The **24/7 bilingual after-hours capture** is a genuinely strong wedge (CA ~40% Latino; Walker/Los Defensores spends $23M+/yr in Spanish media, 200k+ contacts/yr) — but if you build a bilingual *closer*, keep it **inbound-only** (RPC 7.3 bars real-time solicitation of un-signed victims) and market it with Census/Pew/DMV/Walker data only, never the agency conversion stats.

### I. Compliance guardrails (non-negotiable)
- Flat SaaS pricing decoupled from outcome (capping/fee-split).
- Any AI voice/SMS contact is **inbound-triggered only**, responding to people who already contacted the firm (RPC 7.3).
- Triage output is **internal attorney decision-support**, never client-facing legal advice (UPL, BPC §6125–6126; "not legal advice" disclaimer; lawyer decides).
- **BAA-ready before the first meeting** — PI call recordings are PHI; a vendor can't legally touch them without a signed BAA. Come with BAA + CCPA service-provider + no-model-training/no-resale terms pre-drafted. Firms negotiate BAA 60–70% of the time *before* signing.
- **Preserve fraud-indicator flags**, never suppress (PC §549/550, Ins. §1871.7 qui tam exposure).
- **Do not republish vendor-marketing stats** as product claims: "78% hire first attorney," "60–70% Spanish leads lost," "<12% bilingual," "400% speed lift," "$109B lost." Use them to frame the buyer's own math; publish only Clio, Hennessey 2025, CallRail, MIT/InsideSales, WordStream, First Page Sage, Census/Pew/DMV.

### J. Go-to-market / the wedge
- **Free Leak Audit on the firm's own recorded calls**, returning named, dollar-valued recovered signed cases — the sharpest, most evidence-backed, zero-switching wedge. Raise `AUDIT_CAPACITY` (currently 8/mo) and remove the 100%-Ali-review bottleneck for volume.
- Funnel: **Free Leak Audit → flat subscription + ROI guarantee → single-office / single-pod pilot with a recovered-signed-case scorecard → expand** (≈70% of enterprise legal-SaaS deals expect a pilot; pilots expand 10–20×).
- **Champion = Director/Manager of Intake** (a real, actively-hired role at Sweet James, Thompson Law, Barzakay) + **COO**; owner keeps veto. Sell recovered-revenue ROI + documented peer proof.
- **Endorsement channels**: PILMMA (formally vets vendors), Chris Dreyer's Personal Injury Mastermind / PIMCON, Filevine LEX Summit (1,300+, open to prospects). These move mill buyers.

---

## PRIORITY SEQUENCE (what to do, in order)

**P0 — can't sell without these**
1. Re-enable checkout + add volume/enterprise flat tiers above 800 calls.
2. Fix scoring throughput (concurrency, single engine, webhook transcription) + the 4MB upload trap.
3. Roles (agent/manager/admin) + per-agent identity/assignment + reliable rep attribution.
4. BAA + CCPA service-provider terms drafted and ready.
5. Reposition copy: recovery-first, volume/multi-office, "additive to your CMS," kill small-firm signals.

**P1 — makes it competitive at volume**
6. Pagination/search/filter/sort/bulk on every firm list.
7. Manager dashboards: time-series, per-agent leaderboards, recovered-revenue, CSV export.
8. Real CRM write-back (Lead Docket/Filevine first, then Litify/CasePeer).
9. Resolve v1/v2 dollar-at-intake contradiction; validate v2; ship `high_volume` posture.
10. Triage reframe: disposition-routing + lien/net-to-client gate + refer-out-for-fee.

**P2 — the differentiated wedge**
11. Free Leak Audit productized for volume (raise capacity, remove Ali-100% bottleneck).
12. Spanish staff UI (i18n) + full Spanish scoring (un-gate, wire Phase-2).
13. Mass tort / class action / AB218 case-type coverage (or at least flag unknowns).
14. 24/7 inbound-only bilingual after-hours capture (if pursuing voice).

---

## WHAT I DELIBERATELY DO **NOT** RECOMMEND

- **Do not make the autonomous bilingual voice closer the headline.** That lane is the most crowded and best-funded: LegalClerk.ai ($400/mo flat, PI-built, bilingual), CaseGen.ai, Eve/"Jenny" ($103M raised, launched Oct 2025), Supio Voice Agent, EvenUp Voice Agent. IntakeQA's edge is the *deterministic QA + recovery + CA-merit* triad no one owns — not being the 8th bilingual voice bot. Keep the closer as an inbound-only, human-default experiment behind its flags.
- **Do not adopt % -of-recovery / per-case pricing**, no matter how hard a mill pushes — it's a crime in CA and voids their retainers.
- **Do not pitch triage as "sign fewer / better cases"** — it fights the mill's core economic model.
- **Do not republish the punchy vendor stats** — they won't survive the citation guard.

---

## HONEST CAVEATS
- Several load-bearing "pain" figures (miss rates, Spanish loss %, speed-lift multipliers) are single-vendor marketing (mostly CallRail). Usable to frame the buyer's own math; not publishable as product claims.
- v2 is unvalidated in production — the "deterministic accuracy" story needs the measured false-alarm rate before it can headline, per the engine-v2 flip-copy gate.
- Four operational data gaps came back thin across ~120 searches (intake-staff-to-attorney ratio, intake-role turnover %, "% who say yes but never sign," how many PI firms actually score intake calls) — these likely need primary interviews, and a mill pilot would generate exactly this data.

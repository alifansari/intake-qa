# IntakeQA Gameplan: Current Product → The Independent Intake Audit

2026-07-13. The transformation plan. Grounded in: two code-level audits (full surface cut/keep/simplify; engine trust-loop + moat), the reliability audit, the Desk UX audit, verified market data, and the `compliance-invariants` skill (supreme). Founder decision locked: **stay independent, never contact a lead.** Research/plan only. Changes nothing yet.

Companion research report: `intakeqa-irresistible-improvement-research-2026-07-13.md`.

---

## The product in one paragraph

The independent intake audit for California PI firms. The QA department a small firm can't afford to hire. It listens to every intake call, grades case merit and value against California law, and surfaces the signable cases the firm's own staff let slip, each with the recording, the dollar range, and the one fact that would have flipped it. The firm's own people win them back. IntakeQA never contacts a lead, never sells leads, never takes a cut. The two numbers it governs: the firm's **Signable-Save-Rate trend** (proof it works) and **IntakeQA's own calibration accuracy** (proof the number can be trusted).

## The six-step loop everything serves

Connect → Audit → Surface the leak → Prove it → Improve it → Benchmark. If a screen or module doesn't serve this loop, it's cut.

## The one reframe that changes everything

Sell the recovered signed case, not the score. Denominate the whole product in dollars and signed cases. (Compliance note: dollars are always ranges with stated assumptions and a confidence tier, never point figures or guarantees — §IV.)

---

# THE SEQUENCE (why this order)

Build the credibility spine and stop the silent failures first, because an audit product that publishes an n=3 accuracy rate or silently drops a firm's calls is worse than no product. Then make the front door and daily loop real (activation + habit). Then cut the weight (the simplification is mostly subtraction). Then lay the moat. The offer/positioning corrections thread through all four.

---

## MOVEMENT 0 — Stop the bleeding (reliability + honesty). Nothing else matters if the instrument lies or goes blind.

0.1 **Turn founder alerting on and close the silent-ingest holes.** Today alerting is off by default (`EMAIL_ENABLED` unset → alerts render to an ephemeral file and email no one), and a firm with a wrong/absent CallRail secret can leak *every call* with zero alert (`no_secret` matches no classifier; sub-threshold signature failures never trip the 3/hr threshold and never retry). Fix: alerting-on as a hard prod requirement with a red "you are running blind" banner on `/admin/status`; add an ingest-blocker classifier (`messaging/founder-alerts.mjs`) that fires on the first ingest failure per firm per day; add a standing "unresolved failures" count that survives a missed email. *Source: reliability audit.*

0.2 **Fix the accuracy-honesty defect (also a §IV compliance requirement).** `calibration-snapshot.publishedFalseAlarmRate()` returns a real percentage even over 3 seeded demo calls. Never publish a rate without **n, date range, % excluded/unknown, a minimum-n gate (suppress below ~n=30 resolved), and a Wilson confidence interval.** `dataQuality()` already computes the hole; surface it next to the number. *Source: engine gap #2; compliance §IV ("publish the false-alarm rate; do not hide it").* 

0.3 **Fix the real-call upload path.** The 4MB cap without the service-role key means a real 30-minute call can't be uploaded at all, and the friendly error never renders (body dies at the platform edge). Make storage mode a hard prod requirement with a status-page check; pre-flight file size client-side. *Source: reliability audit.* (Env/secrets change → stage per §VII, Ali presses the button.)

0.4 **Bounded retry on failed calls + firm-facing surface.** A transient AssemblyAI/Anthropic blip marks a CallRail call `failed_scoring` forever and it appears nowhere the firm looks. Add 2-attempt retry before terminal; surface failures on the desk. *Source: reliability audit.*

---

## MOVEMENT 1 — Build the credibility spine (the whole "audit authority" claim rests here)

1.1 **Close the ground-truth join. THE FIRST BUILD.** The reconciliation stack (`reconcile.ts`, `metrics.ts`, `calibration-snapshot.ts`) is wired only to v1's binary `lost_signable_case` — the engine being retired. The v2 disposition engine and the `/desk/triage` grade being sold as the authority have **no outcome loop at all**, even though `triage_cases` already stores `verdict_json` (grade + disposition) alongside terminal `status` (`signed | declined | referred`). Build `triage-reconcile.mjs` mirroring `reconcile.ts`, keyed on `disposition × terminal_status`, producing a 4×N confusion matrix. **~1 day on data already persisted.** *Source: engine gap #1 + spec D1.*

1.2 **Ship the Calibration Report artifact — the trust asset.** Per firm and in aggregate:
- **Panel 1 (headline):** "When we said SIGN, you signed 88% (n=41). When we said PASS, you passed 91% (n=63)…" plus the 4×4 confusion matrix with the **wrongful-decline cell (we said DECLINE, you signed elsewhere) 10×-weighted and named** — the malpractice-adjacent error.
- **Panel 2:** monotonicity (`signRateByBand` — higher grades sign strictly more).
- **Panel 3:** confidence reliability diagram (predicted tier vs observed precision, 45° line).
- **Panel 4:** drift strip (precision + disposition-mix over rolling months).
- **Panel 5:** honesty footer (% unknown, n excluded, Wilson CIs, "CA law engine current as of [date], reviewed by [named]").
This is the artifact that converts "AI I don't trust" into "a second opinion that agrees with my own best judgment and catches what I miss." *Source: engine spec D1; every claim traces to data per §IV.*

1.3 **Make outcome capture one tap, and backfill.** The loop is only as good as outcome capture. Add "Did they sign? (us / elsewhere)" as a one-tap step on the existing callback queue; add `outcome_recorded_at`, `signed_where`, `decline_reason` to `triage_cases`. This also feeds the Recovered Receipts (Movement 2) and the win-harvest that stops ROI from silently reading zero. *Source: engine spec D1; Desk audit #6.*

1.4 **Stamp provenance on every verdict:** model id + system-prompt hash + engine version, for post-hoc drift attribution. Not currently stamped. *Source: engine spec D1.*

---

## MOVEMENT 2 — Make the front door and the daily loop real (activation + habit)

2.1 **The free Leaked-Case Audit as THE front door.** Merge the duplicate public funnel `/demo` into `/audit` (audit already "mirrors the demo upload mechanic"). A firm drops 90 days of calls and sees their real leaked-dollar number in under an hour, always with the **five worst-lost calls on tape**. This is the wedge, the demo, and the aha in one. (Compliant: their own data, cited spans, tiered confidence, ranges not guarantees.) *Source: cut-list "spine #1"; Desk audit #4; irresistible-SaaS Play 3/7.*

2.2 **Fuse the three worklists into one.** There are actually three overlapping "signable case walked, staff call it back" queues: `desk/` "Call these back" (recording-derived), `desk/triage` "Call these first" (hand-typed), and `studio/rescue`'s CRM dead-lead conveyor. Converge all three onto **one recording-derived, auto-triaged worklist**. Auto-triage from the recording inside `ingest/score-worker.mjs` so staff confirm a grade in one tap instead of keying ~15 fields; retire the manual `TriageConsole` form; merge `triage-view.mjs` into `queue-view.mjs`. *Source: cut-list "spine #3" + Simplify #1; Desk audit #1/#9.*

2.3 **Monthly "Recovered Receipts" email.** From the existing `lib/ledger` engine. One screenshot-able, partner-forwardable page: "14 signable cases slipped past your intake this month and would have gone silent. You've won back 6 = ~$90k in projected fees, here they are with the tape." **Attribution rule (keeps it honest and independence-safe): only ever claim cases the firm had NOT already actioned** — the audit trail shows no callback logged before the flag. (Compliant: estimates with assumptions + confidence, cited, never a guarantee.) *Source: cut-list "spine #2"; irresistible-SaaS Play 2; compliance §IV.*

2.4 **The near-real-time silent-case alarm — to the OWNER, never the lead.** The moment a signable call ends with no callback logged, ping the firm owner: "signable ~$45k auto case, no callback scheduled, 4 minutes ago." Turns the 5-minute speed-to-lead window into an independent alarm and moves the product from retrospective report to live safety net — still perfectly independent (it alerts the customer, not the claimant; not TCPA outreach). *Source: outside-the-box; compliant under §III (firm-directed, not claimant-directed).*

2.5 **Denominate everything in dollars + signed cases, and de-jargon.** Kill enum/legal leakage for non-lawyer intake staff ("value tier", "MIST", "dram shop", "decline with grace" rendered raw); never pair a dollar claim with an "Unrated" badge; define "Signable-Save Rate" in one plain sentence at the top of the scorecard; source the benchmark or reframe as "firms like yours in our data"; show the "$X on the table" derivation on demand and let firms tune their own average fee inputs. *Source: Desk audit #5/#8/#12/#13.*

---

## MOVEMENT 3 — Cut the weight (the simplification is mostly subtraction)

3.1 **Delete dead code now (zero risk).** The fully-orphaned pre-one-screen-desk chain: `src/components/triage-queue.tsx`, `evidence-drawer.tsx`, `report-view.tsx`, `what-if.tsx`, `category-bars.tsx` (0 real importers). Also `.next.bak-panic/`. Reconcile or delete the legacy `src/lib/desk-nav.ts` 6-tab list that contradicts the one-screen desk. **Do NOT cut `.engine/`** — despite looking like a stale mirror, `engine-root.mjs` proves it's the vendored runtime copy Vercel traces into `/var/task/.engine`; cutting it breaks scoring in prod. *Source: cut-list (E).* 

3.2 **Mothball the outbound-to-lead machinery** (off-strategy the moment you chose independence): `messaging/send.mjs` (the real Twilio chokepoint) + `draft.mjs`, `inbound.mjs`, `handoff.mjs`, `templates.mjs`, `sla.mjs`, `cli.mjs`, `outcome.mjs`, `dropbox-sign-verify.mjs`, `digest-links.mjs`; routes `webhooks/twilio` and `webhooks/dropbox-sign`; the Twilio and Dropbox-Sign deps/env. **Critical: `webhooks/dropbox-sign` does double duty — it also handles beta-NDA signing via `beta/nda.mjs`. Extract the NDA flow BEFORE deleting the retainer-handoff half.** This is a real, well-engineered subsystem being decommissioned, not a stub. *Source: cut-list (B); compliance §III (no autodialed/SMS to prospects).* (Removing a live subsystem touching secrets/webhooks → stage; Ali/Yang review the decommission.)

3.3 **Mothball the intake chat "closer" agent:** `intake-demo/`, `studio/leads/`, `api/intake/*`, `lib/intake/*`. It's the closer pivot; off-strategy for an independent auditor. *Source: cut-list (B).*

3.4 **Mothball the live in-call coach:** `desk/coach/*`, `api/coach/*`, `lib/coach-entitlement.ts`. It records live call audio in real time — off-spine AND a CIPA §632 live-consent surface. *Source: cut-list (B); compliance §II.*

3.5 **Mothball the rescue outbound/duplicate legs:** `rescue/delivery.mjs`, `crm-export.mjs`, `sol-alerts.mjs`, `spanish-routing.mjs`, `packet.mjs`, `import.mjs`, and the standalone `studio/rescue` console. **Salvage `rescue/triage.mjs` (merit brain) and `callback-audit.mjs` (already logs "every callback is made by a named FIRM EMPLOYEE; the service NEVER contacts prospects") — fold them into the desk worklist.** *Source: cut-list (B/C); the rescue layer is already independence-compliant in spirit.*

3.6 **CRM: import-only.** Keep `integrations/*` + `lib/crm` for reconciling signed fee-agreements against calls (the outcome-reconciliation differentiator); cut the write-back/push (closer-adjacent). *Source: cut-list Simplify #6.*

3.7 **Collapse to the minimal IA.**
- **Firm side — 4 screens:** **Your Leak** (`/desk`, the fused worklist + money hero = the whole daily product) · **Calls** (`/desk/calls`, every call accounted-for) · **Reports** (`/desk/documents`, the free audit + monthly receipts + the scorecard/benchmark folded in as a tab) · **Settings** (`/desk/settings`, connect calls + profile + plan). Everything else (queue, triage, reconciliation) becomes redirects into these four. Move `desk/review` (operator plumbing) out to studio/admin.
- **Operator side — 3 areas:** **Home** (`/studio`) · **Firms** (`/studio/firms`) · **System** (`/admin`). Kill `studio/leads`, `studio/rescue`, `studio/escalations` from nav (unless escalations is repurposed purely as the founder-alert backbone).
- Strip SMS/A2P Q&As from `faq` and the "reply STOP" line from `for-callers`. *Source: cut-list (D) + Simplify.*

---

## MOVEMENT 4 — Lay the moat + finish the engine (durable advantage)

4.1 **Complete the v1→v2 cutover with a measured error rate (unblocks the flip AND fixes a compliance contradiction).** The flip is held because the site publishes v1's false-alarm rate while v2 is unmeasured (§IV). Also: v1 emits a dollar at intake (`revenue_at_risk.amount_usd`) while v2 forbids it — the firm-visible engine violates the very no-dollar-at-intake rail v2 was built to honor. Resolve with the corpus you already accrue: extract the `_v2_shadow` **disagreement set** (max information per attorney-hour), have **2 independent CA-PI attorneys** label blind, measure **human–human QWK as the ceiling first**, then compute the README's gate metrics (disposition QWK ≥ 0.70, catastrophic-recall ≥ 0.95, wrongful-decline 10×-weighted, abstention coverage ≥ 85%), and **publish v2's own measured false-alarm rate** before it goes firm-visible. Boundary: **deterministic engine authoritative for anything with a legal/arithmetic right answer** (SOL, MICRA, lien/net math, coverage floors, catastrophe gates, comparative-fault multiplier); **LLM authoritative only for cited extraction** — the model reads, the table decides (Meehl/Grove). *Source: engine gap #3/#6 + spec D2.* (Novel regulated → Yang before it ships, §VII.)

4.2 **Fix the engine correctness gaps** (each a golden test):
- **Comparative fault as a value multiplier, not a viability kill.** `triage-live.mjs:80` maps mostly-at-fault to `fatal`; CA is *pure* comparative negligence — a 70%-at-fault plaintiff with catastrophic damages still nets real money. Model recovery = damages × (1 − fault%). A wrongful-decline here is the 10×-weighted error. *(Novel legal logic → Yang.)*
- **Government-claim hard gate.** The 6-month Gov. Code 911.2 deadline is only an urgency *flag*; a blown claim-presentation deadline is a malpractice event. Add `caGovernmentClaimGate` forcing `attorney_review_required`, symmetric to the SOL-expired gate. *(→ Yang.)*
- **Law-version attestation.** `statutes.mjs` is well date-keyed but "current for 2026" is a code comment, not an attestation. Add per-constant `{ value, authority, verified_date, reviewer, next_review }` and surface "CA PI Law Engine v2026.1, reviewed [date] by [named attorney]." Staked-Words applied to law. *(Novel regulated → Yang is the named reviewer.)*
*Source: engine gaps #7/#8/#9.*

4.3 **Add drift detection, confidence calibration, and a fairness audit.** Monthly drift job (band monotonicity, rolling precision vs published number with >5pt alert, population stability) reusing the `tuning/engine.mjs` MIN_SAMPLE + hysteresis discipline; the confidence reliability diagram (Movement 1.2 Panel 3) closes the loop that "high confidence" empirically means higher precision; a per-language / per-rep precision + abstention parity check (four-fifths tripwire) **before** Spanish scoring ships, published as a fairness attestation — a real differentiator for an "independent" authority. *Source: engine gaps #4/#5/#12.*

4.4 **The post-signing valuation engine (the 10x), on the compliant side of the line.** The engine already computes `autoMinLimits`, `micraNoneconomicCap`, `fmcsaFloor`, `rideshareCoverage`, and the hidden `projectedNetLienTier`/`lienUnderwater` (`liens.mjs` Profile C) — then throws it away to honor no-dollar-at-intake. Version it as a **reserve/valuation model that fires AFTER signing** (where dollars-with-assumptions are compliant, §IV): liability probability × settlement-value range × **net-to-client after reducibility-adjusted liens** × collectibility × referral-out value. Net-to-client is the number every attorney does on a napkin and no intake tool computes. *Source: engine move E2.*

4.5 **The data flywheel + category authority.** Capture now (the fields in 1.3) so the cross-firm benchmark becomes possible: `triage_cases` (input + verdict + outcome) + `firm_triage_profiles` + which `flip_fact` actually converted = "firms like yours sign this profile 3× more than you do," unsayable without pooled CA outcome data. `priors.mjs`'s "boring prior" is already designed to decay and be displaced by real firm data — the architecture points at the flywheel; it needs the outcome join (1.1) to start turning. Then publish the recurring **"California PI Intake Leak Report"** to become the number others cite. Compound **calibration-by-example** ("you said you'd pass MIST, but you signed 6 of 8 — your revealed appetite differs from your stated one"). *Source: engine moves E3/E4/E1.*

---

## THE OFFER + POSITIONING (compliance-corrected)

- **Pricing: flat monthly only — ~$1,500 Core / ~$3,000 Pro. Never per-case, per-signed-case, %-of-recovery, or "we only get paid when you do."** Those words are prohibited defects (§I). Anchor with a comparison ("less than the cost of one lost signable case a year") — a comparison, not variable pricing.
- **Risk reversal is the free audit + "flat monthly, cancel anytime, no contract." NOT a dollar-denominated guarantee** — a promise to "find $N" violates §IV (dollars are estimates, never guarantees). *This corrects earlier advice in the research report.*
- **BAA/NDA + a one-page confidentiality/security brief up front**, as part of the offer (the PI partner's silent dealbreaker).
- **Positioning: "the independent intake audit."** The Moody's/J.D. Power analogy is fine as an analogy. **Avoid bare superlatives** ("the only," "the best," "#1") unless independently substantiated and cited (§V). "The only party that doesn't sell you leads or take a cut" needs to be phrased as the substantiated, specific fact it is, not a superlative flourish.
- **UPL guardrail:** frame every merit grade and value estimate as an internal QA estimate that assists the firm's judgment, never as legal advice or a claimant relationship (Rule 1.18 / §VI).
- **Anything novel in fee structure, consent design, or the law-attestation layer → Roberta Yang before it ships (§VII).**

## THE TWO RISKS TO DESIGN AGAINST (from choosing independence)

1. **The engagement cliff** — a pure-intelligence tool with no action layer is the classic abandoned dashboard. Antidotes: the free audit front door, the monthly receipts email, the real-time owner alarm, and the daily worklist. Treat weekly engagement as the #1 product metric.
2. **The attribution dodge** ("those leads were junk / we'd have signed anyway"). Antidotes: the CA-law merit grade, the only-claim-unactioned rule, and the tape (you don't argue with the recording).

---

## START HERE (the first five things to fix, in order)

1. **Turn alerting on + close the silent-ingest holes** (Movement 0.1). An audit that goes blind is worse than none.
2. **Close the ground-truth join → `triage-reconcile.mjs`** (Movement 1.1). ~1 day, on data you already store. The spine.
3. **Ship the Calibration Report** (Movement 1.2) + **one-tap outcome capture** (1.3). This is the trust that makes the whole "audit" claim real.
4. **Make `/audit` the front door with the five worst calls on tape** (Movement 2.1). The wedge, the demo, the aha.
5. **Delete the dead-component chain and mothball the outbound-SMS/e-sign/closer surfaces** (Movement 3.1–3.5, NDA extracted first). The simplification that makes the product one thing.

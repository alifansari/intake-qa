# CHANGELOG-COPY-2.md — second-round adversarial copy audit (July 5, 2026)

Three readers must pass: (1) the 55-year-old managing partner (wince test), (2) the intake/office
manager who screens the vendor (bury-or-forward test), (3) outside ethics counsel (Compliance-page
review). No product logic, gate logic, or the 132 tests were touched. `next build` compiles; 132/132
tests green. All repeated facts now live in `web/src/lib/site-constants.ts`.

## Finding → files → before/after

**F1 — Outcome-linked pricing (the decisive change; biggest deal-killer + ethics liability).**
- `site-constants.ts`: new `PRICING_TIERS` (flat monthly, tiered by analyzed-call volume; prices are TODO placeholders), `PRICING_COMPLIANCE_ARGUMENT`, `PRICING_ANCHOR_LINE`, `REF_MONTHLY_USD`.
- `pricing/page.tsx`: full rewrite. "$1,500/mo + $500/case" and "$2,500/mo + $350/case" → flat monthly Founding/Tier 1/2/3. Lead line: "No per-case fee. No percentage of any recovery. No charge tied to whether you sign a client." Added the lawyer-grade compliance argument + comparables anchor.
- `page.tsx` (home): pipeline step 09 "You're billed a flat fee per case" → "You pay a flat monthly subscription — never per case, per client, or per recovered dollar." Ethics-strip card 1 "Flat fee per recovered case" → "Flat monthly fee — never a share of a fee, never per signed case" (re-cited to §§6151–6152 + SB 37). Comparison blurb "priced flat per recovered case" → "on a flat monthly subscription."
- `ComparisonTable.tsx`: row → "Flat monthly pricing — never a share of the fee, never per signed case."
- `ROICalculator.tsx`: removed `PER_CASE`; reference cost now flat annual (`REF_MONTHLY_USD × 12`); footnote reads flat-monthly only.
- `how-it-works/page.tsx`: step 8 "billed a flat fee per recovered case" → "flat monthly subscription… never per case, per client, or per recovered dollar."
- `faq/page.tsx`: bar-complaint + fee-splitting answers rewritten to flat-monthly logic.
- NOTE: internal billing *product* (`app/billing`, `app/admin/billing`, `resolvePerCaseFee`, billing tests) still meters per-case — that is product logic under the 132 tests and was intentionally left. See TODO(Ali) below.

**F2 — Compliance page led with ABA Rule 5.4 (wrong authority for a CA firm).**
- `compliance/page.tsx`: full rewrite, California-first. Now leads with the §§6151–6152 capping framework + SB 37 (2026) private right of action (verbatim statutory-damages and §6153 penalty quotes), tied to *why the fee is flat and decoupled*. Rule 5.4 demoted to a one-line "for readers outside California" footnote. AB 931 flat-fee-carve-out defense removed entirely (we no longer charge per case, so it's moot — and it avoids the Wisner Baum caveat). Rules 7.2/7.3 labeled as the 2018 Chapter 7 rules; added a TODO note that the audit's "March 2025 amendment" could not be confirmed and a separate referral-service proposal is pending, not enacted. §632/§632.7 with the $2,500 fine + Smith v. LoanMe; TCPA vacated (IMC v. FCC, with the holding quote); CA State Bar GenAI guidance placed before ABA Op. 512.

**F3 — Clio 40%/48% figures conflated.** `site-constants.ts` stores `STAT_ANSWERED_LIVE` (40% answered live) and `STAT_UNREACHABLE` (48% unreachable) as distinct constants with distinct labels. Homepage stat bar uses 40% (answered live); homepage prose uses 48% (unreachable). Never interchangeable.

**F4 — Fake scarcity ("5/5 seats left," countdown).**
- `PilotCohortBanner.tsx`: removed the `N/5` pill and "seats left" count and the "Claim a spot" CTA. Now shows the durable `COHORT_LINE` ("We're taking a founding cohort of 3–5 Southern California PI firms onto free 30-day pilots") + "Run your free audit."
- `page.tsx`: final section heading "Founding cohort: 5 SoCal PI firms" → "A founding cohort of 3–5…" (from constants).
- `lib/pilot-config.ts` is now **orphaned** (nothing imports it). Left in place; safe to delete. TODO(Ali).

**F5 — Discoverable-admission / accusation framing.** Homepage problem section reheadlined "The phone rang. Nobody signed. You still paid for it." → "Every firm has calls that don't turn into cases," rewritten to population-level ("that's true at every firm," "a staffing-and-timing problem, not a people problem"). Footer tagline "recover the signable cases your team let slip" → "win back the signable cases that didn't convert."

**F6 — Intake manager as target, not champion.**
- `how-it-works/page.tsx`: "What your intake team sees" → "For the intake team: this is on your side" — scores the process not job security; 100% scoring replaces the unfair 2% spot-check; the report is *proof of workload* that justifies another hire; "protects careers; it doesn't threaten them."
- `faq/page.tsx`: new Q "What if my intake manager objects to being monitored?" with the champion framing.

**F7 — Subprocessor over-exposure ("my calls go to three tech companies?").**
- `site-constants.ts`: `ACCOUNTABLE_PARTY_LINE` (one accountable party + "three infrastructure providers under contract") and `SUBPROCESSORS[]` (detail).
- Homepage & Compliance now use the one-sentence version + a link to Security. Audit de-risk block no longer lists all three inline.
- `security/page.tsx`: full rewrite into a vendor-security-review structure — accountable party up top, then Encryption / Access controls / Retention & deletion / Subprocessors (table from constants) / DPA-BAA-NDA / Breach notification / Recording & consent.

**F8 — Security page not vendor-review-shaped; no breach timeline.** Covered by the F7 `security/page.tsx` rewrite. Breach notification stated as "within 72 hours of becoming aware" (`BREACH_NOTICE_HOURS`, TODO to confirm the commitment).

**F9 — FAQ order + gold founder/audit blocks.**
- `faq/page.tsx`: reordered to the ranked objection sequence (AI-wrong → bar complaint → why free → data → intake-manager → continuity), then supporting questions. Added the solo-founder continuity answer.
- `audit/page.tsx`: de-risk block rewritten to the gold "Here's the deal, in plain terms" language, using `DELETION_DAYS`, `FOUNDER_NAME`, `FOUNDER_EMAIL`; subprocessor detail relegated to a Security link.
- Founder page already leads with the paralegal experience (age implicit) from round one — left as-is; it passes the Quintilian reframe.

**Consistency + constants.** `site-constants.ts` holds cohort size (3–5), pilot length (30d), deletion window (7d), the two Clio figures, speed-to-lead 21×, PI click cost, test-corpus precision/recall (null until documented, with `TEST_CORPUS_LABEL`), pricing tiers, A2P line, subprocessors, `COPYRIGHT_YEAR`, guarantee threshold, founder name/email. Footer copyright now reads from `COPYRIGHT_YEAR`. Grep pass confirms: no stray "$500/case," no "seats left/countdown," no "AB 931" in marketing, Rule 5.4 only in the compliance footnote.

## TODO(Ali) — must confirm before relying on these

| Location | Confirm |
|---|---|
| ~~`site-constants.ts` `PRICING_TIERS`~~ | ✅ CONFIRMED (Ali, July 2026): Tier 1 $500, Tier 2 $900, Tier 3 $1,500/mo. TODO placeholders removed. |
| ~~`site-constants.ts` `REF_MONTHLY_USD`~~ | ✅ Mirrors confirmed Tier-2 ($900). |
| ~~Internal billing product~~ | ✅ MIGRATED to flat-monthly (see "Billing engine migration" below). |
| `compliance/page.tsx` | The audit's **"March 2025 amendment to Rules 7.1–7.3"** could not be confirmed as in force; cited the 2018 Chapter 7 rules instead. Confirm before citing any 2025 amendment as live. |
| `compliance/page.tsx` | Firm's own **§632 consent/disclosure process** and the exact **CCPA "service provider"** DPA language. |
| `security/page.tsx` | **Breach-notification timeline** you can actually commit to (currently 72h). Intake QA's **own attestations**, if any. **DPA/BAA** template status. |
| `honesty/page.tsx` + homepage teaser | **Test corpus** (N + composition + date), then publish precision/recall only with the `TEST_CORPUS_LABEL`. Still pending. |
| `page.tsx` guarantee | Confirm the **$25,000 find-it-free** threshold and terms. |
| `lib/pilot-config.ts` | Now **orphaned**; safe to delete. |
| Statistic | Exact source for the **"~62% call a competitor"** figure before using it inline (currently not used). |

## Billing engine migration (flat-monthly) — July 5, 2026

Migrated the *internal* billing engine to match the new public model: firms pay a
flat monthly subscription tiered by analyzed-call volume, **never** per signed or
recovered case. Confirmed prices: Tier 1 $500 / Tier 2 $900 / Tier 3 $1,500/mo.
Exceeding a tier's call volume **flags an upgrade** in the operator console — it is
never auto-charged (Ali's call).

- **Migration 0013** (`db/migrations` + `supabase/migrations`, lockstep): adds
  `billing_plans.monthly_call_cap`, zeroes `per_case_fee_cents` on every plan, and
  seeds `tier_1/2/3` (base fee + call cap). Per-case columns + `billable_events`
  are left in place so historical invoices stay readable; they're just unused.
- **`billing/invoice.mjs`**: `computeInvoice` now emits a single base subscription
  line (prorated in the first partial month); removed per-case lines, the monthly
  cap, and `resolvePerCaseFee`. `generateInvoice` no longer reads billable events.
- **`messaging/outcome.mjs`**: signing a case no longer accrues a billable event
  (recovery rows still recorded for ROI/reconciliation only).
- **`ingest/db.mjs` + `db-postgres.mjs` + `store.mjs`**: `getFirmBilling` returns
  `monthly_call_cap`; added `countCallsInPeriod` (dialect-safe) for the upgrade flag.
- **`app/billing/page.tsx`** (firm) + **`app/admin/billing/page.tsx`** (operator):
  show the flat monthly plan, analyzed-call volume vs. the tier cap, and an
  upgrade nudge when over — no per-case tables. Find-it-free guarantee still waives
  the monthly fee; invoice void + Stripe simulation unchanged.
- **`tests/billing.test.mjs`**: rewritten for the flat model — fee-invariance now
  proves the total is independent of both recovered-fee amount AND signed-case
  count; a signed outcome creates no charge; proration, guarantee-waiver,
  void-not-delete, and Stripe-sim retained. `billing-admin.test.mjs` unchanged.
  Full suite: 130/130 green; `next build` compiles.

Not done (needs a person, not code): actually assigning each pilot firm to a tier
plan (`upsertFirmBilling`), and wiring real Stripe keys when you leave TEST_MODE.

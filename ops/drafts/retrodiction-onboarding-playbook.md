# Retrodiction Onboarding Playbook — the "single highest-leverage 30 minutes" (Wave 7, 2026-07-10)

> **Status:** staged operational playbook. Adversarial QC pass run 2026-07-10 (verdict READY
> AFTER FIXES); all fixes applied in this revision (confidential-settlement handling,
> pseudonymity framing, secure-transfer channel, net_to_client purpose, Clio Custom Reports
> first, CASEpeer column humility). CMS paths spot-checked against vendor help docs in QC. Operationalizes Increment 0's retrodiction bulk
> export (`engine-v2-conveyor-MVP.md` §6 + Wave 6 amendment). **Hard gate: do not run the
> session with any firm before the beta NDA/confidentiality agreement is executed** (open
> beta-program item). Internal-only output — nothing here surfaces at intake, and the Firm
> Baseline one-pager is firm-eyes-only (never marketing without §VII staging).

Output lands in `case_outcome` sibling rows (keyed via `external_case_ref` on `case_disposition`; historical rows have no `call_id` — that's expected and fine). The firm's CMS remains the system of record; we keep a shadow ledger.

---

## 1. THE ASK (plain language, per CMS)

**The one-sentence ask to the firm:** *"Send us a list of every case you closed in the last 24 months — one row per case — with case number, case type, date opened, date closed, how it ended (settled / dropped / referred out), the gross settlement, your fee, costs you fronted, liens paid, what the client took home, and any referral fee paid or received. No client names needed — your case numbers are enough."*

Menu paths below are **verified from vendor help docs** unless marked UNVERIFIED (§VIII).

- **CASEpeer** (best case — PI-native): Ask for the **Closed Cases Report** (all closed-status cases in a date range; CSV via the Export button; report existence and export path verified — exact column labels such as Total Settlement / Total Fee / Total Medical Bill are per the help article but UNVERIFIED in QC, confirm in-session), plus the **Settlement Report** (accepted offers, accepted + deposit dates) and **Demand Report** (demand history from the Settlement tab) — both Excel/CSV. Have an **admin** run them; non-admins only see their own cases.
- **Clio Manage**: **Matters > "Closed" filter > Export > CSV** gives dates/practice area/status/SOL — *no dollars*. If the firm has the **Personal Injury add-on**, settlement, fees, liens, and net-client-compensation live on the matter's Settlement subtab, but no firm-wide closed-matters-with-settlement export is documented — **try Clio's self-serve Custom Reports builder first** (filter/group on close date + settlement fields), then Clio support if it can't reach the PI fields, or use the admin-only bulk export (app.clio.com/export) plus their disbursement records.
- **Filevine**: No stock settlement report exists. **Main menu > Report Builder** > "List of Projects" filtered to closed phases > right-click > Export Loaded Data > CSV/Excel. Financial columns depend entirely on the firm's project template (Meds/Liens/Expenses collection sections) — ask whoever built their templates which fields hold gross/fees/liens, or have them ask Filevine support.
- **MyCase**: **Reports > Case & Contact Reports > Case List Report** (closed filter, CSV) + **Reports > Financial Reports > Case Revenue** (closed-only filter; billed/collected). MyCase has **no native settlement/lien fields** — expect the money columns to come from the firm's own disbursement spreadsheet instead.
- **Smokeball**: **Reports > Matter Closed List > export CSV** (Grow/Prosper+ tiers). PI settlement data lives in Medicals & Settlement Details (lien amounts, negotiated finals, settlement statement); the Settlement Insights "All Closed Clients" table has everything but a documented CSV export — UNVERIFIED — so **have the firm ask Smokeball support for the closed-matter settlement export**.
- **Spreadsheet / no CMS**: Send our one-tab template (columns = the mapping table below). Most small firms keep a settlement/disbursement ledger for trust accounting — that spreadsheet IS the export.

---

## 2. THE MAPPING

| `case_outcome` field | CASEpeer | Clio (PI add-on) | Smokeball | Filevine | MyCase | Sheet template |
|---|---|---|---|---|---|---|
| `external_case_ref` | Case number | Display/Matter Number | Matter number | Project ID | Case Number | "Case #" |
| case type (→ disposition snapshot) | Case Type | Practice Area | Matter Type | Project Type | Practice Area | "Case type" |
| `end_state` | Case Status (Closed/Dropped/Referred/Subbed Out → map) | Status only — **derive from firm** | Closed list — derive | Phase name — derive | Status — derive | "How it ended" |
| `gross` | Total Settlement | Recovery amount | Settlement Statement amount | template field | **MISSING** | "Gross settlement" |
| `costs_advanced` | Costs (Costs Mgmt — separate export) | Matter expenses | Costs line | Expenses section | **MISSING** | "Costs fronted" |
| `lien_load` | lien reports (separate) | Other liens total | Lien Amount / Final Amount | Liens section | **MISSING** | "Liens paid" |
| `net_to_client` | often **MISSING** in export | Net client compensation | derivable from stmt | template field | **MISSING** | "Client took home" |
| `net_fee_to_firm` | Total Fee / Fees In | Legal fees | attorneys' fees | template field | Collected (proxy — flag it) | "Firm fee" |
| `referral_fee` | Referred Cases report | referral fee line | referral fee (Insights) | template field | **MISSING** | "Referral fee paid/received" |
| `time_to_resolution` | derived: open→closed dates | Open Date→Close Date | derived | derived | Open→Closed Date | derived |
| `demand_sent_at` / `demand_amount` | Demand Report ✓ | **MISSING** | Settlement Negotiations report (partial) | custom field only | **MISSING** | optional columns |
| `first_offer` | Settlement Report (offer history) ✓ | **MISSING** | **MISSING** | custom only | **MISSING** | optional |

**Why `net_to_client` is collected:** solely for arithmetic validation (gross ≈ fee + costs + liens + net catches export errors and mis-mapped columns). It feeds no deliverable; if a firm balks, drop the column — validation degrades gracefully.

**Censoring rule (hard):** any blank, absent, or "we don't track that" field imports as **NULL = censored — never zero**. Zero is written only when the firm affirmatively states zero (e.g., "no liens on that one"). Still-open cases import as `end_state = open`, right-censored. Declines/drops are censored on value, never assumed worthless.

---

## 3. THE 30-MINUTE SESSION

**Who's on:** the firm's office manager or bookkeeper (drives their CMS), the partner optional for the last 5 minutes, Ali on our side. Screen-share theirs, not ours.

**Before the call:** NDA/confidentiality agreement signed (beta paperwork — still an open item per beta-program status; **do not run the session before it's executed**). Confirm in writing: we receive case-level financial data under the beta agreement; the CMS remains their system of record; deletion cascade applies (§VI).

- **0–3 min — framing:** "We're building your firm's baseline: where your fees actually came from and how long cases take. Minimum necessary only: case numbers, case types, dates, end states, and dollars. We do **not** want client names (optional), and we will **not** accept SSNs, dates of birth, medical records, provider bills, injury narratives, or claimant contact info. If a column has those, we delete it before anything leaves your screen. If any of these were confidential settlements, band or exclude those rows — your call; the banded fallback is built for exactly that. And to be precise about what this is: case numbers keep the file pseudonymous, not anonymous — we treat every row as confidential client data under the NDA, same deletion cascade as everything else."
- **3–15 min — run the export:** walk the CMS path from §1. If a report doesn't exist, fall back to their disbursement spreadsheet.
- **15–20 min — scrub on their screen:** delete PII columns live, together, before the file is transferred. This is the consent-and-minimization moment — they see exactly what leaves. **Transfer channel: the product's own authenticated upload surface (or a single-use secure upload link) — never email.** A file of case-level financials keyed to case numbers does not transit an unmanaged channel (§VI).
- **20–27 min — gap check against the mapping table:** for each MISSING field, ask once: "tracked anywhere else?" If no → censored, move on. Capture their fee structure (pre-lit %, litigation %, any sliding scale) verbally — one note, not a document request.
- **27–30 min — set expectation:** "By tomorrow morning you'll have a one-page baseline: your fee concentration, case-type mix, and time-to-resolution. Every number on it traces to a row in the file you just sent."

---

## 4. THE DAY-ONE DELIVERABLE ("Firm Baseline" one-pager)

Computable **honestly from outcome data alone** — no call recordings exist for these cases, so no scoring, no leak claims:

1. **Fee concentration curve** — cumulative % of `net_fee_to_firm` vs % of cases (e.g., "top 20% of cases produced 71% of fees"). Computed only over non-censored fee rows; N stated.
2. **Case-type × end-state mix** — signed→settled / dropped / referred grid with median fee per cell (censored cells shown as "insufficient data," never imputed).
3. **Time-to-resolution distribution** — median + IQR overall and per case type; open cases included as right-censored, noted as such.
4. **Referral economics** — fees paid out vs referral fees received; net referral position.
5. *(Where CASEpeer/Smokeball data exists)* demand-sent → first-offer → accepted-offer lags.

This also **seeds the outcome half of the band→outcome map**: per-case-type fee distributions become the firm-specific priors (wide intervals, `source: firm_realized` outcome-side only). The band side fills only as live scored calls resolve — say so on the page.

**What the artifact must NOT claim (citation guard, §IV):** no counterfactuals ("if intake had been better…"), no "you lost $X" or leaked-case figures — there is **no call evidence** for these cases; no citation, no claim. No benchmarking against other firms (N=5, §VIII). No engine-accuracy claim — retrodiction *scoring* requires intake facts we don't have for pre-product cases. Every figure footnoted to the export file + row count; confidence-tiered; header states "descriptive baseline from your own closed-case data — not a prediction, not a guarantee." Internal/firm-eyes-only; never a marketing artifact without §VII staging.

---

## 5. EDGE CASES

- **Firm won't share dollar amounts:** offer banded ranges (<$10k / $10–25k / $25–50k / $50–100k / $100–250k / $250k+). Store the **band, not a midpoint**; concentration curve and mix still compute on bands, labeled "banded — lower precision." Never fabricate point values.
- **Contingency variations:** record `net_fee_to_firm` as the *actual* fee received; never back-calculate gross from an assumed 33⅓%. Sliding scales, minors' compromises (court-reduced fees), and fee-waiver cases are why. Capture the firm's standard schedule as metadata only.
- **Pre-lit vs litigation split:** if the export carries a lawsuit-filed date or litigation status (CASEpeer statuses; Filevine phases), stamp it — it's the biggest TTR and fee-percentage covariate. If absent → censored, not inferred from duration.
- **Co-counsel / referral splits:** `net_fee_to_firm` = this firm's share **after** the split; `referral_fee` records the amount paid out (or received, on `referred_resolved` inbound cases). Never sum both sides into gross fee. CRPC 1.5.1 splits are the firm's compliance matter — we record, we never broker (§I posture intact).
- **Multiple plaintiffs / one incident:** one row per client-matter, not per crash — matches how CMSs and trust accounting split them.

**Flagged plainly (§VIII):** exact export column headers for MyCase Cases CSV, Smokeball closed-list, and Filevine are undocumented or template-specific — the mapping step in the live session (min 20–27) is where truth is established, which is exactly why this is a guided session and not an emailed form.

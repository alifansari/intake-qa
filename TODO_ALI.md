# TODO_ALI.md — real-world facts only you can confirm

These are collected from the product-round spec's fact sheet and discipline rules. None are guessed
in code; each is a literal `TODO(Ali):` marker where it lives. Answer these and I'll fill them in.

## Blocking before a real firm's data flows through production
- [ ] **Anthropic retention tier** for this workspace (default 7-day, or a signed ZDR agreement?). Do NOT claim ZDR unless signed. (Security docs + deletion receipt.)
- [ ] **AssemblyAI plan** — confirm it includes Universal-3 Pro, code-switching, and PII redaction policies. Confirm the backend AWS-TTL purge SLA in writing for a legal deployment.
- [ ] **Pilot firms' dominant language(s)** per firm/channel (`en` / `es` / `es-en-codeswitch`) — forced-language routing, not auto-detect.
- [ ] **Phone-system export formats** each pilot firm actually has on hand (RingCentral mp3/wav, CallRail mp3, 8x8/Dialpad vary).

## Numbers / thresholds to tune
- [ ] Baseline test count: acknowledge **130** as the true baseline (billing tests were migrated), or ask me to reconstruct 2 tests to reach 132.
- [ ] Estimated-fee-value table: your firms' **standard contingency %** and, when available, historical signed-case fee ranges by case type (these OVERRIDE published sources).
- [ ] Drift-monitor alert thresholds (start: flag-rate ±30% relative, tier-mix ±15 pts).
- [ ] QA sampling: N% random (start 10%) and word-confidence threshold (start 0.55).
- [ ] Citation-guard bands (start: ≥90 pass / 80–90 review / <80 fail).

## Commitments to confirm before promising to firms
- [ ] SLOs: Leak Audit readout within **3 business days**; monthly statement by the **5th business day**. Comfortable committing?
- [ ] "I personally review 100% of statements/readouts" — true at pilot scale? (Attestation + Analyst-of-Record blocks depend on it.)
- [ ] Audit monthly **capacity number** (or we keep the count out of the copy).

## Content to provide
- [ ] Analyst name + issued-date handling for the attestation signature block.
- [ ] Firm code scheme for statement/readout IDs (`[FIRM-CODE]-[YYYY]-[NN]`).

## Deferred (do NOT build pre-pilot — stubs only)
- Real Clio / Filevine / Lead Docket integrations (read interfaces + `NotImplemented` stubs only).
- Auto-sending follow-ups (staff copy & send themselves; A2P 10DLC pending — no go-live date published).

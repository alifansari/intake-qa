# LEAK_REPORT_PLAN.md — Stage 0 inventory + mapping (Intake Leak Report)

Required before code (per the spec). Maps the current audit flow and each spec stage to files +
tests, honestly marking what THIS SESSION already built vs. what remains. Additive-only; the 130
baseline tests stay green; every new capability gets new tests; TEST-MODE discipline holds.

## Current audit flow (ground truth)
- `web/ingest/audit.mjs` — `buildAuditReport({db, token, monthlyCallVolume})` → `{ok, session,
  calls, summary, pending}`. `aggregateAudit` emits `signableCalls`, `totalFeeAtRisk`,
  `projectedMonthlyLeakage`, best/worst, per-call `leaked` rows (each with `feeAtRisk`). Session cap
  10 calls, 1/firm/7 days. **Do not change these outputs.**
- `web/src/app/api/audit/{report,session,status}/route.ts` — token-gated JSON; report route returns
  `summary` + `pending`.
- `web/src/app/audit/[token]/page.tsx` (+ `audit/sample`) — web reading layer, renders from the same core.
- `web/analysis/sol.mjs` + `sol-rules.mjs` — CA deadlines, urgency bands, mandatory disclaimer,
  refusal on unverified states. **Reuse verbatim; never recompute.**
- Transcripts stored on `calls.transcript` (migration 0001) → the citation guard matches against them.
- Storage: `demo-audio` bucket (private) for demo audio; PDFs will be a new artifact.

## Already built THIS SESSION (reuse — do not duplicate)
| Spec item | Already have |
|---|---|
| Citation objects table | `transcript_citations {flag_id, start_ms, end_ms, verbatim_snippet, validation_score, status}` (mig 0014) |
| Dropped-citation log (review_queue) | `citation_failures {flag_id, snippet, nearest_text, score}` (mig 0014) — serves as the review queue |
| analysis_provenance | `analysis_versions {model_version, prompt_version, rubric_version}` (mig 0014) |
| report_access_events | `artifact_access_log {firm_id, actor, artifact_type, artifact_id, action, at}` (mig 0014) |
| confidence tiers | `flag_confidence {confidence_tier strong|moderate, rubric_version}` (mig 0014) |
| case type | `flags.case_type` (mig 0015) |
| fee-value method | `analysis/fee-value.mjs` (case value × 33⅓% contingency; ranges only) + `fee_value_ranges` table |
| PDF pipeline | `@react-pdf/renderer` + `src/pdf/{doc-helpers.mjs,shared.tsx,statement.tsx,readout.tsx}` + `/api/documents/*` |

## Stage → files → new → tests → status
| Stage | Touch (additive) | New files | New tests | Status |
|---|---|---|---|---|
| 0 Inventory | — | LEAK_REPORT_PLAN.md | — | **DONE (this doc)** |
| 1 Schema + citation guard | reuse 0014 tables | `analysis/citation-guard.mjs` | `tests/citation-guard.test.mjs` (exact pass / drift pass / fabricated fail+logged) | **guard: THIS TURN**; `report_status` enum → mig 0016 (TODO) |
| 2 Confidence tiers + taxonomy | reuse `flag_confidence` | `analysis/leak-taxonomy.mjs` (7 tags), rubric prompt file | tag-exactly-one, tag-has-valid-citation, moderate-never-in-page-one | TO BUILD |
| 3 Composition layer | `src/lib/audit-types.ts` (add fields) | `src/lib/leak-report/compose.mjs` + verbatim copy | page-one=subtotal, expired excluded, system-not-person lint, disclaimer-with-every-deadline, conservative-low anchor | TO BUILD |
| 4 PDF (Leak Report) | extend `src/pdf/` | `src/pdf/leak-report.tsx` + IBM Plex Serif/Sans + JetBrains Mono fonts + deposition-transcript component + QR (`qrcode`) | render-without-throw, fonts-registered (fail loudly), grayscale badge = shape+label | TO BUILD |
| 5 Web view + audio + access log | `audit/[token]/page.tsx` | signed-URL excerpt player (`createSignedUrls`, seconds) | access-event logged; forward-by-token no login | TO BUILD |
| 6 Review gate | — | `report_status` state machine + checklist UI | cannot release with any checklist item unconfirmed | TO BUILD |
| 7 Templates/copy | — | `src/lib/leak-report/copy/*` (methodology, guarantee, scope, exclusions, sign-off, cover memo, checklist, cover email) | verbatim-copy snapshot | TO BUILD |
| 8 Full gate | — | — | 130 + all new green; `next build`; lint | PER STAGE |

## Hard rules carried into every stage
- "audit" is never used for this artifact — it's a **review / diagnostic / independent diagnostic
  review** (we are not CPAs). Existing internal code names (buildAuditReport, /api/audit) stay; the
  client-facing artifact is the **Intake Leak Report**.
- ONLY strong flags count toward page-one numbers + schedule subtotal; moderate flags → exclusions only.
- Expired statutes never in headline/recoverable; shown only in exclusions "statute expired."
- Prose quotes the LOW end; headline = visible arithmetic sum of shown strong, non-expired rows.
- System-not-person lint blocks staff names in findings.
- sol.mjs outputs reused verbatim; mandatory disclaimer renders with every deadline.
- $25k find-it-free guarantee attaches to the subscription decision (flat monthly, never a share of
  recovery) — matches [[positioning-and-offers]].

## TODO(Ali) (never invented)
Fee-value table rows by case type; published-source citations for fee ranges; QR/audio go-live;
deeper-tier pricing; analyst legal last name + direct contact line.

## Honest scope note
Stages 2–8 (the Leak Report PDF itself, taxonomy, composition, review gate, web restructure) are a
multi-session build. This turn delivers Stage 0 (this plan) + the Stage-1 **citation guard** — the
honesty backbone every page-one number depends on. Remaining stages proceed one gate at a time,
`npm test` green after each.

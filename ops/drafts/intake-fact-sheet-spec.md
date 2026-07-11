# Intake Fact Sheet Export — v0 Spec (Wave 7, 2026-07-10)

> **Status:** DRAFT for review — the neutral, cited, demand-tool-agnostic export from
> `demand-stage-adjacency.md`'s verdict (b). Depends on the Increment 0 `answer_value`
> amendment (`engine-v2-conveyor-MVP.md` §6) landing before generation is possible.
> Hard boundary inherited from Wave 6: this is a **partnership surface any demand tool
> consumes** — never demand generation. No code in this repo changes until the conveyor
> increments are approved; this is the spec that makes that build cheap.
>
> **QC status:** adversarial QC pass run 2026-07-10 returned NEEDS REWORK — the original
> schema could not represent a `not_asked` fact (unconditional `source`), stated its
> conditionals as prose, and left `value` an open channel for banned content. Reworked in
> this revision: nullable source + explicit superRefine invariants, the `Facts` helper
> defined, honest shape-vs-content enforcement split, per-key value typing, bilingual lint,
> and a new §6 Confidentiality & transfer. The §4 pitch paragraph is future customer-facing
> copy — **route to Ali (and Yang) before any external use (§VII).**

## 1. JSON Schema (Zod-style)

### 1.1 The fact envelope (every fact, no exceptions)

```ts
const Source = z.object({
  call_id: z.string(),                 // ScoredCall ref
  citation_id: z.string(),             // transcript_citations sibling row
  span: z.object({ start_char: z.number(), end_char: z.number() }),
  audio_timestamp_ms: z.number().nullable(),
  speaker: z.enum(["caller", "intake"]),
  verbatim: z.string(),                // original language, unaltered
  language: z.enum(["en", "es"]),
  english_gloss: z.string().nullable() // optional translation, labeled as gloss
});

const Fact = z.object({
  key: z.string(),                     // canonical ontology key, e.g. "coverage.um_uim"
  value: ValueForKey,                  // per-key typed shape (see below), nullable
  value_type: z.enum(["date", "text", "enum", "json"]),
  source: Source.nullable(),           // null ONLY when asked_state === "not_asked"
  asked_state: z.enum(["asked_answered", "asked_unclear", "not_asked"]),
  confidence: z.enum(["high", "medium", "low"]),   // from flag_confidence tiering
  as_of: DateStr                       // DERIVED by the generator from source.call_id +
                                       // calls[] — never independently authored
}).superRefine((f, ctx) => {
  // The invariants live HERE, not in prose:
  if (f.value !== null && (f.source === null || f.asked_state !== "asked_answered"))
    ctx.addIssue({ message: "value requires source + asked_answered" });
  if (f.asked_state === "asked_unclear" && (f.value !== null || f.source === null))
    ctx.addIssue({ message: "asked_unclear ships the span, never a value" });
  if (f.asked_state === "not_asked" && (f.value !== null || f.source !== null))
    ctx.addIssue({ message: "not_asked carries neither value nor source" });
});
```

State table the superRefine enforces: `asked_answered` → value + source both present; `asked_unclear` → value null, source present (the demand tool sees *what was said*, not our guess); `not_asked` → both null.

**`ValueForKey` — per-key typed shapes, not an open union.** Each ontology key declares its value shape in the catalog (e.g., `incident.date` → DateStr; `coverage.um_uim` → `{limits_text: z.string().regex(CURRENCY_OK), carrier: z.string()}`; `treatment.payment_source` → enum). Free-form `z.record(z.unknown())` is not permitted anywhere — an open JSON channel would let banned content (tiers, computed dates, value opinions) ride through a "fact." Currency-pattern strings are valid ONLY under `coverage.*` keys (caller-stated policy limits are facts); a currency regex match under any other key fails the build.

**`Facts(...)` helper, defined:** `Facts(k1, k2, ...)` = `z.object({ [k]: Fact.optional() })` per listed key — a key may be absent ONLY if it is inapplicable to the case type (e.g., `coverage.rideshare_app_status` on a premises case); applicable-but-unanswered keys MUST be present with `asked_state ≠ asked_answered` (and mirrored in `not_captured[]`). Applicability comes from the case-type catalog, so absence is never ambiguous.

**`asked_unclear` lives in two places by design:** the `facts.*` entry carries the verbatim span; the `not_captured[]` entry is a computed, source-less mirror flagging it as unresolved. The generator derives both from the same `question_checks` row — they cannot drift because neither is authored independently.

### 1.2 Document shape

```ts
const IntakeFactSheet = z.object({
  fact_sheet_version: z.literal("1.0"),
  rubric_version: z.string(),                    // question-catalog version, e.g. "qa-v1"
  generated_at: ISODateTime,
  firm_id: z.string(),
  external_case_ref: z.string().nullable(),      // CMS matter ID (Filevine/Litify/Clio)
  case_disposition: z.literal("signed"),         // export exists only for signed cases
  calls: z.array(z.object({
    call_id: z.string(), call_date: DateStr,
    language: z.enum(["en", "es"]), duration_s: z.number().nullable()
  })),                                           // Day-0 call + any follow-ups
  languages: z.array(z.enum(["en", "es"])),

  facts: z.object({
    coverage: Facts("coverage.bi_liability", "coverage.um_uim", "coverage.umbrella",
      "coverage.prop213_status", "coverage.commercial_defendant",
      "coverage.rideshare_app_status", "coverage.government_entity_involved"),
    incident: Facts("incident.date", "incident.mechanism", "incident.location",
      "incident.police_report", "incident.citations"),
    injury: Facts("injury.initial_symptom_narrative",   // verbatim-first: value IS the quote
      "injury.onset_timing"),
    treatment: Facts("treatment.providers", "treatment.payment_source", "treatment.gaps"),
    parties: z.object({
      defendants: z.array(Fact),
      witnesses: z.array(Fact.extend({   // value: {name, contact} — status lives here only
        contact_status: z.enum(["contact_captured", "name_only", "mentioned_no_details"])
      }))
    }),
    priors: Facts("priors.prior_injuries", "priors.prior_claims"),
    evidence: Facts("evidence.photos", "evidence.video", "evidence.incident_report")
  }),

  not_captured: z.array(z.object({       // THE HONESTY FEATURE
    key: z.string(),
    asked_state: z.enum(["not_asked", "asked_unclear"]),
    applicable_reason: z.string()        // why this key applies to this case type
  })),

  provenance: z.object({
    generator: z.literal("intake-qa"),
    engine_rubric_version: z.string(),
    checksum: z.string()                 // hash of facts+sources; tamper-evidence
  })
});
```

`not_captured[]` is computed, not curated: every question in the case-type's catalog whose state is not `asked_answered` appears there. It cannot be suppressed. Empty only when every applicable question was answered.

## 2. Invariants (enforced in schema + generator, not by convention)

1. **Facts only, no conclusions.** Every text value is framed as reported speech ("caller stated the other driver ran the light"), never an assessment ("liability is clear"). Generator lint: a denylist of conclusion vocabulary (liable/negligent/clear/strong/worth) fails the build of the sheet.
2. **No case-value numbers.** No dollar estimates, tiers, or `fee_value_ranges` anywhere in the export. Honest enforcement split: the **schema constrains shape** (no value/tier/deadline fields exist; per-key typed values; no open JSON; currency patterns valid only under `coverage.*`), and the **generator lint constrains content** (a versioned, documented denylist — not just liable/negligent/clear/strong/worth but currency-out-of-place, "settle," "estimate," "six figures," "policy-limits case," and the Spanish equivalents — *vale*, *fuerte*, *caso de límites* — since this is a bilingual product). Lint failure fails the sheet build. (Policy-limit amounts the *caller stated* are facts and allowed: "UM/UIM $100k/$300k, Farmers".)
3. **No computed deadlines.** `coverage.government_entity_involved: true` is a fact; the six-month clock is the lawyer's math. Schema has no date-arithmetic fields, no "due" fields.
4. **Verbatim stays original-language.** Spanish quotes ship in Spanish; `english_gloss` is optional, clearly labeled a gloss, and never replaces `verbatim`.
5. **PII minimization.** No SSN, no DOB, no immigration status — ever (generator strips on extraction, not display). Per-firm redaction config for phone/address of third parties. Caller identity fields limited to what a demand needs.
6. **Provenance is immutable.** Sources reference the frozen `transcript_citations` rows; the sheet is regenerable but sources never mutate. `checksum` makes silent edits detectable.
7. **Absence is neutral.** `not_captured` is descriptive ("not asked/answered on the recorded calls"), never an inferred negative ("no UM coverage").

## 3. Delivery (within the existing architecture)

- **A read model, not a table.** `web/src/lib/factsheet/compose.ts` — a pure compose function (mirroring the leak-report compose pattern) that assembles the sheet from the `Repository` seam: `ScoredCall` (frozen passthrough, untouched) + `question_checks` siblings (`answer_value`, `answer_citation`, `asked_state`) + `transcript_citations` + `flag_confidence` + `case_disposition` (`external_case_ref`, disposition gate). Zod-validated at the boundary on the way out. No new mutation paths; nothing writes.
- **Generated on demand, per signed case.** Route exists only when `case_disposition = signed`. Output: `GET .../factsheet.json` and a PDF. The route is firm-scoped and auth-gated (RLS-equivalent enforcement at the read-model layer per CLAUDE.md's hard requirement), and path params are opaque internal IDs — never `external_case_ref` or any claimant-linked value (§VI: no client data in URLs/logs).
- **PDF** via the existing report-layer pattern (leak-report compose → template render, as `lib/report.js` and `documents/from-audit.mjs` do): one page per section, every fact printed with its quote, timestamp, and call date; `not_captured` rendered as its own titled section, neutral gray, verb "develop" not "missed".
- **What Increment 0's `answer_value` amendment must capture for non-lossiness:** (a) the **typed value** itself, not just ask-state — without it the sheet is an empty envelope; (b) `answer_citation` as a **verbatim span with char offsets + audio timestamp + speaker**, or `source` can't be built; (c) the span's **language tag** (bilingual invariant #4); (d) `rubric_version` stamped per check (versioning §5); (e) values flowing into `intake_feature_snapshot` so a sheet regenerated later reflects what was known at signing.

## 4. The pitch paragraph

> The Intake Fact Sheet is every case-making fact your intake call actually captured — coverage, mechanism, first-reported symptoms, witnesses, priors — each one cited to the recording with a timestamp and the caller's verbatim words, in the language they said it, from day zero. Hand it to your demand vendor or your own paralegal: it's neutral JSON plus a one-page PDF that any demand workflow can consume. It also tells you what *wasn't* captured — an explicit, computed list of the questions never asked or never answered, so the gaps get developed before the demand gets written, not discovered by the adjuster after.

*(§VII: customer-facing copy — Ali/Yang approval before any external use. "Unlike anything else in the stack" was removed in QC: our own battle card verifies Supio surfaces missed SOP questions, so the comparative was unsubstantiated (§V). The feature sells without it.)*

## 5. Confidentiality & transfer

- **Firm-eyes-only delivery.** We generate and deliver the sheet to the authenticated firm only — **we never transmit it to any third party.** Onward disclosure to a demand vendor is the firm's act, under the firm's own Rule 1.6 authorization, Rule 5.3 vendor-supervision duties, and its vendor agreements. Mirror of the retrodiction playbook's posture: we record, we never broker. The pull-only, no-push-integration architecture is this compliance position expressed as design.
- **Signed-only gate as the Rule 1.18 mitigation.** The sheet exists only for signed clients (`case_disposition: "signed"`), so prospective-client confidentiality exposure is structurally mooted — state this as the reason for the gate, not just a product choice.
- **Deletion cascade (§VI)** explicitly covers generated sheets, their checksums, and any rendered PDFs — offboarding or a deletion request removes derived artifacts, not just source rows.
- **Third-party PII defaults conservative.** Witness/third-party phone and address ship only when the firm's redaction config affirmatively enables them; the default for a vendor-bound document is the most conservative setting (names + contact_status, no contact details).

## 6. Versioning

- **Two version stamps:** `fact_sheet_version` (document shape, this spec = 1.0) and `rubric_version` (the fact ontology, riding the existing question-catalog versioning).
- **Additive-only ontology.** Keys are never renamed, repurposed, or re-typed — only added (new case type ⇒ new keys, e.g. `dogbite.prior_bite_history`). A key's semantics are frozen at first ship; a semantic change means a *new* key and the old one goes quiet. Historical exports therefore never need migration.
- **Consumer contract for unknown keys:** ignore-and-preserve. A demand tool encountering an unrecognized `facts.*` key or `not_captured` entry must not error and should pass it through untouched; the envelope shape (`value/source/asked_state/confidence/as_of`) is guaranteed stable across all 1.x, so unknown keys are still renderable generically ("fact + quote + citation"). Breaking envelope changes ⇒ `fact_sheet_version: 2.0`, published alongside 1.x, never replacing it in place.

**Explicitly not in v0:** no push integrations (neutral pull export only, per the frenemy caveat), no demand drafting, no value ranges, no CMS write-back.

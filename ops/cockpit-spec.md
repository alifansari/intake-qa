# The Intake Cockpit — product & build spec

Status: **active build, started 2026-07-16.** Supersedes the "independent audit /
monthly report" framing for the daily-use surface. The audit/scorecard survives as a
*separate* surface (see "Two surfaces" below). Full research backing:
`memory/intake-cockpit-spec-2026-07-16.md` and `memory/intake-decline-evidence-2026-07-16.md`.

## The one line

The screen an intake specialist lives in during a call: it hands them the words,
captures the facts, applies the firm's own law-configured judgment live, and writes the
file — so the human does the one thing only a human can, which is be present with a
frightened person.

## Why this shape (the governing constraints, all research-backed)

1. **A talking person cannot read prose** (articulatory suppression). Live view = 1–3
   word chips + color + position. Sentences live before/after the call only.
2. **Dark cockpit** (aviation): near-empty by default; an element appears only as an
   exception, and every exception carries its *action*, not a bare label. Three urgency
   tiers ranked by the response demanded: red = interrupt now · amber = before hang-up ·
   neutral = normal. One interrupt at a time.
3. **Capture silently, confirm at wrap-up** (the contact-center giants moved all semantic
   work off the live moment). The specialist does not verify each field mid-sentence.
4. **Empathy before facts** (PI intake craft): the first cue is an acknowledgment prompt,
   never a data field.
5. **The machine never declines** — only a human does. Engine moves = sign / develop /
   needs-a-lawyer. This zeroes the false-negative rate by construction, keeps UPL clean
   (the adverse call is always the firm's), and makes every decline an explicit human act
   with a recorded reason — which is the only way to capture the decline dataset nobody has.
6. **Never wire the cockpit to a scorecard the specialist is judged on** (three independent
   sources). Cockpit = ProQA (daily, ignorable, consequence-free). Scorecard = AQUA
   (separate, periodic, the measurement).

## The two analogs that are the spine

- **ProQA (911 dispatch):** locked protocol engine → live decision-support that hands the
  operator words → *separate* QA scorer (AQUA) → became the standard of care because
  insurers require it. Flow Case Entry → Key Questions → Determinant Code → Instructions
  maps 1:1 onto capture → triage questions → grade → next step.
- **Ambient medical scribe:** "nothing gets typed" proven (burnout 51.9%→38.8%), with the
  warning that is our moat — 31% of ambient notes hallucinate, so the fact must carry its
  source quote and turn green only on human confirm. Our citation guard already does this.

## The screen (live view)

- **Left — WHO.** Caller name/phone, "3rd call", prior transcript, what we already know.
- **Center — THE FACT LEDGER.** Facts as they land, each with the quote it came from.
  Three glance states: green = heard clean + quote-verified (rep does nothing) · amber =
  inferred/low-confidence (a quiet exception) · grey = missing and it matters.
- **Right, top, one thing — THE NEXT QUESTION.** The single highest-value-of-information
  question, phrased as a warm thing to say. Empathy prompt first, before any screening.
- **Right, mid — THE VERDICT.** sign / develop / needs-a-lawyer as one quiet tier state in
  a fixed spot. Updates silently as facts land. Never a dollar. Only *interrupts* on a red
  disqualifier.
- **Top — RED INTERRUPTS (only thing allowed to break the call).** SOL running, conflict
  (Rule 1.7), already represented (Rule 4.2), caller isn't the injured party, prior
  recorded statement to the adjuster, a fired CA gate (Prop 213 etc.). One at a time, most
  critical first, each carrying its action, clears the instant it's handled.
- **Wrap-up (hangup) — nothing typed.** Intake file composes; fact ledger confirm/correct
  happens here; write to CRM (Filevine/Lead Docket); cadence schedules; promise ledger
  captures; paralegal handoff packet or non-engagement letter.

## Onboarding: load the attorney's thinking (the sale, one hour)

- Layer 0 — locked CA law engine (Prop 213, MICRA, SOL, ERISA liens). The moat. Not
  configurable because it's not opinion.
- Layer 1 — six-tap firm profile (already built: TriageConsole ProfileEditor).
- Layer 2 — calibration by example (already built: CalibrationDeck). Revealed preference,
  not stated. Experts recognize their criteria, can't state them.
- Layer 3 — every correction + human-decline reason feeds back.

## Data flow (what's real today)

- Engine: `scoring-v2/triage-live.mjs` via `src/lib/desk/triage-engine.mjs` `runTriage()`
  — pure, deterministic, instant, no LLM. Verdict = {grade{letter,color,headline},
  disposition, value_tier, driving_reason, flip_fact, sol{urgency,deadline_date,
  days_remaining,statute,disclaimer}, ca_gates{fired,review}, next_questions,
  ranked_actions, attorney_review_required}.
- `POST /api/desk/triage` — **persists** a case (the wrap-up commit).
- `POST /api/desk/triage/preview` — runs the engine, **no persist** (the live grade). NEW.
- `PATCH` — disposition/status + outcome capture (signed_where, decline_reason).
- `PUT` — save firm profile.

## Build sequence (the program)

- [x] **Slice 1 — the fused single screen.** `/desk/cockpit`: empathy prompt, fact ledger
  with capture states, one-question, quiet live verdict (debounced preview, no persist),
  red-interrupt row (SOL / represented / not-claimant / recorded-statement / CA gates),
  wrap-up "save to callback queue" commit. Reuses the real engine. No mic yet.
- [x] **Slice 2 — live transcription capture (the mic).** DONE 2026-07-16. New
  `ListeningPanel` (consent + browser speech-recog, reuses `/api/coach/consent` — same §632
  gate + entitlement, deny-by-default) + new `POST /api/desk/cockpit/extract` (entitlement-
  gated Claude call, maps transcript → the engine's controlled vocabulary, every suggestion
  carries its verbatim quote + confidence tier, server-side sanitize drops any quoteless
  suggestion = §IV). Suggestions render as amber "confirm to apply" rows; NOTHING auto-fills
  the graded form — the human confirms each (ambient-scribe hallucination guard). Cockpit page
  resolves `isLiveCoachEntitled` and passes `listenEnabled`. build 0, 667/667.
- [ ] **Slice 3 — the wrap-up + Filevine write-back.** Compose the intake file; real
  Filevine (then Lead Docket) create-matter write-back with per-firm field mapping.
- [ ] **Slice 4 — the send console + cadence.** Draft exists (`messaging/draft.mjs`, CLI-only).
  Add the button + evidence-of-human-press record (TCPA manual-send defense) + the
  6-attempt front-loaded cadence, call-then-text, 8am–9pm, STOP suppression. Firm's staff
  send from the cockpit (or link the firm's own text number). NOVEL REGULATED → Yang before
  any automated leg; manual-send button is safe.
- [ ] **Slice 5 — screen-pop** (needs the firm's CallRail pre-call webhook configured).
- [ ] **Slice 6 — promise ledger + paralegal handoff packet + non-engagement letter.**

## Slice 1.5 — the "rail" redesign (effortless UX). DESIGNED 2026-07-16, not yet built.

Ali's directive: the cockpit's dense form is "stupid" — make it one-prompt-at-a-time like an
Airtable/Google form but simpler, "brain-numbingly simple." 8+ research streams (mix of this
session + parallel). The evidence corrects the naive read and locks a specific design.

**THE CORE PRINCIPLE: guided-FEEL, keyboard-FAST, record-VISIBLE, layout-FROZEN.** NOT literal
Typeform (its 47.3%-completion stat is vendor data on one-time novices; NN/G's Wizards article
names repetitive expert entry — our 40x/day operators — as the anti-pattern: "the repeated
switching... can quickly become tiresome vs just tabbing through"). The win here is NOT
completion (operators complete every call) — it's SPEED + ERROR-RATE at 40x/day.

**THE RAIL (the shape):**
- ONE prominent ACTIVE prompt at a time, in a FIXED on-screen position that NEVER moves
  (power-law-of-practice: the 40th call must be physically identical to the 1st, or muscle
  memory resets — this is why prompts must NOT slide/reflow).
- Answered facts accumulate as small green CHIPS in a SEPARATE RESERVED area (not pushing the
  active zone). Tap any chip to reopen/correct. Keeps the record visible (operators are power
  users who need overview — recognition-over-recall).
- A couple of faint upcoming-prompt hints below (never a black box).

**TWO WAYS A PROMPT IS ANSWERED:**
1. VOICE (primary, listening): confidence-conditional = the literature-standard "two-threshold,
   three-outcome" scheme (Komatani+11.5%; Danieli/Gerbino; NJFun; San-Segundo). HIGH conf →
   fact just LANDS green + one-tap UNDO (do NOT ask — confirmation fatigue: people ignore >50%
   of confirms; undo beats confirm dialogs, Raskin/NN-G). MEDIUM → amber, one-tap confirm. LOW
   → omit. (Later refinement: per-fact-type thresholds, not one global cutoff — Bohus/Rudnicky.)
2. TAP (fallback + correction): big letter-labeled (A/B/C) buttons, full-width, >=48px, ~8px
   apart (beats dropdowns for <=5 opts; Typeform found removing letters HURT completion),
   auto-advance on select (NEVER auto-submit — WCAG F36; always a visible Back). Correction is
   ALWAYS a TAP, never respeak (Suhm 2001: respeaking traps ~20wpm + re-triggers the same
   error; switching modality is faster + mutual disambiguation recovers ~1-in-8, biggest gains
   for accented/Spanish callers — Oviatt).

**PROMPT SEQUENCE (ordered to the call arc, intake-craft research):** 0 CONSENT (first, active,
ONE tap "Everyone agreed to be recorded — Yes, start" = the §632 gate reframed as prompt 0;
active affirmation, CANNOT be pre-checked — flagged to Ali) + the empathy opener to SAY · 1 Who
(name/phone, minimal typing) · 2 What happened (case type → branches) · 3 When (SOL clock) · 4
Whose fault · 5 How badly hurt · 6 Treated (ER/ambulance/ongoing) · 7 Coverage · branches only
when relevant. Red interrupts (represented/not-claimant/recorded-statement/SOL/CA gates) are NOT
in the sequence — they surface as a Stop banner only when triggered.

**KEYBOARD MAP (expert fast-lane, Nielsen heuristic #7 — add it, don't force it):** A-E pick the
active option · Enter confirm a heard suggestion · up/down move between prompts · click any chip
to reopen · everything also fully tap-able (novice never needs a key, expert never forced to
mouse). Command-palette-style visible shortcut hints = the self-teaching graduation ramp
(Superhuman).

**EVIDENCE-RANKED MICRO-RULES:** inline validation on BLUR (best-proven upgrade; "reward early
punish late" — clear an errored field live on keystroke) · NEVER wipe the form on error
(GOV.UK/NHS, least-disputed) · forgiving parse-and-normalize for phone/date (accept any format —
89% ignore the example; but dates need explicit field-order, "9-3-17" is ambiguous) · REAL smart
defaults (CA, car accident) as selected values, never placeholder, NEVER consent · primary
actions at BOTTOM (thumb zone, ~49% one-handed) · optimistic render <400ms (Doherty), no spinners
· MODELESS (mic on/off is the one allowed mode — make it loud) · no "Are you sure?", no dead ends.

**MASTER PRINCIPLE — Tesler's Law:** the tool absorbs the complexity; DERIVE every fact the
engine can, default aggressively, the operator only touches exceptions.

**HONESTY CAVEATS (do not overclaim):** the robust levers are DEFAULTS, SPEED, STABLE LAYOUT,
FIELD REDUCTION. The "conversational forms 2x completion" (vendor, wrong audience), "paradox of
choice" (failed to replicate), Etre 22%/42% inline-validation digits (n=22, self-disclaimed),
and Hick's/Miller's applied to visible-item-counts (they're about DECISIONS/MEMORY, not visible
rows) are all weaker than their reputation — use direction, not digits.

**FIVE MECHANICS STOLEN FROM ProQA/MPDS (the 911 dispatch analog — median 51s to a determinant
across 3.16M calls; the closest shipping product to this):**
1. **Cursor Priority (pre-highlighted default):** the most-likely answer is pre-selected on the
   active prompt; the operator CONFIRMS with one key/tap rather than composes. This is where
   sub-60s speed comes from. (Marries smart-defaults + confidence-conditional.)
2. **Order guidance by DECISIVENESS, front-load disqualifiers:** the ONE QUESTION always
   surfaces the most decisive uncaptured gap (SOL/liability/contact/coverage) so declines
   resolve in seconds and only survivors reach the long tail. (The rail can follow the natural
   call arc for the by-hand fallback; the *guidance* is decisiveness-ordered — value-of-info.)
3. **Shunt, never restart:** changing case type mid-call (caller said "car accident," it's
   really uninsured-motorist or premises) re-branches WITHOUT losing captured facts. (ProQA's
   Target Tool / auto-shunt.)
4. **★ ASYMMETRIC OVERRIDE — directly serves the "which of your noes were wrong" data thesis:**
   the operator may freely ESCALATE toward caution (flag for attorney, keep a marginal case
   alive), but the DECLINE direction is GATED — declining a case the engine flagged viable
   REQUIRES a logged reason/review. MPDS: "send higher freely; send lower only with
   justification." This IS the survivorship-free decline capture. Strengthen slice-1's decline
   to require a reason when engine != decline.
5. **★ TIER THE SCRIPTING (AQUA rule — avoids the robotic-intake failure):** lock VERBATIM only
   the legally load-bearing lines (consent §632, the "not legal advice / no attorney-client
   relationship yet" UPL line, TCPA/recording language). EVERYTHING ELSE is a conversational
   CHECKLIST the specialist delivers in their own words, graded on meaning not words. The
   nurse-triage field converged on "checklist NOT script" because reading questions in sequence
   "sounds robotic rather than caring" (57% of dispatch delays came from unnecessary scripted
   questions). So the empathy opener + fact prompts GUIDE what to capture — they are NOT a
   script to recite. Only consent/UPL/TCPA are locked words.

**MORE VERIFIED NUMBERS (build ammo, evidence-tiered):** speech input ~3x faster than typing
(Ruan/Stanford 2016, 153 vs 52 wpm, peer-reviewed) = why voice is primary. Dropdowns = "last
resort," use radios/pills for <=5 opts (GOV.UK gov research). Default effect: opt-out organ
donation 42%->82% (Johnson&Goldstein, Science) = defaults are the strongest lever — BUT wrong
sticky defaults get silently accepted under load (EHR copy-forward = leading EHR-malpractice
trend) → NEVER default consequential/variable legal facts (liability, injury, whether signed).
Expedia removed ONE optional field = +$12M/yr. Confirm-by-TAP (not respeak) suppresses 19-41%
of ASR errors, biggest gains for accented/Spanish callers (Oviatt, peer-reviewed).

**WHAT CHANGES IN CODE:** the current Cockpit.tsx dense center column becomes the RAIL (fixed
active-prompt zone + reserved chips stack + keyboard layer + Cursor-Priority pre-highlighted
defaults). WHO panel, live verdict, red interrupts, ListeningPanel, wrap-up all STAY.
Confidence-conditional handling (high=land+undo / medium=one-tap / low=omit) replaces "confirm
every suggestion" (slice 2's current behavior). Decline gains a required-reason gate when the
engine flagged viable (asymmetric override). Engine untouched. Big center rewrite, everything
around it stable.

## Records-grade intake record (the "records management" layer — DESIGNED 2026-07-16, mostly a separate build slice)

The intake record must be a professional, defensible legal record, not a lead row. Standards
(full cites in the research; all within §VI):
- **The declined intake is a first-class Rule 1.18 prospective-client record** — SAME
  confidentiality as a client file (Rules 1.6/1.9, B&P §6068(e); CA Formal Op. 2021-205),
  stored with role-based access + segregation (so a lawyer who later takes the adverse side can
  be screened, 1.18(d)). → TWO retention classes: signed vs prospective/declined, different
  clocks. This makes the "capture every decline" data asset and the ethics duty point the SAME way.
- **Complete record fields:** parties incl. ADVERSE parties (for conflicts), source/referral,
  timestamps (first contact / consult / each touch), facts (active capture), CONSENT BASIS
  (recording on/off + exact prompt + timestamp + response = §632 structured field), disposition,
  REASON, handler + deciding attorney, follow-up log.
- **Conflicts check = immutable timestamped sub-record on EVERY intake incl declines** (search
  terms, results, decision + reasoning, reviewing attorney; waivers permanent). An undocumented
  CLEAN check is worthless in defense. Conflicts = #1 malpractice source.
- **Non-engagement (Togstad) letter as record:** *Togstad v. Vesely* 291 N.W.2d 686 — firm said
  "you don't have a case," didn't follow up, SOL ran, ~$650k for negligence to a NON-client.
  Letter must: unambiguously decline · give NO merits opinion · WARN about the deadline · return
  materials · encourage other counsel · sent with delivery confirmation. Letter + record = the
  malpractice-defense package.
- **Audit trail:** append-only, timestamped, actor-attributed for every state change
  (created→consent→conflicts→scored→disposition→letter). Substantive facts WRITE-ONCE,
  corrections as NEW entries never silent overwrite ("an edited 'no case' note that can't be
  dated is a Togstad nightmare"), hash-chained/tamper-evident = admissible. ISO 15489
  (authentic/reliable/integrity/usable) + ARMA GARP 8 principles.
- **Retention by class + LEGAL-HOLD hard-freeze (anti-spoliation) + provable secure disposition**
  (destruction certificate). Deletion NEVER a silent cron. Minimize at collection (Rule 1.18
  cmt 4 — over-harvesting "significantly harmful" facts can disqualify the firm from the OTHER
  side). CA has no bright-line retention (Op. 2001-157; 5yr is a floor not a mandate; watch
  Proposed Op. 19-0004); declined ~5-7yr (malpractice SOL window), minors toll.

## Design-system standards (VALIDATES the existing token system; formalize + extend)

The repo ALREADY uses semantic tokens (bg-surface/text-ink/border-hairline/rounded-card/tnum) =
the correct three-tier pattern (primitive→semantic→component) the top systems use (Carbon,
Polaris, Material). Adopt as explicit standards: **WCAG 2.2 AA is the floor** (specific: 2.4.11
focus-not-obscured-behind-sticky-chrome, 2.5.8 targets ≥24px, 3.3.7 no redundant re-entry, focus
ring ≥3:1 + ≥2px, 1.4.11 non-text contrast 3:1, use-of-color never alone) · **tabular numerals
on ALL aligned data** (the `tnum` class — enforce everywhere) · **every component ships all
states** (empty/loading/error/disabled/hover/focus/active/selected + view-level empty/loading/
error/partial) · 8pt spacing grid · body text ≥14px · **Carbon data-density model + Linear
keyboard-first functional-accent restraint** as the two operator-tool north stars · Material-3
motion tokens (durations 100/150/250/400ms, global reduced-motion scalar; respect
prefers-reduced-motion + prefers-color-scheme) · one-way-to-do-each-thing discipline. North:
"enterprise-grade = discipline, not decoration."

## Standard-of-care positioning (the "IAED of legal intake")

NO accredited standard of care for legal intake exists — the whole opportunity. The IAED 4-part
template maps exactly: (1) a vetted PROTOCOL = the cockpit rail · (2) SOFTWARE that runs it =
the cockpit · (3) a QA case-review/scoring engine = the AQUA analog = the SEPARATE scorecard
surface (never on the cockpit) · (4) accreditation + a "Certified Intake Specialist" credential
(none exists = white space). QA rubric splits **FATAL errors (UPL / consent / Rule 1.18
breaches) vs NON-FATAL (rapport / data gaps)** — COPC/AQUA dichotomy; measure "did we save the
signable case," not politeness. Adaptable frameworks to sit on top of: COPC CX Standard, ISO
18295 (contact centres), ISO 9001. Honest caveat: dispatch became standard-of-care partly via
litigation + insurer pressure; legal intake has no such driver yet, so adoption pull = malpractice-
risk reduction + conversion lift, earned not inherited.

## Record schema / interoperability (SALI)

Map the intake record's case types to **SALI LMSS** (Legal Matter Specification Standard —
18,000+ tags, an actual ontology LMSS.owl, Area-of-Law codes, CC BY ND so freely adoptable,
already used by Am Law firms + LexisNexis/iManage). Using the industry's OWN standard taxonomy =
records-grade classification + clean interoperability into any CRM (vs a bespoke code). This is
the "determinant code" analog for legal intake — a bounded, enumerated, standardized
{facts→classification} that also powers cross-firm analytics + the data moat.

## Rails (compliance-invariants is supreme)

- UPL: the machine never gives a caller a legal opinion; the determination is always the
  firm's (three-move engine, human-only decline = this by construction).
- CIPA §632: the mic (slice 2) stays behind the existing consent gate. Untouched in slice 1.
- TCPA: send (slice 4) is manual-send with an evidence-of-press record; automated legs →
  Yang first.
- §IV: no dollar at intake; any decline/false-negative claim publishes its own n + confidence.
- The 21x/100x/6-call/$284 numbers are general-sales/vendor — never presented as law-firm
  data. Cite Clio 2024 + Martindale-Avvo (legal-specific) instead.

## Open decisions logged

- Ali 2026-07-16: firm's own staff send from the cockpit, and/or link the firm's own text
  number. Reverses the 2026-07-13 "never text the firm's leads" call (which was premised on
  being an independent authority — an identity now discarded).
- Ali 2026-07-16: build Filevine write-back (Sweet James runs Filevine — confirm).
- RESOLVED 2026-07-20 (was: "root CLAUDE.md still describes the old positioning… flag to Ali").
  Ali directed the retirement of the retrospective-scorer-as-the-face; CLAUDE.md "What this is"/
  Mission and decisions.md updated 2026-07-20. The cockpit direction in this spec IS now the
  product's face. Compliance boundary unchanged: flat fee / not-a-fee-participant (§I) stays;
  slice-4 automated send + embedded write-back remain novel-regulated → Yang (§VII).
</content>

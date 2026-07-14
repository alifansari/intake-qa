# Decision Log

> The system's memory. Every material change gets an entry so we never re-litigate a settled
> call and can always ask "did that work?" at the review date. Newest on top.

## Format

```
## YYYY-MM-DD — [decision title]  ·  agent: [which] · lane: [which]
- **Change:** what was proposed/staged/shipped.
- **Hypothesis:** why we believed it would help (link the insight/backlog ref).
- **Expected effect:** which metric should move, by roughly how much, by when.
- **Status:** staged-for-approval | shipped | reverted
- **Review date:** YYYY-MM-DD
- **Result:** (filled at review) moved / flat / worse → keep | iterate | revert
```

## Standing prior decisions (locked; do not re-open without new evidence)

- **Flat monthly pricing, never outcome-tied** (Rule 5.4 / B&P §§6151–6152 / SB 37). Core ~$2,500,
  Pro ~$5,000. A per-case pricing defect was found live and corrected — it must never return.
- **Positioning: independent intake desk / independent scorer**, Ali as "Analyst of Record,"
  not a fee participant. (Renamed from "independent recovery desk" 2026-07-12 to drop the §I
  fee-participation optics of "recovery"; the compliance negations "never a share of any
  recovery" are load-bearing and unchanged.)
- **Scorer -> Closer is a SEQUENCE, not a switch** (2026-07-12): the independent scorer is the
  wedge (free audit, low regulatory downside, best trust-fit); the bilingual voice "closer" is
  a later, supervised, human-approved EXPANSION act sold only to already-trusting firms on their
  own proven leak, never the hero, never "empathetic AI," and its per-signed-case pricing must
  clear Yang against §I first. Falsifiable resequencing trigger: if beta firms take the free
  audit and audit->paid stalls at the "great, now what?" gap, the scorer is under-delivering on
  the emotion it manufactures and the closer moves up.
- **Wedge: free Leak Audit** leads every outreach.
- **Owned newsletter + LinkedIn are the primary distribution rails**; Dream 25 dimensional mailer
  replaced the 150-firm generic blast.
- **Yang = backstage compliance reviewer / named methodology endorser**, not outcome endorser.
- **Citation guard: "no citation, no claim"**; deletion cascade; published false-alarm rate.
- **Manifesto "The Unscored Conversation"** hosted at plaintiffops.com/letter with signed
  attestation block.

---

## 2026-07-12 — GOVERNANCE: agents may now deploy to production (§VII amended, "broad")  ·  agent: main session · lane: governance (§VII)
- **Change:** Ali's explicit, informed decision (chose "broad" over the recommended "scoped"
  option after the Rule 7.1/7.2 exposure was flagged twice): agents MAY now deploy the site/app
  to production autonomously — including changes carrying new product claims, pricing display,
  and comparative claims — provided the build is green and the full pre-ship checklist passes.
  Amended compliance-invariants §III + §VII + pre-ship item 7; updated CLAUDE.md protocol step 3
  and the agents footer. Also renamed the §I / CLAUDE.md positioning label recovery->intake desk.
- **What did NOT change (still human-gated):** sending outreach / social / prospect email
  (TCPA / CAN-SPAM / Rule 7.3), DNS / secrets / billing config, data deletion beyond the cascade,
  and anything novel in a regulated area (fee STRUCTURE, consent design, solicitation) -> Yang.
  Content bright-lines §I/§II/§IV/§V/§VI still bind every deploy: loosening WHO deploys did not
  loosen WHAT may be said; a green build is necessary but not sufficient.
- **Flagged risk (honest, per §VIII):** removing the human eye on public product claims raises
  real Rule 7.1/7.2 marketing-truthfulness exposure on a bar-regulated, law-firm-facing site.
  The pre-ship checklist is now the load-bearing control; if it is under-run, unvetted claims can
  reach prod. Routed to Yang for review (warm contact, not a hard block on this internal change).
- **Status:** adopted by Ali; live in the docs; Yang review pending.
- **Review date:** 2026-08-15

## 2026-07-12 — Ali clears deploy blockers: letter re-signed + pricing approved  ·  agent: main session · lane: pricing/website (§VII)
- **Change:** Ali (principal) explicitly (a) re-signed Letter v1.4, clearing the
  "awaits Ali re-sign before deploy" gate on commit 55b4d04, and (b) approved the pricing table,
  resolving the 2026-07-10 three-way split (see that entry: Core $2,500 / Pro $5,000 / Charter
  $1,500-intro). STANDING DIRECTIVE from Ali: the beta is the primary public focus right now, not
  the pricing; Table C dollar figures stay internal and are not surfaced on public pages during
  the beta window. Verified 2026-07-12: no PRICING_TIERS/CHARTER dollar figures render on any
  public page (the only $2,500/$5,000 on-site are §632/§637.2 statutory-fine citations on
  /compliance); /pricing remains "free during the beta."
- **Deploy state:** local main is 51 commits ahead of origin/main and unpushed; both substantive
  blockers are now cleared by Ali. The production publish (git push origin main -> Vercel ->
  plaintiffops.com) remains a §VII human-executed action; the agent staged and verified, Ali
  presses publish.
- **Status:** approvals logged; push pending Ali (human-gated per §VII).
- **Review date:** 2026-08-15

## 2026-07-12 — Copy Power Pass (2-round research + 3 adversarial red-teams)  ·  agent: main session · lane: website
- **Change:** Staged `ops/drafts/copy-power-pass-2026-07-12.md`. Two research rounds (6 deep-research
  streams + 3 red-teams: CA-ethics, skeptical-partner, gap-strategist). Net recommendations, all
  staged for Ali: (1) positioning is a **scorer -> closer SEQUENCE** (scorer = wedge; closer =
  sequenced supervised expansion, Yang must clear §I pricing first), not a switch to voice; (2) real
  funnel leverage is **/audit uploader confidentiality copy + the kept report + the letter's open**,
  not the homepage hero; (3) **kill the "thirty years / these calls" adversary hero** (false
  antecedent + uncited + surveillance optics — both red-teams converged) → compliant rewrite
  "The insurance side has scored injury claims with software for decades…"; (4) ship de-dashed Hero A;
  (5) build the independence comparison table + four-failure-mode reason-why; (6) fix "why month six
  exists" (standing instrument, not recurring bad news); (7) compliance fixes: reconcile $284 vs
  $131.63 CPL, kill "gone for good," M&M sanction = internal-only, lock "responds *helpfully*,"
  "that lead" → cases; (8) recommend renaming away from "recovery" → "independent intake desk";
  (9) route the "I charge nothing until…" sub-quote to Yang for fee-optics.
- **Hypothesis:** Sharper on-identity frames + fixing the highest-abandonment step (upload) + a
  forwardable proof artifact lift audit-start and audit→paid more than hero polish does.
- **Expected effect:** Leak Audits started + audit→beta conversion; no numeric target pre-cohort.
- **Status:** BUILT in working tree, pending Ali deploy (crosses §VII). Ali-approved on 2026-07-12:
  scorer->closer sequence + trigger adopted; de-dashed Hero A shipped; "recovery"->"intake desk"
  rename applied sitewide (public labels + PDFs + SEO/OG); /audit uploader confidentiality+
  independence block, homepage independence comparison table, and four-failure-mode reason-why
  built; MONTH_6 reframed to the standing-instrument framing; hero subhead made §IV-safe
  ("estimated", "callers our analysis marks as signable"). NOT deployed by agent. Still open:
  the adversary hero rewrite (Yang, not in this batch), the `/letter` still says "recovery desk"
  and defends the word (needs a version-bump edit + sign-off), the full-site em-dash sweep beyond
  the homepage hero, and confirming the exact Clio source before adding the 40%/79% StatBar pair.
- **Review date:** 2026-08-15
- **Result:** (pending)
## 2026-07-11 — Beta Session 7: Conversion machinery (B-010/011/012/013)  ·  agent: product-dev session · lane: product
The four highest-ICE desk items that make the queue survive week 3, on branch
`beta/s7-conversion` (off `beta/integration`), NOT pushed. All view logic lives in
`web/src/lib/desk/queue-view.mjs` (pure, unit-tested); UI in `web/src/app/desk/queue/page.tsx`
+ `web/src/components/desk/LeakCard.tsx`. Migrations renumbered to avoid sibling collision:
SQLite `0029_flag_status_attempts.sql`, Postgres `0037_flag_status_attempts.sql`.

- **B-010 — Queue hygiene (ICE 512).**
  - **Change:** `partitionLeaks()` splits the queue into an active list sorted oldest-actionable
    first (longest-waiting caller is the top card) and a collapsed `<details>` "Handled" pile for
    terminal cards (signed / passed / bad number), each rendered as one slim `compact` row with a
    Reopen. Replaced the ad-hoc inline TERMINAL filter on the page.
  - **Hypothesis:** the desk stays a "today's list," not a graveyard, so daily use survives week 3
    (2026-07-10 field guide: one screen / one queue / one next action).
  - **Expected effect:** desk daily-active retention through week 3 of a pilot.
  - **Status:** shipped (branch, unpushed). **Review date:** 2026-08-01.

- **B-013 — Honest elapsed-time urgency (ICE 216).**
  - **Change:** `callUrgency()` renders escalating visual weight from time-since-call only
    (fresh <2d → aging 2–6d → amber "urgent" 7d+), computed on the SERVER clock (no hydration
    drift). Deleted the vaporware footnote that promised "statute clocks" and the `TODO(Ali)` to
    wire `sol.mjs`; the footnote now says the waiting time is a callback reminder and
    "statute-of-limitations tracking stays with your attorneys."
  - **COMPLIANCE RAIL:** never computes or displays a statute-of-limitations deadline date —
    urgency flags and elapsed days only; the firm's lawyer owns deadlines. Pinned by unit tests
    that assert no date / no "statute|deadline|expires" ever appears in a label.
  - **Hypothesis:** partner urgency + trust rise from honest time pressure without us practicing
    law; the footnote's promise becomes true instead of vaporware.
  - **Status:** shipped (branch, unpushed). **Review date:** 2026-08-01.

- **B-011 — Attempt-count nudge toward 6 touches (ICE 336).**
  - **Change:** added `attempts` + `last_attempt_at` columns on `flag_status`; each logged touch
    ("Left a message" / "Left another message" / "Spoke to them") increments the counter in the
    single `setFlagStatus` chokepoint (terminal outcomes and undo never count; the guarded digest
    write can't double-count a replayed stale link). `attemptNudge()` shows encouragement grounded
    in the callback science (Velocify 3.5M leads: 93% of conversions by call 6, most firms stop at
    2): calls 1–2 legitimize the next try, 3–5 credit the range, 6+ credits a full effort and hands
    judgment back. Silent before the first attempt and on any terminal outcome.
  - **Tone rail:** encouragement, never surveillance — no red number, no "only N calls," no quota,
    no comparison; pinned by a test that forbids only/must/required/behind/failed in any nudge.
  - **Hypothesis:** legitimizing persistence as process lifts rescue→sign rate.
  - **Status:** shipped (branch, unpushed). **Review date:** 2026-08-01.

- **B-012 — Coordinator "your wins" tally (ICE 280).**
  - **Change:** extended the existing wins strip from "Your week" to "Your wins this week" and added
    a personal, credit-framed line — signed cases → "started with your callbacks, worth saying out
    loud in Friday's meeting"; reached-but-not-yet-signed → "every conversation started with your
    callback, signatures usually follow." Her own tally only.
  - **Rail:** no leaderboard, no staff-vs-staff comparison, nothing here is a score (per-case
    bonuses are ethically barred; recognition is the only upside the tool can offer her).
  - **Hypothesis:** the desk becomes her recognition ammunition, holding daily engagement.
  - **Status:** shipped (branch, unpushed). **Review date:** 2026-08-01.

- **Verification:** `npm run smoke && npm test && npm run e2e-synthetic && npm run build` all green;
  470 tests pass (19 new). One build fix: the hand-written declaration had to be `queue-view.d.mts`
  (not `.d.ts`) so the explicit `.mjs` import picks up the precise `tone` union under
  `moduleResolution: bundler` instead of falling back to widened JS inference.

## 2026-07-11 — Beta Session 1: CallRail webhook bulletproofing  ·  agent: product-dev session · lane: product
- **Change (branch `beta/s1-callrail`, NOT pushed):** (1) Researched CallRail's REAL
  webhook signature spec against their docs (apidocs.callrail.com → Security →
  Validating Payloads): header `Signature`, **HMAC-SHA1 of the raw body, Base64** —
  NOT the sha256-hex our code assumed; their published test vector (key
  `072e77e426f92738a72fe23c4d1953b4` → `UZAHbUdfm3GqL7qzilGozGzWV64=`) is now a
  bundled fixture and reproduces exactly. `verifyCallRailSignature` accepts the
  documented format first, then sha256-base64 / sha256-hex (back-compat) / sha1-hex,
  and logs which format matched on each firm's first verified webhook. (2)
  `scripts/callrail-verify.mjs` — setup-call diagnostic: feed it a captured webhook +
  secret, it names the matching format or prints every computed digest
  (`--self-check` runs the docs vector). (3) Founder-only per-firm secret entry:
  `/api/studio/callrail-secret` (Zod, store-seam `setFirmCallRailSecret`) + a
  CallRail-signing-key card on `/studio/onboard-firm` (incl. the onboarding success
  panel) — no more manual DB edits, firms #2+ stop 401ing. (4)
  `scripts/callrail-selftest.mjs` — POSTs a synthetic correctly-signed payload at
  `/webhooks/callrail/<firm>`: asserts 200+call row, replay dedupe, and 401 on bad
  signature — every setup call ends on a green check. (5) Failure loudness: webhook
  401/400 now writes `error_log` (`webhooks.callrail*.bad_signature/.bad_payload`)
  with firm slug, reason, formats tried. (6) `ops/drafts/callrail-setup-runbook.md` —
  the 10-minute setup-call script.
- **Hypothesis:** the #1 predicted week-1 killer is a silent signature 401 → firm sees
  "0 calls" forever; verifying the *documented* format + per-firm secrets + a
  self-test converts that failure mode into a 2-minute visible fix.
- **Expected effect:** firm #1 setup call ends verified-green Monday 7/14; zero
  silent-ingest incidents in week 1.
- **Depends on:** migration 0034 applied to hosted Supabase before any per-firm key
  is saved (the save button reports this plainly if missing).
- **Status:** staged on branch (442 tests pass incl. 18 new signature tests, build green);
  merge before Monday deploy
- **Review date:** 2026-07-18 (end of beta week 1)

---
## 2026-07-11 — Beta S2: firm self-serve MP3 upload (/desk/upload) + upload-cap honesty  ·  agent: product-dev session · lane: product

- **Change (branch `beta/s2-upload`, NOT pushed):** (1) `/desk/upload` — firm-scoped
  recording upload (MP3/M4A/WAV): signed-URL storage mode reusing the studio 200MB
  pattern (`desk/<firmId>/<uuid>` in the private studio-audio bucket, object deleted the
  moment it's transcribed) with a direct-body fallback when storage isn't configured;
  required CIPA consent attestation (Zod `literal(true)` + per-call
  `consent_status='consented'`); each upload becomes a normal `calls` row (source
  `manual`, filename carried in `external_call_id` as `upload:<uuid>:<name>` — no
  migration needed) and fires the SAME `intakeqa/call.received` → scorePipeline path as
  the webhook, 15-min sweep as the net. (2) Per-file firm-visible status
  (waiting → scoring → done | failed) polled from GET `/api/desk/uploads`, derived from
  the pipeline's own rows — **failed_scoring is now visible to the firm**, not DB-only.
  (3) Upload-cap honesty: demo/audit caps now derive from mode (signed-URL = 200MB,
  direct = 25MB local / 4MB Vercel); `/audit` + `/demo` fetch the real cap from a new
  GET `/api/demo/upload-url` probe instead of promising a hard-coded 25MB; friendly
  plain-English size/type errors everywhere ("That file is a video — export the audio as
  an MP3…"). (4) "Upload calls" added to desk nav + upload path made first-class in
  HowCallsArrive with a `/desk/upload` CTA.
- **Hypothesis:** a firm without working CallRail currently emails files to Ali for
  hand-CLI ingestion — invisible to the firm and unscalable past 1–2 firms; self-serve
  upload with honest per-file status removes the founder bottleneck before Monday's beta
  and makes silent scoring failures impossible to miss.
- **Expected effect:** every beta firm can get calls scored on day 0 without CallRail;
  zero "did you get my files?" emails; upload-page copy always equals server reality.
- **Verification:** smoke PASS, 430/430 tests (6 new in `tests/desk-upload.test.mjs`),
  e2e-synthetic all stages PASS, production build PASS, lint at pre-existing baseline.
  Live TEST_MODE run on local SQLite: real spoken WAV → `/api/desk/uploads/direct` →
  AssemblyAI transcription → Claude scoring → flag row → status `done`; forced failure
  (deleted recording) → `failed_scoring` → firm-visible `failed` + founder error log.
  Consent-missing and video-file uploads refused with plain-English errors.
- **Deferred:** storage objects for never-transcribed (permanently failing) uploads are
  not garbage-collected; failed calls are retried by every 15-min sweep (pre-existing
  behavior, costs a transcribe+score attempt per cycle — worth a retry cap); Inngest
  event key absent locally means sweep-only scoring (hosted has the key).
- **Status:** built on branch, awaiting Ali review/merge (nothing pushed).
- **Review date:** 2026-07-18 (first beta week — count uploads + failure surfacing).
## 2026-07-11 — Session 4: onboarding autopilot + beta comms kit  ·  agent: main session · lane: product-dev
- **Change:** Closed the onboarding→sign-in gap for Monday's beta. (1) `/api/studio/onboard-firm`
  now composes the complete, firm-personalized welcome email server-side (new pure module
  `web/messaging/welcome-email.mjs`): sign-in link + temp password (or magic-link line for
  linked accounts), the firm's private CallRail webhook URL with "forward to whoever runs your
  phones," the `/desk/upload` fallback, a first-48-hours plan incl. digest timing, and a support
  line built from `FOUNDER_NAME`/`FOUNDER_EMAIL` (site-constants) + `FOUNDER_PHONE` (env) —
  never hardcoded. The REDACTED copy (temp password masked) persists to a new `welcome_emails`
  table (Postgres migration **0036**, SQLite twin **0028** — renumbered up one from 0035/0027 to
  dodge a sibling session's collision; RLS on, no policy, founder-surface only). The studio
  onboarding success card surfaces the email with a copy button plus a two-click-confirm **Send**
  button that hits new founder-gated route `/api/studio/send-welcome`. (2) Beta cadence templates
  staged in `ops/drafts/beta-comms-kit.md` (Day-0/1/3/7, incident note, 15-min setup-call agenda;
  counts-only, no dollars, credit framing; defers CallRail mechanics to the Session-1 runbook).
  (3) `DEMO_SCRIPT.md` rewritten to the persona field guides: their-calls-first, coordinator-sees-
  her-own-calls-first, ranges-only ROI, the refuted $468/400% stats explicitly benched per the
  copy audit. (4) Apply form now collects `records_calls` (yes/no/not-sure) + `spanish_call_pct`
  (rough bands), Zod-validated at the API boundary and threaded into `qualify()` so the
  `not_recording_yet` note fires ONLY on a truthful "no" (silence/"not sure" → `recording_status_unknown`).
- **Hypothesis:** A one-email, no-forgotten-field onboarding + a consistent cadence reduces
  beta-firm setup friction (the #1 activation risk) and keeps every firm-facing word compliant;
  honest qualification signals stop polluting the applicant review.
- **Expected effect:** Faster firm activation (sign-in → first calls flowing) across the founding
  cohort onboarded starting 2026-07-14; fewer stranded-at-sign-in support pings; cleaner applicant
  triage. No public metric until firms onboard.
- **Status:** staged-for-approval — everything firm-facing is founder-gated. The Send button
  transmits ONLY on the founder's confirming click AND `EMAIL_ENABLED=true` AND a Resend key
  (KILL_SWITCH halts all); default posture transmits nothing and says so. Comms kit + demo script
  are drafts Ali sends/uses by hand. Code paths (onboard-firm compose, apply-form fields, qualify)
  are backend/internal and ship on merge.
- **Review date:** 2026-07-21
- **Result:** (filled at review)

## 2026-07-10 — Engine-v2 Wave 10: LACBA piece QC-cleared ×2 + channel verdict  ·  agent: main session · lane: outreach
- **Change:** QC pass #2 on the five-questions piece (verdict → fixes applied → **CLEARED FOR
  YANG READ**): §3333.4(c) DUI exception narrowed to its true owner-only scope (the one
  statutory-precision miss left after pass 1); Q1 verbatim un-stacked; byline unified;
  3 prepared hostile-reply responses staged in the file. Channel research
  (`publication-channel-brief.md`): **LACBA listservs are closed to vendor content per
  published guidelines — direct or by proxy** (proxy = policy dodge, rejected). New
  distribution path: LinkedIn + newsletter now (post-Yang), CAALA Affiliate ($400/yr) +
  Advocate magazine pitch (staged email in the brief), LACBA paid sponsorship for brand
  presence. `lacba-beta-post.md` must be re-checked against the same rules before use.
- **Expected effect:** the authority asset ships through channels that can't blow up; avoids
  the vendor-on-the-listserv failure mode entirely.
- **Status:** piece staged-for-approval (gates: Yang read via Packet #2, Ali posts); pitch
  email staged (Ali sends); CAALA membership = Ali's spend decision.
- **Review date:** 2026-07-24

## 2026-07-10 — ⚠ OPEN DECISION FOR ALI: pricing three-way split  ·  agent: main session (Wave 8 QC finding) · lane: pricing (§VII)
- **Change:** none — this is an escalation, not a decision. Wave 8 adversarial QC found THREE
  inconsistent price tables circulating in staged docs: (1) compliance-invariants §I (supreme
  authority): Core ~$2,500 / Pro ~$5,000; (2) develop-queue-GTM: Founding $1,000 / Core
  $1,500 / Pro $3,000 — while falsely claiming to be "anchored to existing invariants" (line
  now corrected with a warning block); (3) the 2026-07-09 decisions entry: "locked
  $1,500/$2,500/$5,000". Every downstream artifact inherits whichever table its author read —
  the Supio battle card quoted $1,500 (a 40% unauthorized discount if §I is right).
- **Interim rule applied everywhere:** no dollar figure in any collateral or aloud to any
  prospect ("flat monthly price quoted in writing up front") until resolved.
- **Needed from Ali:** pick ONE table; write it into compliance-invariants §I and a dated
  decisions entry the same day. Related: the staged Intake Closer pivot's per-signed-case
  pricing mode (Yang-gated) contradicts any "never outcome-tied, ever" sales promise — kill
  one or the other.
- **Status:** RESOLVED by Ali 2026-07-12. Approved table (operative numbers now in
  compliance-invariants §I and web/src/lib/site-constants.ts): Core $2,500/mo, Pro $5,000/mo,
  Charter (Founding 5) $1,500/mo for a 90-day intro then Core. The two conflicting tables are
  superseded: (2) Founding $1,000 / Core $1,500 / Pro $3,000 and (3) $1,500/$2,500/$5,000 are
  DEAD, do not reuse. STANDING DIRECTIVE (Ali 2026-07-12): the beta is the primary public focus;
  these dollar figures stay INTERNAL and non-public during the beta window (public /pricing keeps
  saying "free during the beta"; numbers return to public copy only when the beta ends). The
  Intake Closer per-signed-case pricing mode remains Yang-gated and must not contradict the flat
  fee before it is resolved.
- **Review date:** before any pricing conversation with any prospect.

## 2026-07-10 — Engine-v2 Wave 8: adversarial QC passes applied  ·  agent: main session · lane: research/QC
- **Change:** QC pass #1 on the LACBA piece (verdict SHIP AFTER FIXES → all 14 defects fixed:
  BLOCKER false "I recently tallied" teaser claim replaced with the structural version;
  rideshare Period 1 corrected to 50/100/30 contingent; Prop 213 DUI exception; free-tally
  offer removed from bio; work-product caveat; jargon translated; all cites re-verified).
  QC on the three Wave 7 artifacts: battle card READY AFTER FIXES (pricing gate; "we publish
  ours" was FALSE during the beta pricing-removed window → "quoted in writing up front";
  RingCentral/CallRail scoring linkage downgraded verified→inference; Mid-Market AE title
  unreproducible → fixed; talk track concedes Supio SOP configurability). Playbook READY
  AFTER FIXES (confidential-settlement handling, pseudonymous-not-anonymous framing,
  secure-transfer channel never email, net_to_client purpose stated). Fact-sheet spec was
  NEEDS REWORK → reworked (schema could not represent not_asked; superRefine invariants now
  explicit; per-key value typing kills the open-JSON channel; bilingual lint; new
  Confidentiality & transfer section — firm-eyes-only, we never transmit to third parties;
  "unlike anything else in the stack" removed as §V-unsubstantiated).
- **QC meta-finding:** outward-facing research verified almost perfectly; the failures
  clustered on OUR OWN facts (pricing, "we publish," self-comparatives). Future QC passes
  should weight inward-consistency checks accordingly.
- **Status:** fixes applied + committed. Remaining gates: LACBA vendor-policy check, Yang
  reads, Ali approvals per artifact headers.
- **Review date:** 2026-07-24

## 2026-07-10 — Engine-v2 Wave 7: three execution artifacts  ·  agent: main session · lane: product/GTM
- **Change:** staged `intake-fact-sheet-spec.md` (neutral cited-fact export v0 — the demand-tool
  partnership surface; invariants live in the schema: no dollars/conclusions/date-math fields,
  uncensorable `not_captured[]`), `competitive-supio-battlecard.md` (facts/gaps/landmines/talk
  track/7 quarterly tripwires), `retrodiction-onboarding-playbook.md` (the 30-min closed-case
  session: per-CMS export paths, field mapping with censoring rules, PII-scrub-on-their-screen,
  Firm Baseline one-pager spec). Corrected Wave 6 framing in exec summary: Supio's Scoring
  Agent grades HUMAN agents on the firm's existing phones too — never say "Supio only grades
  its own AI"; the Switzerland argument is structural (their grader lives inside a platform
  that answers calls and monetizes the case; we sell nothing the score could flatter).
- **Expected effect:** onboarding + sales collateral ready for the beta firms; demand-stage
  optionality spec'd; refutable competitive claims killed before first live use.
- **Status:** staged-for-approval. Talk track = new public-facing comparative copy → Ali (and
  Yang for written collateral) before first live use (§VII). Retrodiction session gated on
  executed NDA. Wave 8 = the two mandatory adversarial QC passes (operating protocol) on the
  LACBA piece + Wave 7 artifacts before anything is called ready to ship.
- **Review date:** 2026-07-24

## 2026-07-10 — Engine-v2 Wave 6: adjacency verification + LACBA authority piece  ·  agent: main session · lane: research/outreach
- **Change:** four staged docs — `ops/drafts/lacba-five-questions-piece.md` (publication-ready
  methodology piece; §VII human-post gate + Yang read flagged), `demand-stage-adjacency.md`,
  `spanish-first-intake-qa.md`; amendments folded into `engine-v2-EXECUTIVE-SUMMARY.md` and
  `engine-v2-conveyor-MVP.md` (Increment 0 data-spine amendment). Nothing sent/published.
- **Findings:** (1) **Supio Intake is LIVE with a call-scoring agent** and EvenUp is marching
  to intake (PLAAS, $10M+ early subs) — "nobody does call-content QA" is now false as stated;
  the wedge survives narrowed to *independent* rep-QA + develop-queue/SLA (Supio grading its
  own voice agent = second Switzerland proof), and the window compressed → conveyor + beta
  validation experiment move to NOW. (2) Cheapest option-preserving move: Increment 0 stores
  typed `answer_value` + `answer_citation` (not just ask-states) + `external_case_ref` + demand
  milestones — the intake-to-demand data spine; hard boundary: never build demand generation.
  (3) Spanish parity is a proof point, not a headline — "the only intake QA in Spanish" banned
  (§V superlative); credible claim = same bar both languages + capture rate by language;
  **beta test #4 = the 5 firms' call-language mix**.
- **Expected effect:** LACBA piece feeds live outreach (authority-asset input metric); spine
  amendment preserves 2027 demand-stage optionality at ~zero cost; refutable pitch language
  corrected before any prospect hears it.
- **Status:** staged-for-approval (LACBA piece → Ali posts after Yang read; spine amendment →
  adopt when Increment 0 is built).
- **Review date:** 2026-07-24

## 2026-07-10 — /onboard retired + digest-first desk shipped (Ali sign-off)  ·  agent: main session (Ali directive) · lane: product
- **Change:** (committed to main on Ali's explicit instruction) 1) The orphaned 5-step
  /onboard wizard is retired — page + /api/onboard deleted, /onboard 308→/apply; the pure
  `onboarding/` template-compliance lib and its tests stay (the send chokepoint uses them).
  /apply is the ONE signup story. 2) The digest-first desk (previously deferred in ROADMAP):
  `messaging/missed-digest.mjs` renders each missed caller with tap-to-call and a SIGNED
  one-click "We called them" link needing no login (HMAC tokens, no PII in URLs, 14-day
  expiry, only workflow statuses linkable — terminal outcomes still require the desk).
  GET /digest/confirm shows a human-press button (email scanners can't mark cases); the
  write reuses firm-scoped setFlagStatus. /api/digest/run (founder button on Studio Today
  + Vercel cron 15:00 UTC) does one pass over all firms, emailing firm members' sign-in
  addresses. Zero-miss days still send ("N calls read, all handled") so silence is never
  ambiguous. Delivery posture unchanged: KILL_SWITCH halts, TEST_MODE renders to output/
  and transmits nothing; links degrade to desk links if DIGEST_LINK_SECRET is unset.
- **Hypothesis:** the digest IS the daily loop for busy attorneys (simplicity research P1);
  removing the second signup story removes the last IA ambiguity.
- **Expected effect:** activation event (first callback marked done within 48h of first
  digest) becomes reachable without the firm ever opening the app.
- **Status:** shipped to main; email delivery still gated (TEST_MODE=true) until Ali sets
  DIGEST_LINK_SECRET + CRON_SECRET in Vercel and flips TEST_MODE per GO_LIVE.
- **Review date:** 2026-07-24
- **Result:** —

## 2026-07-10 — IA unification: one login, one founder nav, plain names everywhere  ·  agent: main session (Ali directive) · lane: product/website
- **Change:** (staged locally, not pushed) Research-driven simplicity pass over the whole app's
  information architecture. Founder side: `/studio` gained a persistent nav (Today / Mystery
  shops / Leads / Urgent leads / Monthly results / Tuning / System) shared with `/admin`, which
  gained an index page (was a 404 with four unlinked consoles); `/studio` home reworked into a
  "Today" screen leading with what needs action (unacked urgent leads, tuning proposals waiting).
  One sign-in: the proxy now sends all unauthenticated traffic to `/login` (password + magic
  link); the founder sees Studio ↔ desk links both ways. Naming: invented names demoted to
  subtitles ("The Mirror" → Mystery shops, "The Ledger" → Monthly results, "Captured leads" →
  Leads, Escalations → Urgent leads). Public: footer now links the intake-agent demo, the
  Spanish letter, and renames "Demo" to "See a call scored"; `/demo` ↔ `/intake-demo` ↔ `/audit`
  cross-linked. Hardening: `/billing` + `/settings/integrations` added to the auth-proxy matcher;
  desk nav deduplicated to one source of truth (`src/lib/desk-nav.ts`); 9 empty leftover
  directories removed.
- **Hypothesis:** deep-research pass (105-agent verified): progressive disclosure + one
  inbox-shaped home per role + boring descriptive labels (NN/g primary research) reduce
  abandonment for zero-patience users; one integrated product beats a toolkit (Squire).
  Refuted-and-avoided: digest-first email claims and concierge-vs-self-serve stats did not
  survive adversarial verification, so nothing was reorganized around them.
- **Expected effect:** founder daily loop = open /studio, see what needs you, work to zero;
  firm loop unchanged (already one queue). Should cut demo-setup fumbling and "where was that
  URL" time to ~zero.
- **Status:** shipped to main (Ali instructed commit + deploy same day).
- **Review date:** 2026-07-24
- **Result:** —

## 2026-07-09 — Public pricing removed for the beta window (branch `copy/beta-pricing-framing`)  ·  agent: website-dev · lane: website

- **What changed:** All dollar figures, tiers, and per-month prices removed from public site copy
  (pricing page, homepage founding section + final CTA, FAQ, founder, concierge, cohort banner,
  ROI calculator cost rows, audit-page link, nav label). Replaced with transparent beta framing:
  free during the beta under three spelled-out conditions (NDA, connect/upload recorded calls,
  structured feedback), a real flat price at launch shared individually after the free audit,
  founding testers lock preferred pricing. No "call for pricing" games — /pricing answers
  directly and offers Ali's email for the landing zone. Internal pricing objects (PRICING_TIERS,
  CHARTER_*, billing plans, checkout API) untouched; checkout is simply no longer rendered.
  Kept: $25,000 find-it-free guarantee (a guarantee, not a price — flagged for Ali), statutory
  dollar amounts on /compliance, market-stat anchors, the signed /letter (human artifact).
- **Hypothesis:** recruiting testers without a price tag recruits "help me make this great"
  instead of "is it worth $X", protects WTP data collection, and lets the Lost Case Report's
  recovered-dollar figure precede any pricing conversation (LACBA post audience).
- **Status:** staged on branch `copy/beta-pricing-framing`; beta/program-layer merged to local
  main earlier today per Ali. Nothing pushed or deployed.
- **Approval gates (compliance §VII):** Ali reviews the copy; pushing main deploys via Vercel —
  explicitly awaiting his go.
- **Review date:** at beta launch (restore published pricing from the untouched config).
- **Result:** 2026-07-09: Ali approved with three additions — the $25,000 find-it-free guarantee
  suspended from public copy for the beta (constants kept, marked suspended; /honesty keeps the
  estimation methodology), the letter updated to v1.3 (beta invitation; letter.txt mirror synced;
  letter.pdf regeneration still an open TODO), and /api/checkout disabled behind a single
  beta-window flag (503). Clio confirmed as the Phase-1 CRM. Both branches fast-forwarded into
  main and PUSHED to origin/main (771475f) on Ali's instruction — first deploy carrying the beta
  program layer. Same day: hosted Supabase migrations 0021 (reliability — was never applied) and
  0023 (beta program) applied to production via the pooler (the direct db.<ref>.supabase.co
  hostname has no DNS record; use aws-1-us-west-1.pooler.supabase.com). Production verified:
  /pricing shows beta copy, /api/checkout returns the 503 beta message, /api/beta/apply passed an
  end-to-end smoke test (qualified → nda_pending, NDA simulated; test row deleted). The stale
  public TODO note was removed from letter.txt (aafdbbd).

---

## 2026-07-09 — Beta program layer scaffolded over the recovery-desk product (branch `beta/program-layer`)  ·  agent: product-dev · lane: product

- **What changed:** Built the beta-program feature layer per Ali's 2026-07-09 brief: applicant
  intake + CA-PI ICP qualification with tagged waitlist (0a), NDA hard gate via the existing
  Dropbox Sign integration (0b), structured per-artifact feedback capture + founder view (0c),
  plus the Phase-1 rescue-desk models the beta exercises: pluggable practice-area ruleset
  (california-pi only), unified human-in-the-loop review queue with reject-retunes-criteria,
  top-3 daily rescue packet with zero-login delivery (email/SMS/Clio task, TEST_MODE-simulated),
  staged recovered-case ledger with would-have-lost gating + control holdout, callback-actor
  audit log, per-call consent status + firm attestation gate, packaging config objects with a
  structural flat-fee hard-fail, and a security-posture config object. Twin migrations
  (SQLite 0021 / Supabase 0023 with RLS). 28 new tests; full suite 301/301; build green.
  Deliverables: BETA_TEST_PLAN.md + FEATURE_MANIFEST.md at repo root.
- **Hypothesis:** a self-serve, NDA-gated beta with structured per-artifact feedback converts
  tester usage into the four signals (onboarding friction, utility, trust, WTP) needed to reach
  a launchable offer faster than ad-hoc pilots.
- **Expected effect:** input metrics — beta applications, NDAs signed, audits delivered to
  testers, feedback rows per artifact, WTP distribution.
- **Note (tension, flagged not smoothed):** this builds on Direction A (post-call, never
  contacts prospects), while the 2026-07-08 Intake Closer pivot below remains staged-for-approval.
  Also a pricing-number conflict: locked $1,500/$2,500/$5,000 vs the brief's $600–$1,500 band —
  both flat; config carries the locked numbers with TODO(Ali).
- **Status:** staged on branch `beta/program-layer` (committed locally, not pushed, not merged).
- **Approval gates (compliance §VII):** Ali — merge decision, pricing numbers, NDA/BAA template
  creation in Dropbox Sign; Yang — NDA/BAA/consent-greeting language before first live use.
- **Review date:** 2026-07-23.
- **Result:** —

---

## 2026-07-08 — PIVOT: Intake QA (independent scorer) → Intake Closer (autonomous bilingual closing agent)  ·  agent: orchestrator · lane: all

- **Change (STAGED, not shipped):** Owner (Ali) authorized a full pivot from the independent-scorer
  recovery desk to an autonomous, bilingual (EN/ES parity), 24/7 real-time **voice intake agent that
  closes** — qualifies, forensically scores the case, handles objections, and e-signs the retainer on
  first contact, under an attorney-in-the-loop approval gate. Master design: `INTAKE_CLOSER_DESIGN.md`.
  Work is on branch `intake-closer-pivot`. No old code deleted; retirement list staged in the design doc.
- **Hypothesis:** The market's white space is the capture→signature gap. Lifting blended lead→signed
  conversion from ~8–12% toward 20%+ has the same P&L effect as halving cost-per-lead, at lower cost.
  Sub-60s bilingual after-hours answering is the felt wedge; closing is the moat.
- **⚠ CONFLICT flagged (supreme doctrine):** `compliance-invariants` §I is a bright-line ban on
  per-signed-case pricing and even the words "per signed client / success fee." The pivot's most
  compelling economics are per-signed-case. **I did NOT edit the doctrine file** (§VII forbids
  unilateral pricing changes). Resolution designed as a *pricing switch*: default = flat subscription
  (compliant today); the fixed per-signed-case **technology** fee and the flat+guarantee fallback are
  gated on **Yang review** vs. Rule 5.4 / SB 37 / AB 931. Product behavior does not depend on the mode.
- **Standing prior decisions this SUPERSEDES if the pivot proceeds:** "independent recovery desk /
  not a fee participant" positioning and "flat monthly, never outcome-tied" pricing. These remain
  LOCKED until Yang clears the amendment and Ali approves the new public positioning (compliance §VII).
- **Expected effect:** N/A yet (pre-build). Stage-0 threshold: 2–3 extra signed cases/mo per pilot firm
  attributable to after-hours/Spanish capture.
- **Status:** staged-for-approval
- **Review date:** 2026-07-22
- **Result:** —
- **Owner action needed:** (1) approve/adjust the retirement list in `INTAKE_CLOSER_DESIGN.md` §11;
  (2) route the §I pricing amendment to Yang; (3) confirm which CRM to integrate first (Clio vs CasePeer).

## 2026-07-07 — Full-product improvement sweep: reconcile + P0 fixes + conversion + deliverables (PR #3)  ·  agent: orchestrator · lane: all

- **Change:** Six deep-research audits (offer strategy, operations, copy/conversion, backend, LiveCoach,
  deliverables) → one build+test-verified release on PR #3 (`offer/charter-and-checkout`, 215/215 tests):
  1. **Reconciled the offer story sitewide** to one narrative (free Leak Audit = 10 of your own calls →
     Founding-5 Charter $1,500→$2,500 → flat monthly); "Intake Quality Audit"→"Leak Audit" everywhere.
  2. **Wave 1 P0 backend/compliance:** wired the DEAD scoring trigger (CallRail calls were never scored —
     product inert on real data); LiveCoach §632 consent gate + Pro-gate + demo label; enforced retention
     (matches the DPA); Stripe idempotency + fail-closed + portal 401; RLS for recovery-desk tables;
     per-call error isolation; CallRail Zod/E.164; deleted 59 `* 2.*` duplicates.
  3. **Wave 2 make-the-buy-obvious:** two-path CTA everywhere; Charter as single dominant buy; outcome
     hero; forward scarcity; FAQ objection; role-based trust lines (no named reviewer per §V).
  4. **Wave 3 deliverables:** unified the three contradicting sample figures into one source; real
     citations + fee ranges + published error-rate footer on the shipping report; confidence chips;
     structured transcript excerpt; dated action box.
- **Hypothesis:** these remove the reasons the funnel leaks at every stage — the product now actually
  works on real calls, the buy is obvious, the deliverable is McKinsey-grade and internally consistent,
  and the compliance code matches the compliance copy.
- **Expected effect:** unblocks real revenue (scoring works, checkout provisions, buy is findable);
  removes legal exposure (consent gate, retention, RLS, fail-closed).
- **Status:** staged in PR #3 (public + pricing → Ali merges = approval). Build + 215 tests green.
- **Review date:** 2026-08-06.
- **Result:** —
- **Open items needing Ali (in PR #3 body):** connect Stripe + run migrations 0019–0021; confirm CallRail's
  real webhook signature; approve a font package (PDFs still on system fonts); attorney-bless MSA/DPA;
  close the citation seam (audit result discards per-quote timing → few live citations today).
- **Operator kit staged:** `ops/drafts/outreach-operator-setup.md` (affiliate-membership email, SPF/DKIM/
  DMARC setup, daily how-to-run) — for Ali, pairs with `zero-budget-outreach-kit.md`.

## 2026-07-07 — Physical mailer retired → zero-budget outreach motion (plan of record)  ·  agent: orchestrator · lane: outreach

- **Change:** Founder has ~$0 outreach budget, so the physical Dream-25 mailer (its "strongest asset") is
  DEAD. Two deep-research passes replace it with a free, human, 1:1 motion, staged in
  `ops/drafts/zero-budget-outreach-kit.md`. Spine: (1) **join ONE trial-lawyer association** (SCCTLA /
  Capitol City / SFTLA) so all outreach goes out as "fellow member" — warm converts 10–20× cold; (2) the
  father's network for warm intros; (3) a 5-touch, 14-day, hand-sent sequence per firm (LinkedIn connect →
  email w/ public-signal open → value DM → one manual call → break-up); (4) the **public-signal cold-open**
  ("I looked at your public intake and noticed X" — public/automated signals only, records nothing,
  CIPA-safe); (5) podcasts/earned media on the Spanish-intake-justice angle for authority.
- **Hypothesis:** for a solo, hours-constrained founder, trust (warmth + hyper-personalization) beats
  send-volume; ~5 firms worked deeply/week at the funnel's ~8% touch→qualified yields the first 3–5
  meetings in 4–6 weeks. Volume-grinding is the trap (can't out-send a 2% cold rate, and blast violates §III).
- **Expected effect:** first qualified conversations without spending a dollar; every touch rides the
  independent-scorer + Spanish-gap moats.
- **Status:** kit staged for Ali (outbound → he sends; §III/§VII human-send chokepoint). Pre-flight: real
  CAN-SPAM address, a live Calibration page, SPF/DKIM/DMARC, and per-firm recon before Touch 1.
- **Review date:** 2026-08-06.
- **Result:** —
- **Flag:** offer-name inconsistency — hosted letter/site still say "30-day Leak Audit / five founding
  firms"; the kit + Charter use "10-Call Autopsy." Reconcile the public copy before sending.

## 2026-07-07 — Offer decided + click-to-buy checkout built (staged, PR #3)  ·  agent: orchestrator · lane: product+website

- **Change:** Two deep-research passes (offer-decision memo + operational blueprint) locked the offer and
  the sign-to-pay flow. Built and staged in PR #3 (`offer/charter-and-checkout`), all TEST_MODE-safe:
  - **Offer:** free 10-Call Autopsy gated behind a booked decision-maker readout; **Charter $1,500/mo for
    90 days → $2,500 Core**, "Founding 5" hard cap, closes at 5th firm or Aug 31 2026; month-to-month,
    auto-renew, 30-day cancel, rate locked for life of subscription. Tiers **Core $2,500 / Pro $5,000**
    (Pro's recovery workflow gated/roadmap, not sold live). **$25k find-it-free guarantee** kept
    (value-found, first-month-free).
  - **PRICING CORRECTION:** replaced the live $500/$900/$1,500 tiers with $2,500/$5,000. At $500 the $1M
    math needs 55–165 firms vs 24 — flagged to Ali; the 5x correction is the single most important move.
  - **Checkout plumbing:** added the missing `POST /api/webhooks/stripe` (payment → provision firm +
    billing + Supabase auth + magic-link + Resend welcome), `POST /api/checkout` (subscription mode,
    in-checkout terms, auto tax, card + ACH), `/welcome`, Customer Portal (self-serve cancel), guarantee
    balance-credit refund, failed-payment → paused.
  - **Logistics closed:** required CIPA consent checkbox on audit upload; draft `/dpa` + `/msa` (marked
    pending attorney review) with real subprocessor list + actual (non-overclaimed) deletion behavior.
- **Hypothesis:** a two-click charge-on-click flow + the corrected price maximize audit→paid and make
  first revenue collectible the moment a firm says yes.
- **Expected effect:** removes the operational blocker to first revenue; corrects the pricing that made
  $1M unreachable.
- **Status:** staged in PR #3 (public + pricing → Ali merges = approval). Build green, 190/190 tests pass.
  Human setup required before real money: Stripe account/keys/products, enable Tax+Portal+Smart Retries,
  register webhook, run migration 0019, attorney bless MSA/DPA, W-9, `npm i stripe`.
- **Review date:** 2026-08-06.
- **Result:** —

## 2026-07-07 — Strategic reprioritization: autopsy-first, paid charter, benchmark demoted (plan of record)  ·  agent: orchestrator · lane: all

- **Change:** Two confirming deep-research passes (a full-product quality audit + a fastest-path-to-$1M
  strategy pass) reset the near-term sequence. The binding constraint is **proof-of-value velocity**
  (founder-hours per closed firm), not market size or the benchmark. New order of operations for the
  next ~60 days:
  1. **The "10-Call Autopsy" wedge** — ask a firm for 10 of *their own* recorded intake calls (their
     consent chain; we never dial, staying clean on CIPA §632), score them, and walk the owner through
     the 2–3 leaked signable cases live, with the verbatim transcript and fee-at-risk. The diagnostic
     *is* the close. Attacks the two conversions that decide everything (audit→pilot, pilot→paid).
  2. **Paid "Charter Firm" offer replaces the free pilot** — a flat, stepped, never-outcome-tied charter
     (illustratively ~$1,500/mo → $2,500 Core after 90 days), capped at 5 firms, real deadline. Pulls
     first revenue to month 1 and tests the weakest assumption (pilot→paid) with real money instead of
     a free pilot that selects for tire-kickers. **PRICING/OFFER CHANGE → staged for Ali; §VII gate;
     stays flat-monthly, never outcome-tied (§I).**
  3. **$25k find-it-free guarantee becomes the offer centerpiece** (risk reversal), reframed as
     value-found, never recovery-guaranteed (§IV). Copy change, not a rebuild. **Route framing to Yang.**
  4. **Dream 12, not Dream 25**, for the first closes — concentrate founder-hours on the tightest ICP;
     lead outreach with the autopsy offer, benchmark as air cover (touch 3), not the opener.
  5. **Benchmark (B-006/B-001) DEMOTED below the revenue work** — it is a months-to-pay-off authority
     asset, not a first-revenue lever, and was absorbing the hours the first 5 closes need. Let the
     autopsy data from the first *paying* firms (consented, aggregated) seed the benchmark later — one
     motion, both jobs.
- **Hypothesis:** Charging from day one + live autopsies on real calls converts audit→paid far faster
  than free-pilot→hope, pulling the $1M curve left by months. The benchmark still compounds, but funded
  by leftover hours and seeded by paying-firm data.
- **Expected effect:** first revenue in ~30–45 days (vs month 3–4); higher audit→paid conversion;
  founder-hours concentrated on the ~5 closes that start the flywheel.
- **Status:** plan of record for sequencing/strategy. The **pricing, offer, guarantee-copy, seal, and
  index** items are PUBLIC/regulated → staged for Ali and, where novel, Yang; nothing shipped here.
- **Review date:** 2026-08-06 (revisit after first autopsies + first charter conversations).
- **Result:** —
- **Also surfaced (novel, queued):** an "Intake Integrity Standard" (rating → named public standard);
  an "Intake-Verified" displayable seal (customers become distribution, Michelin-star loop); a public
  Spanish-Intake Justice Index (uncopyable PR franchise); a public-signal cold-open ("I scored your
  public intake — want the full autopsy?"). All cross §VII and route through Yang before anything public.

## 2026-07-07 — GTM re-scope: audit-led, recovered-lead re-engagement GATED behind retained legal clearance  ·  agent: orchestrator · lane: product+outreach (plan of record)

- **Change:** Plan of record going forward. (1) The independent-scorer **free Leak Audit leads all
  go-to-market** — it sits on the firmest legal ground (strongest on Rule 5.4: a flat, outcome-
  decoupled fee is not tied to any case's fees). (2) The **recovered-lead SMS re-engagement feature
  is GATED**: not shipped, marketed, demoed as available, or sold until a *retained* CA legal-ethics
  review clears it. It may still be built/tested internally (backend) behind the gate.
- **Hypothesis:** Legal analysis (Yang memo drafts + insight 2026-07-07) identifies re-engagement —
  helping a firm re-contact its own leads — as the **single softest surface** against AB 931
  ("anything of value for securing services") and B&P §§6151–6152 (capping/running), and **SB 37's
  new private right of action ($5,000–$100,000 per violation, VERIFIED)** is a risk multiplier that
  invites plaintiff-side theories aimed at a novel vendor. Leading with the audit books qualified
  conversations without exposing that surface; gating re-engagement removes the biggest legal tail
  risk to the $1M plan.
- **Expected effect:** protects the whole GTM from a catastrophic SB 37 enforcement tail while
  keeping the qualified-conversations funnel intact (the audit is already the wedge). No revenue-lever
  loss near-term — re-engagement was never going to be the first-touch anyway.
- **Status:** shipped (documented as plan of record; supersedes any framing that markets
  re-engagement pre-clearance).
- **Review date:** when Yang / retained counsel returns a clearance read on re-engagement (no fixed
  date; blocks on B-005 becoming a *retained* review, not a warm pass).
- **Result:** —

## 2026-07-07 — Staged Dream-25 outreach batch 1 + benchmark spine + targeting method  ·  agent: outreach · lane: outreach

- **Change:** Staged three drafts under `ops/drafts/` (nothing sent/published):
  1. `benchmark-report-outline.md` — spine + section architecture for the independent "State of
     NorCal PI Intake" benchmark (B-006→B-001). Every measured figure marked `[TO BE MEASURED]`;
     CIPA-safe methodology summarized (fixed scenario, 4-min rubric, tiered confidence, PUBLISHED
     false-alarm rate); Yang-signed §632 protocol flagged as a hard §II/§VII gate before any dialing.
  2. `dream25-outreach-batch-1.md` — signed physical letter (Ali's voice, NorCal-framed), 1:1
     CAN-SPAM email, LinkedIn connect+opener, and a capped 3-touch (mail→email→LinkedIn) sequence.
     Each asset carries a per-asset compliance note. Free Leak Audit is the wedge throughout.
  3. `dream25-targeting-plan.md` — ideal-fit scoring rubric + ethical public-source sourcing SOP
     (State Bar, county TLAs, CAOC NorCal chapters, Google LSA/PPC, Avvo/Justia), ≥2-source
     verification rule. No firm names/PII fabricated.
- **Hypothesis (per asset):**
  - Letter (Asset A): a signed, physical, morally-serious letter cuts through machine-written
    vendor email (letter's own thesis) → books qualified conversations [B-001, insight D1/D2].
  - Email/LinkedIn (Assets B/C): multi-channel, same-voice touches lift reply rate vs. single
    channel, at the ~8% touch→qualified assumption in the funnel model [insight B2].
  - Benchmark outline (B-006/B-001): the independent, published-methodology benchmark is the
    second-touch authority that earns the first meeting and instantiates the moat competitors
    structurally can't copy [insight D1/D2].
  - Targeting (C3): a scored fit rubric concentrates scarce founder hours on the ~24 firms that
    actually convert — the real binding constraint is hours/close, not TAM [insight B1].
- **Expected effect:** primary metric = **qualified conversations booked**. If batch-1 (Dream-25
  first ring, ~25 firms) performs near the funnel model, expect a handful of qualified
  conversations from touch→qualified ~8% across 3 touches; instrument reply-by-channel and
  touch→qualified from firm #1 (the two conversions insight B2 says decide everything).
- **Status:** staged-for-approval.
- **Review date:** 2026-08-04 (4 weeks; revisit after first sends + first replies).
- **Result:** —
- **Approval gates before anything moves (per compliance §VII):**
  - **Ali:** approve each asset; fill all `{{placeholders}}`; supply a REAL postal address for the
    CAN-SPAM email; set `{{ORIGIN_CITY}}` to a NorCal origin (NOT Orange County); confirm the
    Calibration & Honesty URL is live with a current false-alarm rate before pointing partners to it.
  - **Yang:** must sign the §632-safe benchmark protocol BEFORE any mystery-shop dialing; must
    clear any public "AB 931 / SB 37 compliant" claim (this batch makes NONE — kept to "flat,
    outcome-decoupled fee" only, per B-005 still open). Benchmark stays "forthcoming," no results
    implied, until fieldwork runs.

<!-- New decisions go above this line, newest on top. -->

## 2026-07-10 — LACBA-beta readiness pass (commit 80d8852)

**Change:** Full readiness check + website redesign for the LACBA Small Firms post
(4,000+ LA attorneys). Statewide/LA framing replaces NorCal everywhere public; all
save-protocol-text artifacts reframed as staff callback scripts (texting = roadmap,
A2P-gated); "our own models" and the 72-hour-purge overclaims corrected; /apply
rate-limited + founder email ping; dead components deleted. Drafted (staged, NOT
sent): mutual NDA, design-partner MOU, LACBA post + reply (ops/drafts/).
**Hypothesis:** the beta converts on one number (confirmed recovered fees), so the
site must sell exactly the loop we run — ingest recordings → daily flags → firm's
own staff call back → ledger — with zero contradicting surfaces for a diligent
LA attorney or their ethics counsel.
**Expected effect:** LACBA traffic lands on a coherent, compliant, single-CTA funnel;
applications reach Ali same-day via email ping instead of waiting on a /studio visit.
**Verified:** prod /apply works end-to-end (probe applicant created + cleaned up);
hosted migrations 0023/0030 confirmed applied; prod audit storage configured.
**Review:** at first LACBA applications, or 2026-07-24.

## 2026-07-10 — Persona teardown + bug-hunt sweep (commits 969c30a..db15783)

**Change:** Walked the product as the PI managing partner and the intake coordinator
(5 verified web-research passes → field guides in insights.md), then ran 3 parallel
bug-hunters over the beta surface and fixed the confirmed high-severity findings.
Shipped: (1) LeakCard rebuilt around the real callback moment — one-tap phone-reality
statuses (spoke/left-message/bad-number/signed/passed) + bad_number + undo/reopen +
warm opener, grading language OFF the staff surface; (2) desk "your week" wins strip
(recognition = the only upside a monitoring tool can give staff, since per-case bonuses
are barred); (3) queue no longer a graveyard (resolved cards → collapsed Handled section,
active-first ordering); (4) real-firm flags now show case type + fee (scorer's
case_type_matched plumbed through insertFlag + code→label map + Auto-accident fee row) —
was demo-only before; (5) digest persists follow-up to terminal (6-touch research);
(6) SECURITY: demo status PII leak closed (per-row token, migs 0032/0024), auth
self-signup closed (shouldCreateUser:false), resolveDeskFirm never falls back to a real
firm, open-redirects fixed; (7) idempotent onboarding + applicant tile clears; (8) honest
states (zero-call Calls page, beta-aware Billing, stale-heartbeat nudge, Documents copy).
**Hypothesis:** the beta converts on the coordinator using it daily and the partner
trusting the numbers; both fail if the desk reads as surveillance, shows blank/undollared
cards, or leaks a caller's PII.
**Verified:** tsc clean; 415/415 tests; build green; live browser walks (callback flow +
persistence, wins strip, queue split, demo token round-trip + terminal-on-failure, PII
?id= now 400). All hosted migrations 0031/0032/0033 applied. Scratch users/probe rows
cleaned from hosted DB.
**Deferred (Ali/infra, noted not guessed):** per-firm CallRail secret + live signature
verification; XFF-trusted rate-limit IP on Vercel; storage bucket size cap; engine-v2
triage rubric (frozen — needs attorney review); statute clock; attempt-count nudge.
**Review:** at first real beta firm's first week.

## 2026-07-10 — Engine v2 triage-first: research + design (3 waves, staged for Ali+Yang)

**Change:** Exhaustive research + design for rebuilding the intake scoring engine to
optimize for TRIAGE (case selection) not conversion, per Ali's request. Engine left
FROZEN; produced a reviewed design deliverable (NOT a code change): exec summary +
research log (~20 cited PI-attorney/decision-science/ethics briefs across 3 waves) +
promptable v2 system-prompt DRAFT + outcome-validation-loop & firm-config YAML + a
6-example gold calibration set. All in ops/drafts/engine-v2-*.md.
**Hypothesis:** v1 scores intake as a conversion funnel; the CAALA/CAOC firms we sell
to run it as case-selection; a triage engine (coverage-adequacy gate, net-of-lien value,
two-sided over-conversion alert, actuarial validation loop) matches the real buyer.
**Key finding (adversarial + compliance converged):** the full case-VALUE oracle is a
post-validation, up-market product; its beta-appropriate form is a call-QA + develop-
queue CONVEYOR (headline metric = "value-determining questions resolved within SLA," not
a score). No terminal outputs, tier-not-dollars, generic-deadline-reminders, aggregate
(not per-staffer) over-conversion signal, Fricker-grounded fairness fixes. **Do NOT ship
the selection engine to the current beta** (small firms' problem is follow-up not
selection; tiers need a 12-24mo validation cycle).
**Expected effect:** north-star engine design banked; near-term product clarified as the
conveyor the rescue packet already partly delivers.
**Hard STOPs → Yang (§VII):** freeze-lift, case-VALUE-at-intake, no-auto-decline,
deadline flags, over-conversion retention, refer-out monetization, the 3 fairness fixes.
**Review:** when Ali decides whether to lift the freeze; not before a PI-attorney +
Yang review.

## 2026-07-11 — Session 0: beta ship-blockers & truth fixes (branch beta/s0-blockers)

**Change:** (1) Merged letter/norcal-factcheck-fix — the false "Sacks built conversation
analysis at UC Berkeley" claim on /letter is now the accurate Berkeley-trained/UCLA-LASPC
account; kept main's newer beta-program copy in the two conflicted paragraphs (wage range
and SB 690 removal were already fixed on main). Added the letter's /audit CTA. (2)
site/presidential-polish-1 recorded as merged with `-s ours`: its single commit is
byte-identical (same patch-id) to bbd68f3 already on main since 07-07 — merging content
would have REGRESSED six later commits on /audit and the homepage. (3) Email decoupled
from TEST_MODE: new EMAIL_ENABLED env flag (default false = no email) gates only the four
Resend paths (missed-digest, digest, weekly-report, alerts); TEST_MODE now arms SMS only;
KILL_SWITCH additionally halts email inside every sender; GO_LIVE.md, BETA_ONBOARDING.md,
web/.env.example updated to match. (4) Internal approval-queue digest skips entirely
unless DIGEST_TO is set and is documented internal-operator-only (both crons fire 0 15 * * *;
a firm can never receive it by fallback). (5) /api/digest/run: missing CRON_SECRET on a
hosted deploy now 500s and writes an errors row naming the var (was: silent 401 forever);
every run logs per-firm outcomes (emailed/rendered/skipped+reason/failed) to the errors
table (source "digest.run") — deliberately reusing the operator log rather than adding a
migration Ali would have to hand-apply before Monday. (6) Desk queue shows "N calls
processing" while any call is received-but-unread or failed_scoring — the green all-clear
can no longer vouch for a stuck pipeline. (7) /api/inngest gets maxDuration=300 (scoring
~95s/call). (8) Doc truth: README migration ranges (0026 SQLite / 0034 Postgres),
INTAKE_SYSTEM.md hosted state (0023–0033 applied, 0034 pending), CLAUDE.md send-chokepoint
path corrected to web/messaging/send.mjs.
**Hypothesis:** the beta's first-week trust hinges on (a) no false public claims while
LACBA outreach is live, (b) digest email working WITHOUT arming SMS, and (c) no dashboard
state that lies (false all-clear, silently dead cron).
**Expected effect:** Ali can set EMAIL_ENABLED=true + KILL_SWITCH=false Monday with
TEST_MODE untouched; a missing CRON_SECRET surfaces in hours not weeks; coordinators see
honest pipeline states.
**Verified:** smoke 0 failures; 427/427 unit tests; e2e-synthetic all 9 stages PASS
(weekly report correctly rendered-to-file under the new gate); production build green.
**Deferred:** engine untouched (frozen); HowCallsArrive.tsx untouched (concurrent /desk/upload
session owns it); per-firm CallRail secret UI (Session 1); errors-table run-log rides the
operator alert email — if daily "digest run" rows prove noisy, split into a digest_runs
table post-beta.
**Review:** 2026-07-18 (end of beta week 1).
## 2026-07-11 — Session 5 (beta weekend): trust arsenal staged — BAA draft, security one-pager, GO_LIVE truth rewrite, NDA-promise memo

**Change (all staged, nothing published/sent, branch beta/s5-trust-docs):**
(1) `ops/drafts/external/beta-baa.md` — plain-English BAA template grounded in the real
stack (named subprocessors incl. Twilio-parked; TLS/AES-256; RLS isolation; redaction
defaults; audio-deleted-at-transcription; 72h audit purge; 90-day rolling firm retention;
72h breach notice; no-training flow-down). DRAFT — PENDING ATTORNEY REVIEW banner;
reviewer notes route the THRESHOLD QUESTION to Yang un-decided: is a BAA the right
instrument for non-PHI PI intake, vs. the DPA carrying it with a BAA rider only for
medical-adjacent firms (or renaming the instrument).
(2) `ops/drafts/external/security-onepager.md` — one-page firm-facing security sheet
built strictly from /security + web/SECURITY.md + security-posture.mjs; explicitly
disclaims SOC 2/HIPAA; no AB 931-type compliance claims; PDF-ready; send gated on Ali
(and the BAA line gated on Yang).
(3) `GO_LIVE.md` rewritten as the true Monday runbook: digest-first Part A gates (hosted
migration floor 0034; Vercel env presence incl. CRON_SECRET/DIGEST_LINK_SECRET/Resend;
EMAIL_ENABLED with an explicit dependency note on the Session 0 branch; digest dry-run
then live-send-to-self; synthetic call through the PROD pipeline; CallRail self-test via
web/scripts/callrail-selftest.mjs with a Session 1 dependency note; NDA logistics;
provider data-terms check) vs. Part B parked SMS gates (A2P 10DLC, twilio not in
package.json, TEST_MODE stays true, quiet-hours/opt-out/kill-switch live tests, retainer
template, ethics sign-off).
(4) `ops/drafts/nda-promise-options.md` — decision memo for Ali: (a) keep "one business
day" + Yang NDA read before Monday with a named Sunday-night fallback, or (b) soften the
copy — exact diff for apply-form.tsx + api/beta/apply/route.ts staged IN THE MEMO, not
applied; welcome/page.tsx flagged as a kickoff (not NDA) promise needing no change.

**Hypothesis:** a diligent firm's ops person asks for security/legal paper in week 1;
having honest, posture-true artifacts ready (instead of improvising or overclaiming)
converts trust into signed NDAs without violating §IV/§V/§VII.

**Factual inconsistencies found while cross-checking (flagged, not smoothed over):**
- `web/beta/security-posture.mjs` claimed `baa.status: "template drafted"` while NO BAA
  existed anywhere in the repo (now true only as of this session's draft).
- Retention drift: code default 90 days (`web/inngest/functions.mjs:83`) and public
  /security page promise 90; but `web/.env.example:122` sets 30 and
  `security-posture.mjs` says "default 30." Deployed env value must match the public
  promise — added to GO_LIVE after-care list.
- `security-posture.mjs` states Anthropic "zero-retention API tier" as present-tense
  fact while the old GO_LIVE treated Anthropic ZDR/BAA as an unmet gate — no written
  confirmation on file. Provider data-terms check moved into Monday's Part A (the
  digest pivot moved it EARLIER: real call audio flows Monday, texting or not).
- `web/SECURITY.md` retention section reads the 72-hour purge as general; it is true
  only for the free-audit pipeline (site-constants reconciled it 2026-07-10) — doc
  should be aligned when next touched.
- NDA reviewer note 4 said "a separate BAA/DPA covers HIPAA" — asserted a BAA that
  didn't exist.

**Gated on whom:** Yang — BAA threshold question + full BAA read; NDA template read
(option a). Ali — NDA-promise option (a)/(b); security one-pager first send; provider
data-terms acceptance-or-confirmation (GO_LIVE A7); deployed DATA_RETENTION_DAYS value.
Sessions 0/1 — EMAIL_ENABLED flag and callrail-selftest.mjs (referenced as dependencies,
not assumed shipped).

**Review:** Monday 2026-07-14 go/no-go.
## 2026-07-11 — Marketing-copy audit staged + P0/P1 fixes applied to working tree
**Change:** `ops/drafts/copy-audit-2026-07-11.md` — word-by-word audit of every
customer-visible surface, graded against a 106-agent adversarially-verified research pass
on PI-attorney vendor psychology + persona guides + compliance-invariants. P0/P1 fixes
APPLIED (build green, verified in browser): honesty strip/footer/GUARANTEE_METHODOLOGY no
longer claim a published error rate (/honesty withholds it correctly); homepage stat now
the clean verified $284/lead (broken $468 derivation removed; $2.5–3k PPC stat removed —
refuted class); /audit/sample $253k–$506k synthetic projection replaced with the
"we won't project from a sample" refusal; 400% speed stat renamed
`..._REFUTED_DO_NOT_RENDER`; /privacy §6 now states the 90-day desk window (matches
/security, /faq, DPA); SampleStatement imports GOLD_ATTESTATION verbatim (restores the
no-penalty-of-perjury clause); /compliance §632 now gives both criminal $2,500 and civil
$5,000/§637.2 figures; /audit/sample CTA unified to CTA_PRIMARY.
**Gated on Ali (§VII):** /letter still promises a published error rate — proposed v1.4
edits staged at `ops/drafts/letter-v1.4-proposed-edits.md`; nothing pushed/published.
**Hypothesis:** closing the promise/click-through gap removes the top credibility break
before the next LACBA wave. **Review:** at letter v1.4 decision.

## 2026-07-11 — Rescue desk v2: the layer ABOVE the CRM cadence (dead-lead import shipped)
**Change:** Built the CRM dead-lead rescue layer end-to-end and wired the previously
dormant rescue conveyor (`web/rescue/`) into the app for the first time. New:
`rescue/import.mjs` (CSV parse + alias header mapping for Lead Docket/CloudLex/Litify/
Lawmatics/Law Ruler/Clio Grow exports), `rescue/triage.mjs` (deterministic merit triage —
no LLM: screen-outs ONLY on legally-determinable facts per engine-v2 P0-2; value as a
cited TIER never dollars; language = coverage gap never a merit input; honest nulls),
`rescue/crm-export.mjs` (tagged "Rescued — Review" CSV back to the CRM), migrations
0027/0035 (`crm_import_batches` + `crm_leads` sidecars; calls/flags untouched),
`/studio/rescue` console + `/api/rescue/run` (founder-gated). Imported candidates enter
the EXISTING conveyor: named human review → top-3 daily packet with callback scripts
(now SOL-aware via the triage read) → RSQ ledger. Screened-out rows are kept with their
reasons — the honest denominator behind "of your 40 dead leads, these 3 were live."
**Positioning hypothesis:** don't compete with the cadence — sit upstream and aim it.
The output lands back INSIDE their CRM (CSV now, Lead Docket API later), which makes
Lead Docket more valuable instead of triggering a rip-and-replace fight; and the answer
"did we lose a signable case, and why?" is one a CRM vendor structurally can't give
(it indicts the workflow they sell). Same independence moat, pointed at the CRM.
**Compliance posture:** no sends, no live CRM writes (mock connector + CSV only —
live Lead Docket API is a per-integration §VII gate, see ROADMAP); statute dates carry
the attorney-must-verify disclaimer; named humans required to import, confirm, and log
callbacks; dollar figures appear nowhere (tier + basis only).
**Expected effect:** the Leak Audit wedge gains a second entry point that needs NO call
recordings or CallRail hookup — any firm can export a CSV in 5 minutes, which shortens
time-to-first-value for beta firms and gives LACBA conversations a concrete artifact.
**Review:** after the first real firm export runs through it (beta week of 7/14).

## 2026-07-11 — Copy audit SHIPPED to origin/main (9f379fc)
**Change:** both copy-audit commits pushed to production: ed70721 (P0/P1: error-rate
promise corrected sitewide, $284/lead stat replaces broken $468, sample projection
replaced with the refusal, 400% stat quarantined, retention/attestation/§632/CTA
consistency) and 9f379fc (letter v1.4 with Ali's approval: all five error-rate
references now bind to a corpus-gated published rate, letter.txt mirror synced,
changelog + version bumped; P2 pass: prospects→callers sitewide, "Setup is on us"
concierge H1, stake line out of the cohort banner, OG headline unblamed, stat-bar
reading key, ROI tones "If you win back 1 in 5 / 2 in 5" with labeled assumptions,
lead win-back wording, named phone systems on how-it-works). Zero em dashes in all
new copy per Ali. Verified: clean isolated build + 15/15 and 14/15→15/15 render checks.
**Note:** local tree carries another session's in-progress rescue-desk work (untracked
web/src/app/api/rescue/ has a type error at route.ts:118) — NOT shipped, needs fixing
before that session ships.
**Review:** watch the Vercel deploy of 9f379fc.

## 2026-07-12 — Engine v2 triage research Rounds 1–2 (STAGED, engine frozen)
**Change:** two-round deep-research pass (~47 subagents, web-grounded + adversarially
verified) upgrading the frozen `scoring-v2/` triage engine. Seven new drafts staged in
`ops/drafts/`: engine-v2-R1R2-INDEX (start here), -delta-and-open-questions,
-legal-currency-audit, -casetype-signal-library, -base-rate-priors, -dimension-anchors-v2,
-r2-corrections-and-additions. **Engine left FROZEN** (CLAUDE.md contract) — all proposals,
no code touched; `scoring/` and `scoring-v2/` unchanged.
**Hypothesis:** the v2 architecture is right; the gap was (1) statutory currency, (2) missing
extraction facts competitors capture, (3) a net-recovery lien model, (4) case-type coverage,
(5) a DEVELOP action conveyor — all additive within the compliance rails.
**Key verified corrections (primary-source, 7 CONFIRMED / 3 fixed / 0 fabricated):** auto
minimums now 30/60/15 (SB 1107); MICRA $470k/$650k 2026 year-of-resolution, economic uncapped,
3-cap stacking (AB 35); limited-civil $35k via **SB 71 not AB 2347**; rideshare passenger
UM/UIM cut to $60k/$300k for 2026 crashes (SB 371); survival p&s SUNSET for 2026 filings
(CCP 377.34 — LIVE now, elder-abuse excepted); freight-broker negligent-selection settled
nationwide (Montgomery v. Caribe Transport II, SCOTUS 5/14/2026); Audish future-medical
discount (published, review denied); elder-abuse survival cap = $470k not $250k.
**Expected effect:** a shippable v2.1 config/schema delta list; corrects value math that would
mis-tier every affected case. Biggest structural edge = re-spec G1 Underwater on projected NET
after statutory lien reduction (nobody else models it).
**Research ceiling reached:** remaining gains (strong/adequate/thin cut-points, value-tier
dollar bands, hours-per-case, per-field on-call observability, ASR/language parity) require
real transcripts + attorney labels + the firm flywheel — EXECUTION, not more research.
Recommended path unchanged: merge branch inactive + shadow mode; route open questions to Yang.
**Review:** when Ali makes the freeze-lift/shadow-mode decision and a PI attorney reviews the
open-questions lists (delta §4 + r2 §3).

## 2026-07-12 — Intake-simplicity research + P0 fixes (SHIPPED backend / STAGED public)
**Change:** two deep-research rounds (39 subagents, ~1.75M tokens) + 3 codebase-grounding
agents on "make intake ops/UI/usage as simple + effective as attorneys want." Decision brief
staged at `ops/drafts/intake-simplicity-research-brief-2026-07-12.md` (with a §6 stat-hygiene
kill-ledger). Then acted on the P0s:
- **SHIPPED (backend, internal):** empty-FIRST-digest fix in `web/messaging/missed-digest.mjs`
  — when `callsReceived === 0` (new firm, webhook just connected, nothing scored yet) the digest
  now says "you're connected; we're listening" instead of the false "0 calls read, all handled".
  New test added; **12/12 missed-digest tests pass, `tsc --noEmit` clean.**
- **SHIPPED (compliance guards):** added KILL-LIST guard constants to `web/src/lib/site-constants.ts`
  (Spanish-lift %s, 79%/391% first-lawyer, LPL-carrier AI %s) — never-render landmines matching the
  existing REFUTED pattern, so the voice/bilingual pivot copy can't reintroduce them.
- **STAGED for Ali (public copy, §VII):** removed the false "a BAA is available" promise from
  `BETA_CONDITIONS` in site-constants (no BAA doc exists; PI firms generally aren't HIPAA covered
  entities). Same fix still pending in `ops/drafts/lacba-beta-post.md`. **Do not deploy until Ali
  reviews.**
- **STAGED for Ali + Yang:** `ops/drafts/closer-book-human-default-decision-2026-07-12.md` — re-scope
  the pivot to a book-human-DEFAULT instrumented qualifier; keep voice behind existing off-gates;
  route privilege/consent/UPL questions to Yang before any go-live.
**Verified-already-done (no change needed, reported honestly):** digest link GET/POST split +
no-PII tokens + firm-scoping (P0-1/P0-5) already correct in `digest-links.mjs`/`digest/confirm`;
score already suppressed on the queue with action-labeled tiers (`LeakCard.tsx`); a plain-English
trust page already lives at `/security` (P0-4). P0-6 "one verbatim caller-quote line on the queue"
is a real P1 (needs a citation string plumbed from the server) — not yet done.
**Hypothesis:** the attorney daily surface is already near-best; the leverage is onboarding + trust
+ digest/queue plumbing, and positioning around always-answers/never-quits/their-language rather
than "answered in seconds" (commoditized).
**Expected effect:** removes a false all-clear that would read as broken on day 1 (activation +
month-1-SLG-retention risk); closes a false compliance claim; prevents bad stats entering pivot copy.
**Review:** Ali to approve the BAA copy removal + the closer decision; then audit `/security` against
the 4 trust questions and decide the P0-6 evidence-line P1.

## 2026-07-12 — Engine v2.2 triage deltas BUILT (branch, additive, nothing activated)
**Change:** implemented the R1/R2 research deltas into the v2 code layer on branch
`feature/scoring-v2.1-triage-deltas` (off feature/scoring-v2), commit a42df38. v1 `scoring/`
BYTE-IDENTICAL (untouched); nothing activated in the live pipeline. 6 new pure modules
(statutes, liens, casetypes, develop-actions, observability, priors) + integration into
gates/decision-table/validate/score-v2 + additive prompt STEP 1B (12 optional facts + Spanish
lexicon/false-friend guard) + PART B config knobs. 145/145 unit tests pass.
**Hypothesis:** the five additive areas (statutory currency; competitor-parity extraction facts;
projected-net lien model; case-type coverage; DEVELOP action conveyor) + gaps (base-rate prior,
on-call observability, Spanish capture) raise triage accuracy without touching the architecture
or the rails. New facts OPTIONAL → absent = unknown = develop; a new fact can never wrongly decline.
**Verified 2026 law baked into statutes.mjs:** auto 30/60/15 (SB 1107); MICRA $470k/$650k
year-of-resolution (AB 35); limited-civil $35k via SB 71 (not AB 2347); rideshare $60k/$300k
passenger UM/UIM for 2026 crashes (SB 371); survival economic-only for 2026 filings (CCP 377.34);
FMCSA floors. Amounts drive TIER reasoning only, never emitted at intake.
**ACTIVATION GATE (unchanged, Ali-only):** prompt gained STEP 1B = calibration change → full gold
regeneration + v1-vs-v2 rerun + QWK/recall validation REQUIRED before activation. Merge-inactive +
shadow mode still the recommended path. Review: `git checkout feature/scoring-v2.1-triage-deltas
&& node --test scoring-v2/test/*.test.mjs`; read scoring-v2/CHANGELOG-v2.2.md.
**Review:** Ali freeze-lift decision + PI-attorney/Yang review of the open-questions lists.

## 2026-07-12 — ALI DECISIONS LOCKED: pricing / per-signed-case / Spanish / provider terms  ·  agent: session (Ali sign-off) · lane: pricing + product (§VII)
Resolves the four open Ali-only gates ahead of the 2026-07-14 beta. Recorded by Ali directly.

- **3a — PRICING: Table C, LOCKED.** List price Core **$2,500/mo**, Pro **$5,000/mo**; **Founding
  Cohort $1,500/mo (Core scope)**, first 10 paying firms only, locked 12 months from first invoice,
  always stated as a time-limited founding discount FROM the $2,500 list price, never as "the price."
  Flat monthly only; never per-case, per-signed-case, per-settlement, or any recovery-tied variable.
  This closes the three-way split (see 2026-07-10 BLOCKED-ON-ALI entry above). The exact §I first-bullet
  replacement text is staged in `ops/drafts/pricing-decision-brief.md` §5; the *number* is decided here,
  the fee-structure *wording* still takes Yang's warm pass (Yang packet Item 1) before it ships public.
  Beta itself ships pricing-removed, so this is not a Monday-launch blocker — it unblocks CR-B
  measurement + the Charter offer + every founding quote.
- **3b — Intake-Closer per-signed-case mode: KILLED for the beta.** The staged pivot's per-signed-case
  pricing contradicts the §I "never outcome-tied, ever" promise; we cannot hold both. Flat-subscription
  default stands. Per-signed-case mode is off.
- **3c — Spanish: ENGLISH-ONLY framing shipped.** The frozen scorer is English-calibrated with no
  Spanish four-fifths validation. We make NO public claim of validated Spanish scoring (already true in
  copy). The non-English → founder-review language gate is deferred to post-beta. No Spanish-heavy firm
  onboards until that gate is built.
- **4a — Provider data terms: standard-terms beta, recorded not defaulted.** Beta runs on Anthropic
  (7-day retention, NO ZDR) and AssemblyAI standard terms until signed no-training/ZDR versions land.
  Public copy claims no ZDR (already enforced). Signed provider terms to follow post-launch.
**Review:** Yang warm pass on the §I fee-structure wording (Item 1) before any public price; provider
signed terms to replace the standard-terms line when they land.
## 2026-07-11 — Session 3: mission control — instrumentation + alerting (branch beta/s3-mission-control)  ·  agent: product-dev · lane: product
**Change:** Fixed the "you cannot run a beta blind" gap — zero product analytics, activation
measured nowhere. All founder-only, all first-party (no PostHog/pixel on confidential legal
data). (1) First-party event log: migration 0027 (SQLite) / 0035 (Postgres) adds `events`
(append-only, ids/counts only — never PII/transcripts), `alert_state` (watermark k/v so each
alert fires once per window), and firms.stage (founder-set pilot/paid funnel state); Postgres
table RLS-enabled with no policy (service-role only, matching errors). event-types.mjs is the
single allowlist both dialects + the TS boundary import from. web/src/lib/events.ts is the
best-effort boundary (a lost event never breaks the user action). (2) Wired 7 call sites:
sign_in (login page → /api/events for password flow + auth/callback for magic link),
desk_view (desk/queue), digest_sent (digest/run, only mode=live), digest_link_clicked +
callback_marked (digest/confirm and desk/flag-status, callback-shaped statuses only),
audit_started (api/audit/session), audit_completed (audit/[token] page). apply_submitted and
upload_started/completed are DEFINED in the schema/allowlist but NOT wired — sibling sessions
own apply-form.tsx and /desk/upload; they wire at integration. (3) /studio/beta founder board:
per-firm calls received/scored/failed (24h/7d), last call, last seen, last digest outcome
(from the digest.run ledger Session 0 added), callbacks 7d, a live 48h activation clock (first
callback within 48h of first digest/miss), unopened-digest streak (call-the-firm at 3), and
the audit→pilot / pilot→paid funnels with a founder-set Stage control. (4) Founder alerting:
messaging/founder-alerts.mjs + hourly /api/alerts/sweep cron batches every trigger into ONE
email to FOUNDER_EMAIL — failed scoring, 3+ CallRail signature failures/hour/firm, digest
skip/fail, new applications — plus a daily 8am America/Los_Angeles per-firm pulse; delivery
uses the same EMAIL_ENABLED + KILL_SWITCH gate as digest.mjs (off/no-key → render to output/,
transmit nothing); watermarks in alert_state make every trigger fire exactly once. (5) Digest
open tracking: messaging/digest-open.mjs signs a 1x1 HMAC pixel (firm id + day, purpose-tagged
"open", no PII, fail-closed) embedded in the missed-cases digest; /api/digest/open records
digest_opened and always returns the gif.
**Hypothesis:** a beta you can't see is a beta you lose in week 1 — the activation event
(BETA_ONBOARDING.md's "first callback within 48h of first digest") and the two conversions
(insights B1/B2) must be visible from firm #1, and failures must reach the founder in hours
not "whenever he opens /admin/status."
**Expected effect:** Ali watches every firm's pipeline health, activation clock, and funnel
on one screen; scoring/signature/digest failures and new applications page him automatically
(once EMAIL_ENABLED + CRON_SECRET are set); three unopened digests trigger a phone call.
**Status:** shipped to branch (not pushed).
**Verified:** smoke 0 failures; 460/460 unit tests (new: activation clock, unopened streak,
digest.run parser, funnel math, alert classifiers/batching/pulse-timing/gated-delivery,
open-pixel HMAC, event allowlist); e2e-synthetic all 9 stages PASS; production build green
with /studio/beta, /api/alerts/sweep, /api/digest/open, /api/events all present.
**Deferred:** apply_submitted call site (api/beta/apply + apply-form.tsx) and
upload_started/completed call sites (/desk/upload) — schema is settled, sibling sessions wire
them at integration; opens undercount by nature (image-blocking clients), so a streak is a
"pick up the phone" signal, never proof of silence — labeled as such on the board.
**Review:** 2026-07-18 (end of beta week 1).

---

## 2026-07-11 — Session 9: Red-team dress rehearsal (final gate before Monday 7/14 beta)

**Change:** Adversarial stress-test of the whole `beta/integration` surface (Sessions 0–7 +
copy-audit + trust-drift). Ran a security review and a high-effort code review over the
cumulative diff (`origin/main...beta/integration`), drove every hostile week-1 input to a
terminal state, ran a hostile-ethics copy pass over the public pages, and produced the Monday
runbook. Fixes committed to branch `beta/s9-redteam` (off `beta/integration`); nothing pushed,
nothing sent.

**Fixes shipped (branch only):**
1. **Retry cap / terminal-failed state (P0).** `getUnscoredCalls` (ingest/db.mjs +
   db-postgres.mjs) selected any call lacking a flag row, ignoring status — so a
   permanently-failed call (bad audio / Spanish / single-speaker / short) was re-selected by
   every 15-min score sweep, burning a transcribe+score attempt and re-alerting the founder
   forever. Now excludes terminal `failed%`/`excluded%` statuses. A failed call surfaces once
   (visible desk status + one founder alert) then rests; clear its status to NULL to retry.
2. **Pipeline never marked success 'analyzed' (P0, latent).** Nothing in the real pipeline
   ever set `calls.status='analyzed'` — only `failed_scoring` — so the reconciliation view's
   `processed` bucket was always 0, and a firm whose calls scored clean (flag rows, zero
   leaks) read as "N calls processing" forever, the all-clear panel could never render, and
   monthly scored counts were always 0. score-worker.mjs now sets `analyzed` on success.
3. **Desk "N calls processing" counted terminally-failed calls (P0).** desk/queue/page.tsx
   folded `failed` into the processing count with copy "usually within a few minutes, nothing
   needs you yet" — untruthful for a stuck call. Now failed calls get their own honest panel
   ("N calls we couldn't read automatically … we've been notified"); processing = genuinely
   in-flight only; all-clear stays suppressed while either processing or failed > 0.
4. **Per-firm CallRail signing secret stored plaintext (security, Medium).** The secret can
   forge valid webhook signatures. Now AES-256-GCM encrypted at rest via the existing
   integrations/crypto seam (new encode/decodeCallRailSecret, keyed by INTEGRATIONS_ENC_KEY,
   `enc:v1:` prefix); encrypt in setFirmCallRailSecret (both DB layers), decrypt in the
   webhook read. Legacy plaintext / local-pilot rows decode transparently.
5. **CRON_SECRET bearer compared non-constant-time (security, Low).** digest/run + alerts/sweep
   used `===`; now a shared timing-safe `bearerMatches` (src/lib/http/bearer.ts), matching the
   webhook path's `timingSafeEqual` discipline.

**Hostile inputs → outcome (zero silent deaths confirmed):** corrupted/truncated MP3, .m4a
(accepted; whitelist mp3/m4a/wav), 30-sec hangup, single-speaker voicemail → engine throws
"No diarized utterances…" → caught → `failed_scoring` (now terminal) → visible desk failed
panel + founder alert. 100MB file → under the 200MB cap, accepted; >200MB → visible rejection.
Wrong CallRail signature → 401 + logged, 3+/hr → founder alert. Digest cron without CRON_SECRET
(hosted) → 500 naming the missing var + founder alert; with it → runs. Firm with zero member
emails → mode "skipped" → digest.run ledger → founder alert (caveat: while EMAIL_ENABLED is
off it renders-to-file and only alerts once email is enabled — verify member emails first).
Upload without consent → 400 (server-enforced `z.literal(true)`). **Spanish call → engine does
NOT throw; it gets an English-calibrated score with no honest label — accepted risk, English-
only beta framing, no public claim of validated Spanish scoring.**

**Copy pass — violations fixed (branch):** removed validated-Spanish-scoring claim ("built the
scoring against real calls in both languages") on /faq and /how-it-works → honest
English-calibrated + personal-review framing; removed live-guarantee refund reference on /terms
§9 (guarantee is suspended); softened /audit "our error rate" → future/conditional to match
/honesty. **Staged for Ali (copy decision, NOT edited):** the /letter signed essay + attestation
assert a *currently published* error rate (5 spots in letter/content.ts, 1 in letter/page.tsx)
which contradicts /honesty's deliberate withholding — resolve by publishing a real number or
rewording; this is a hard §IV/§VIII item and a Monday blocker.

**Accepted risks (documented in MONDAY_GO_NO_GO.md):** English-calibrated scoring of Spanish
calls (no validation, no label); duplicate-scoring race (flags.call_id indexed not UNIQUE —
bounded by TEST_MODE + PILOT MODE human approval; add UNIQUE post-beta); advisory-only
client-side upload size cap; failed call's storage audio object not deleted until retention
sweep.

**Hypothesis:** the beta survives contact with real firm data only if every failure ends in a
state a human can see — the firm on the desk or the founder in his inbox — and no public claim
outruns what the frozen engine can defend.
**Expected effect:** no runaway API spend or alert spam on poison calls; clean-call firms see
"all clear" not "processing forever"; firm signing secrets safe in a DB dump; public copy makes
no unvalidated Spanish or published-error-rate claim.
**Status:** shipped to branch `beta/s9-redteam` (NOT pushed, nothing sent). Frozen scoring
engine untouched.
**Verified:** `npm run smoke` 0 failures; `npm test` 516/516; `npm run e2e-synthetic` all 9
stages PASS; `npm run build` compiled successfully — all green after every fix.
**Deliverable:** MONDAY_GO_NO_GO.md at repo root (merge beta/integration→main then deploy; full
Vercel env list; 0037 migration floor; synthetic-call, digest dry-run, alert-sweep, CallRail
self-test, boards-clean, retention=90 gates; rollback via Vercel Promote / `git revert -m 1`).
**Ali-only blockers:** /letter published-error-rate copy decision; NDA template attorney review;
provider (AssemblyAI/Anthropic) data-terms decision; launch pricing numbers.
**Review:** 2026-07-18 (end of beta week 1).

## 2026-07-12 — Engine v2 firm-visible CUTOVER built + revalidated; HELD at deploy by §IV
**Change:** built the full firm-visible cutover per Ali's explicit "full cutover" decision, on
branch `feature/v2-cutover` (commit d62b48b, off main): studio pipeline repointed from v1
score-call to scoring-v2's scoreV2; `web/src/lib/studio/v2-adapter.mjs` maps the v2 triage
verdict into the product's ScoredCall contract WITHOUT synthesizing a dollar (compliant);
scoring-v2 vendored into web/.engine for Vercel. v1 scoring/ untouched.
**Revalidation:** Phase-1 PASS — next build GREEN (compiled, 81/81 pages), adapter 9/9,
scoring-v2 145/145, canary drift 7/7. Phase-2 (attorney-labeled QWK / false-alarm rate) NOT
run — no labeled corpus exists.
**COMPLIANCE STOP (supreme, outranks the "go live" instruction):** the live product publishes a
v1-derived false-alarm rate + "frozen, calibrated PI rubric" claims (site-constants.ts tagged
§IV; /calibration page). v2 has no measured false-alarm rate, so a firm-visible flip would
falsify those published-accuracy claims → §IV ("publish the false-alarm rate; no citation no
claim") + §V (no false/misleading). Pre-ship checklist items 4/5 = "no" → §VII bars auto-deploy
(green build necessary, not sufficient). Also a novel scoring methodology → Yang (§VII).
**Path to live (both need a human/attorney input I cannot fabricate):** (1) measure v2's
false-alarm rate on attorney-labeled calls and re-point /calibration to it, OR reword the
published-accuracy copy to truthfully describe v2 (recommendations + tiered confidence, no
published rate yet) — a §IV/§V copy change; (2) Yang methodology nod. Then one merge+push
(build already green). Compliant interim = shadow mode (v2 live dark, v1 firm-visible, zero §IV
exposure) — Ali declined shadow; flip is staged and ready.
**Review:** Ali's call on the two unblockers.

---

## 2026-07-12 — Founder command-center rebuild (operator IA collapse)

**Change (shipped to working tree, NOT pushed — Ali's deploy call):** Rebuilt the operator
side around one screen and four nav words, on Ali's "everything is scattered, make it dead
simple, show me exactly what to do and where the value is" brief.

- **Nav: 10 → 4.** `StudioNav.tsx` now = Home · Firms · Guide · System (+ quiet "Firm view"
  and "Sign out"). Invented names ("The Mirror"/Mystery shops, "The Ledger"/Monthly results,
  Rescues, Urgent leads, Beta health, Tuning) removed from navigation; they live one hop
  inside Home under a collapsed "Everything else" disclosure.
- **`/studio` home = command center.** Three zones, F-pattern: (1) THE MONEY — dominant
  "Signable fees surfaced so far" figure (new `lib/studio/value.ts` sums `summary.totalFeeAtRisk`
  across real Leak Audits, an estimate backed by transcript evidence, never a guarantee) + a
  primary "Show a firm the value →" button opening `/audit/sample`; empty-state pitches the
  sample report so a zero-data founder can still demo in ~60s. (2) NEEDS YOU NOW — the
  attention inbox, non-zero tiles ring accent (ambient signaling), "You're all clear" at zero.
  (3) CREATE VALUE — the existing Leak Audit uploader, reframed as the core loop.
- **New `/studio/guide` ("Start here").** Plain-English: what this is, where the value is,
  the 60-second demo script, the 5-minute daily routine, the four-step loop, and where every
  old menu item now lives. Answers "what do I do / how do I use it" directly.

**Hypothesis:** the prior simplicity passes relabeled but never cut structure; collapsing 17
operator destinations to 4 + one money-first home is what actually removes founder confusion
and makes value demoable on first contact.

**Compliance:** every dollar labeled an estimate tied to transcript evidence (§IV); no
outcome-tied/percentage framing (§I); "a human approves every text" stated in the Guide (§VII).
Nothing sends. Build GREEN (compiled 11.8s, all routes incl. /studio/guide), 540/540 tests
pass, sample-report demo path driven in preview (200, $27k headline renders, no console
errors). Studio home + guide are founder-auth-gated; verified they compile + gate-redirect,
not visually driven (no founder session fabricated on live Supabase).

**Review:** Ali to click through Home + Guide signed in, then decide on deploy.

## 2026-07-12 — Engine V2 SHADOW MODE deployed to prod; compliant flip-copy staged
**Change:** shipped v2 shadow mode to origin/main (commits ca24d15 + 7675c84 → Vercel).
Engine V2 (triage) now runs DARK on every scored call — BOTH the studio pipeline and the
ingest score-worker (real firm calls) — attaching its adapted verdict under the internal
`scoring._v2_shadow` key (passthrough, never rendered, failure-isolated so it can never
break the firm-visible path). v1 remains the firm-visible scorer + flag logic; ZERO
firm-visible change. Adapter emits NO dollar (compliant). scoring-v2 vendored into web/.engine.
**Why shadow not full flip:** compliance-invariants §IV — the live product publishes a
v1-derived false-alarm rate + "calibrated rubric" claims; v2 has no measured rate yet, so a
firm-visible flip would falsify those (§IV/§V). Shadow keeps v1 firm-visible (claims stay
true) AND accrues the v1-vs-v2 corpus that will MEASURE v2's rate → earn the flip.
**Staged for the flip:** `ops/drafts/engine-v2-flip-copy.md` — exact compliant copy reword
(defer "validated / published false-alarm rate" for v2), apply in the same commit that flips
v2 firm-visible. Yang methodology review deferred per Ali.
**Verification:** build GREEN on current main (81/81); adapter 9/9; scoring-v2 145/145; canary
7/7. Vercel re-builds on deploy as the final gate. Shadow data accrues on calls scored AFTER
the deploy. **Next to earn the flip:** measure v2 false-alarm rate from the shadow corpus,
apply flip-copy, (optional) Yang nod. Branches: feature/scoring-v2.1-triage-deltas (engine),
feature/v2-cutover (full-flip pipeline, staged).
**Review:** once shadow corpus has N calls, compute v2 vs v1 disagreement + v2 rate.

## 2026-07-14 — Tiered/sampled review shipped LIVE flag-ON; Ali accepts pre-Yang exposure
**Change:** deploying the mill-readiness branch (feat/mill-readiness → main → Vercel) with
`SAMPLED_REVIEW_ENABLED=true` (Ali set the env). This activates the tiered review model on the
ongoing Monthly Missed-Revenue Statement: the calibrated engine + citation guard carry
strong-confidence, evidence-verified, low-stakes findings (auto-release, labeled
"Engine-scored · evidence-verified"); any high-value / low-confidence / citation-gap flag forces
analyst sign-off ("Analyst-reviewed"). Firm-facing released-only statement download shipped.
Also live: recovery-first repositioning, Enterprise "Custom" volume tier, checkout re-enabled
(beta-free gate; still simulated until Stripe keys set), roles + /desk/team, throughput/upload
fixes. Free Leak Audit stays 100% hand-reviewed.
**The flagged exposure (§IV/§V):** the narrowed analyst attestation ("I personally reviewed every
high-value flag … and a random sample of the remainder") changes what Ali's SIGNED attestation
attests to. Compliance-invariants routes novel regulated changes to Yang FIRST. Yang has NOT yet
reviewed the wording.
**Decision (Ali, explicit + informed, 2026-07-14):** go live now, accept the pre-Yang exposure,
route the attestation wording to Yang as a WARM contact reviewing AFTER (mirrors the §VII
deploy-authority amendment precedent). Agent surfaced the exposure three times and via an explicit
choice before deploy; not smoothed over.
**Still owed to Yang (warm, not a hard block):** review of the narrowed attestation wording +
the BAA draft. Send-ready packet in ops/drafts/sampled-review-model-PROPOSAL-2026-07-14.md +
ops/drafts/baa-and-data-protection-DRAFT-2026-07-14.md.
**Safety properties (verified):** flag-OFF is byte-identical to prior behavior; force_review can
never reach the auto-release branch; the §IV floor is a REAL citation_failures count (not an
assumed 0), which is why auto-release runs on the firm pipeline, not the demo-isolated
audit_sessions; firm statement download serves ONLY released rows, firm-scoped (no ?firm param),
cross-firm → 404. tsc clean, 643/643 tests, next build green. Hosted PG current through 0045.
**Review:** after Yang reviews the attestation wording — if she objects, flip
SAMPLED_REVIEW_ENABLED=false (reverts to 100% hand-review, byte-identical) and revise.

# IntakeQA Marketing-Copy Audit — 2026-07-11

**Method.** Every customer-visible word on the marketing surface was transcribed verbatim
(23 sections: all `(marketing)` pages, `/audit`, `/audit/sample`, `/demo`, `/intake-demo`,
`/letter`, shared chrome, metadata, and both copy-constants files). It was then audited
against three evidence bases: (1) a 106-agent deep-research pass on how PI attorneys read
vendor sites, every claim adversarially verified 3-vote (findings cited below as **DR-n**);
(2) the internal persona field guides and insights ledger (`ops/insights.md`); (3) the
compliance invariants. Full copy transcript: session scratchpad `copy-inventory.md`.

**Overall verdict.** The site is unusually well-aligned with how PI attorneys actually
evaluate vendors. The independence positioning, the flat-fee negations, the compliance page
written "for your ethics counsel," the no-logos-yet honesty, the PI vocabulary
("signable," "walked," "sign rate"), and the near-absence of AI hype all match what the
research says builds credibility with this audience (DR-0, DR-2, DR-4, DR-6). The problems
are concentrated, not diffuse: **four credibility breakers, four internal contradictions,
and a set of word-level refinements.** Fix the first eight and the site survives a
skeptical managing partner's click-through; today it does not.

The audience model, in one paragraph (all verified): a PI managing partner reads vendor
copy through the lens of his own advertising rules — Rule 7.1 trains him to treat
guarantees, unverifiable numbers, and superlatives as *violations*, not puffery (DR-0).
An intake vendor is a personal-discipline vector for him (ABA Op. 501: he can be
disciplined for a vendor's conduct; Rule 5.3 makes him supervise you), so copy that shows
its 7.3/5.3 homework de-risks the purchase (DR-2). On AI, Op. 512 obliges him to
understand your architecture, so copy must say what the model sees, whether it trains on
his data, and where the human sits (DR-3, DR-4). His fear order is:
accuracy → confidentiality → regulatory exposure (DR-6). His unit of value is the signed
case; his math is cost per signed case (DR-8). And the vendor-blog stats everyone quotes —
70% lead loss, "5 minutes = 400%", CPSC dollar benchmarks — **failed independent
verification** and should never be repeated as fact (DR research, refuted 0-3).

---

## P0 — Credibility breakers

### P0-1. The error-rate promise is false today (the worst problem on the site)

**Where:**
- `/letter` (`web/src/app/letter/content.ts`, ¶4): "Intake QA maintains a public
  Calibration & Honesty page that states, in plain numbers, how often my scoring gets it
  wrong: the false-alarm rate, kept current as the calls come in."
- `/letter` closing: "Before you decide, go read the Calibration & Honesty page. Read how
  often I get it wrong, in my own numbers, in public."
- Homepage hero (`HONESTY_STRIP_LINE`, site-constants.ts:105): "We publish how often
  we're wrong." + "See our error rate →"
- Footer link label: "Our error rate"
- `GUARANTEE_METHODOLOGY` (site-constants.ts:165, rendered on /honesty): "…our model's
  precision and recall are published on this page."

**Problem:** `/honesty` explicitly refuses to publish precision/recall until the corpus is
documented — which is the *right* call — but four other surfaces promise the number is
already there. An attorney who takes the letter at its word, clicks through, and finds no
number experiences the exact trust collapse the letter is engineered to prevent. The
letter's whole thesis is staked words; this is an unstaked word at the center of it.
Rule 7.1-conditioned readers classify "we publish X" when X is not published as a
misleading claim (DR-0). This also currently fails our own §IV "no citation, no claim."

**Proposed fixes (all preserve the honesty positioning — they sell the *refusal*):**
- `HONESTY_STRIP_LINE` → **"We tell you what we won't claim yet."** Link text:
  "See our calibration page →" (or keep "our error rate" only after numbers exist).
- Footer link "Our error rate" → **"Calibration & honesty"**.
- `GUARANTEE_METHODOLOGY` final clause → "…our model's precision and recall **will be
  published on this page the day the test corpus is documented — and not before.**"
  (Also resolves the live self-contradiction on /honesty.)
- `/letter` ¶4 (needs Ali's sign-off — the letter is signed and version-controlled;
  bump to v1.4 with a changelog line): "Intake QA maintains a public Calibration &
  Honesty page that states the method, the two ways the model fails, and the numbers I
  refuse to publish until the test corpus is documented. The false-alarm rate goes on
  that page, in public, as the calls come in — and nothing goes there before it can be
  checked." Closing paragraph: "go read the Calibration & Honesty page. Read what I will
  and won't claim, and why." → the final sentence "If you find yourself trusting me more
  after reading how I fail" still works because the page does document the failure modes.

### P0-2. The $468 stat prints a broken derivation on the homepage

**Where:** `STAT_PI_COST_PER_CASE` (site-constants.ts:218, homepage StatBar): "$468 /
blended cost to acquire one signed PI case (at $284 per lead and a 7% conversion rate…)".

**Problem:** $284 ÷ 7% ≈ **$4,057**, not $468. The label prints the inputs next to the
output, so any owner who computes cost per signed case — which is exactly the math this
audience does (DR-8) — catches it in seconds. `ops/insights.md` (B4 data-integrity flag)
already ruled: "use $284/lead as the clean VERIFIED anchor and present cost-per-signed-case
as a RANGE, never a point estimate." The deep-research pass independently refuted CPSC
dollar benchmarks as a class (0-3). One caught math error poisons all four stats and the
"no citation, no claim" brand.

**Proposed fix:** Replace the stat with the clean anchor and let the reader's own
arithmetic make the point (his arithmetic is trusted; ours isn't — internal persona
research: 65% of B2B buyers call vendor ROI math inflated):
- value: **"$284"** — label: "average cost of a single PI lead — before your intake team
  ever picks up the phone" — source: unchanged (Pareto Legal, 13 plaintiff firms, $3.3M
  spend, 2025).
- Delete `STAT_PI_PPC_COST_PER_CASE` ($2,500–$3,000, unrendered) — same refuted class.

### P0-3. The half-million-dollar projection on /audit/sample

**Where:** `/audit/sample` (audit/sample/page.tsx:111–122): "What a full month might look
like — If this rate held for a full month, that's roughly $253,125 to $506,250…"

**Problem:** A ~$0.5M/month figure extrapolated from **8 synthetic calls** is the
canonical "vendor-computed you're-losing-$84k math" bounce trigger, at 6× the usual dose.
It also contradicts the page's own subhead 30 lines up: "This is what we found in the
sample, **not a projection**." Rule 7.1-conditioned readers file unverifiable extrapolation
under misleading (DR-0). The disclaimer ("A projection, not a claim") does not fix it —
the number is the headline; the hedge is the footnote.

**Proposed fix:** Delete the extrapolation and convert the section into the honesty pitch:
> **"What a full month looks like — we won't tell you from a sample."**
> Eight synthetic calls prove the method, not your number. Extrapolating a monthly dollar
> figure from a sample is the kind of math you've been pitched before, so we don't do it.
> The honest way to know is a month on your own calls, and the first look is free.

### P0-4. The 400% speed-to-lead stat is refuted — remove before it ever renders

**Where:** `STAT_SPEED_TO_LEAD` (site-constants.ts:211, defined, deliberately unrendered):
"400% higher conversion when a firm responds within the first five minutes" (ALM Global).

**Problem:** The "5 minutes / 400%" multiplier failed adversarial verification (0-3) — it
traces to recycled vendor lineage, and sophisticated PI buyers have seen it "waved in your
face" (the letter itself mocks "the tired secret-shopper statistics… that every intake
product on earth waves in your face"). Citing it anywhere would put the site inside its own
insult.

**Proposed fix:** Delete the constant (or comment it `// REFUTED 2026-07-11 — never
render`). Keep all speed claims **directional and qualitative**, as /how-it-works already
does ("the faster a firm responds… the more of those callers sign") and as the SampleAlert
does ("lead value fades fast"). Directional is credible; the multiplier is not.

---

## P1 — Internal contradictions a lawyer will catch across two pages

### P1-1. Retention: /privacy contradicts /security, /faq, and the DPA
/privacy §6 states blanket 72-hour deletion of transcripts/reports; the other three
surfaces correctly add the rolling 90-day window for desk firms. This audience has an
affirmative Op. 512/Rule 5.3 duty to vet retention terms (DR-4) — /security even invites
the review ("Answers to your vendor security review"), so the inconsistency surfaces
during the exact diligence the site solicits. **Fix:** make /privacy §6 restate
`DELETION_LINE` (site-constants.ts:184) verbatim; ideally have all four surfaces import
the constant so this class of drift can't recur.

### P1-2. Attestation drift on the homepage sample statement
`SampleStatement.tsx:146` hard-codes the attestation but omits "and it carries no
penalty-of-perjury attestation" from `GOLD_ATTESTATION` (marked "use verbatim"). The
omitted clause is a *hedge that builds trust* — precisely the kind of scope-limiting
language lawyers respect in an attestation. **Fix:** import the constant.

### P1-3. §632 numbers differ between /letter and /compliance
Letter: "$5,000 in statutory damages per violation" (that's §637.2, civil). /compliance:
"a fine up to $2,500 per violation" (criminal). Both correct alone; side-by-side they read
as sloppiness to the one profession that will check. **Fix (compliance page, 3 words):**
"…a criminal fine up to $2,500 per violation, plus $5,000 per-violation civil statutory
damages under §637.2…"

### P1-4. CTA drift
`/audit/sample` says "Run your free Leak Audit"; sitewide `CTA_PRIMARY` is "Get your free
Leak Audit." Import the constant. (Same fix class as P1-1/P1-2: constants exist; pages
bypass them.)

---

## P2 — Word-level edits, in page order

1. **"prospects" → "callers" sitewide.** `BETA_GROUND_RULES`, footer legal footnote,
   FAQ 2, homepage beta card 2: "we never contact your prospects." "Prospects" is
   sales-floor vocabulary; the profession's term is prospective clients (Rule 1.18), and
   the site's own warmer register is "your callers" (used in SampleAlert, /for-callers,
   /demo). Standardize: **"we never contact your callers."**
2. **/concierge H1 "White-glove recovery for founding firms."** "White-glove" is
   vendor-brochure language (superlative-adjacent), and "recovery" here collides with the
   letter's careful redefinition of the word. → **"Setup is on us."** (body already
   carries the meaning). Consider folding this thin page into /how-it-works entirely.
3. **`STAKE_LINE` over-repetition.** "I charge nothing until the number survives your
   scrutiny" renders ~6 times on a typical browse path (hero, hero-footnote quote, banner
   ×4 pages, /pricing, /honesty, letter). A signature line gains from scarcity. Keep hero
   + letter + /honesty; drop it from `PilotCohortBanner` (the banner already says "free
   during the beta").
4. **OG default headline "Recover the cases your intake let slip"** — "your intake let
   slip" assigns blame to staff; every other surface is disciplined about blaming volume,
   not people (the intake manager may see the shared link). → **"Recover the cases that
   slipped."**
5. **StatBar coherence.** `STAT_LA_HISPANIC` (48.4% of LA County…) sits unexplained
   between three economics stats; a reader asks "so what?" Add a one-line caption under
   the bar: *"What a lead costs, how often nobody answers, who's calling, and how few
   firms know their own number."* (Also verify the 48% Clio "unreachable" framing against
   the Legal Trends PDF in `Reading/` before the next outreach wave — it's the strongest
   stat on the page and must be quote-accurate.)
6. **ROI calculator tone labels.** "Conservative / Optimistic" → **"If you win back 1 in
   5" / "If you win back 2 in 5."** Concrete fractions beat adjectives, and it keeps the
   assumption visible at the point of the number (vendor ROI math is the #1 distrust
   object; the calculator's your-own-inputs design is right — finish the job).
7. **Pro tier (dormant, returns at launch):** "the recovered-lead recovery workflow" —
   doubled word. → "the lead win-back workflow."
8. **/demo stat label "Did your team ask?"** — ask for what? → **"Did your team ask for
   the signup?"**
9. **Missing trust lever — named phone systems.** DR-7: 43% of legal-AI adopters chose
   tools that ship inside software they already trust; the /audit page's per-vendor export
   instructions (CallRail, RingCentral, 8x8, Dialpad, Vonage) are a hidden asset. Surface
   the names once on the marketing path — /how-it-works step 2: "…through your existing
   phone system (CallRail, RingCentral, 8x8, Dialpad…) or a manual upload."
10. **Terminal-punctuation sweep on H2s.** "How it works." / "Start with a free Leak
    Audit." (periods) vs "The method" / "Encryption" (none). Pick one rule per heading
    level.
11. **Dormant-constant hygiene** (returns at launch, fix now while cold):
    `AUDIT_FREE_LINE` duplicates /audit copy; `GUARANTEE_CANONICAL`/badge must be re-vetted
    against P0-1 before un-suspending; `PRICING_ANCHOR_LINE` benchmarks tool prices —
    fine (it anchors against *tool budgets*, not case outcomes).

---

## What NOT to change (verified strengths — resist the urge)

- **Homepage H1** "Find the signable cases that walked out of your intake — and what they
  cost you." Leads with their word (*signable*), no AI, dollarized. Keep.
- **The compliance page** is the single most credible asset for this buyer: it names
  Rules 7.2/7.3/5.3/1.18/1.6, Op. 512, §632, TCPA posture, and — rarest of all —
  concedes: "We don't claim the save protocol is categorically outside 7.3." That
  sentence is worth more than any testimonial (DR-2, DR-4). Keep verbatim.
- **"Built to survive your ethics counsel."** Keep.
- **The honesty page's refusal**: "A number without its test set is the kind of thing
  you've been pitched before." Keep — and after P0-1, the rest of the site finally
  matches it.
- **"No logos, no case studies yet… just the work"** (founder, FAQ 10). Disclosed
  limitation = trust with this audience. Keep.
- **AI quietness.** "AI-powered" never appears as a headline anywhere. The only AI
  mentions are supervisory ("The AI drafts. It never sends."). This matches DR-4/DR-6
  exactly. Keep the discipline; do not let launch copy re-introduce AI hype.
- **Fee-language sweep: clean.** Every per-case/percentage phrase on the site is a
  negation ("never per case, never per signed client, never a share") — §I compliant.

## One strategic flag (decision for Ali, not a copyedit)

**"The independent recovery desk."** To a CA plaintiff lawyer, "recovery" primarily means
the client's recovery — the letter itself has to spend a paragraph defusing the word
("'Recovery' means analysis… nothing to do with your fees"). A name that needs a
defensive paragraph is carrying risk, and §I's whole architecture exists to avoid
fee-participation connotations. Alternatives if ever rebranding is on the table
(relevant given the Intake Closer pivot discussions): "the independent intake desk,"
"the independent scoring desk." Not urgent; flagged because the evidence surfaced it.

---

*Sources: DR-n = deep-research findings (106-agent verified run, 2026-07-11, full report
in session task output); persona research = ops/insights.md 2026-07-10 entries;
constraints = .claude/skills/compliance-invariants. Staged as a draft per
OPERATING-PROTOCOL — nothing here ships without Ali's approval; P0-1's letter edit
additionally needs the letter's version bump and sign-off.*

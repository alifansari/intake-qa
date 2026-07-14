# IntakeQA Website Redesign — the exhaustive spec

2026-07-13. Thinking only; build later. Grounded in the actual current site (site-constants.ts, the home page, all 16 marketing routes, /honesty), the strategic research (independent-audit positioning, marketing-spend-protection frame, verified stats, competitive white space), the compliance invariants, and everything shipped this session (Our accuracy / calibration, Recovered / receipts, auto-triage, reliability).

---

## 0. The verdict up front: refine, don't rebuild

The current site is genuinely good and — this surprised me — already on the exact "independent intake desk" positioning I'd have recommended, already compliance-hardened (kill-lists of refuted stats, careful §I/§IV/§V language, the independence comparison table), and it already resolved the independence tension the founder cares about ("your own staff make every callback, we never contact your callers"). It is not a teardown candidate. Anyone who says "burn it down" hasn't read it.

But it was written **before** the product could prove itself. That gap is the whole redesign. Three things are now true that the site doesn't reflect:

1. **The product can now prove its own accuracy** (the calibration loop / "Our accuracy"). The site's central trust move is currently a *promissory note* — "we won't claim a precision/recall number until the corpus is documented." That machine now exists.
2. **Shipped features are still marketed as "in development"** (the trending statement, intake-team scorecards). The site is *underselling* live capability.
3. **The most visceral proof asset — the tape — is absent.** The site shows static documents (SampleStatement, SampleAlert) but never lets a partner *hear* their own intake drop a signable case.

So the redesign is a **proof upgrade**, an **economic-hook sharpening**, and an **IA tightening** — not a rewrite of the voice, positioning, or compliance spine, all of which are strong.

---

## 1. The one narrative flip (the highest-leverage change)

**Today the site's trust argument is defensive: "here's our method, and here's what we honorably won't claim yet."** That earns respect but it's a promissory note.

**The redesign makes it a track record: "here's how often we're right, measured against your own decisions, with the sample size — the one number no vendor in this space will ever show you."**

This is the Moody's/J.D. Power move. An independent rating authority that *publishes its own accuracy, including its miss rate,* becomes the standard by doing the thing raters do: transparent, sample-sized, attributable. Radical honesty *is* the moat because a vendor-not-authority can't fake it. The `/honesty` page stops saying "we won't claim it yet" and starts saying "here it is, and here's the n." (Governed by the §IV min-n gate and Wilson intervals already built into the calibration engine — the honesty is enforced in code, not just promised in copy.)

Everything else in this spec serves that flip.

---

## 2. The three highest-leverage moves

1. **Add the tape.** One embedded, redacted, ~40-second audio moment of a signable call being lost, with the transcript scrolling and the flip-fact called out ("here's where the $45k case walked: the injury question never got asked"). Hearing your own intake fumble a case is 10x the gut-punch of reading a statement. It belongs in the hero. No competitor does this because none of them are independent enough to.

2. **Publish the accuracy number (the calibration report, externalized).** Transform `/honesty` into `/accuracy` (or a hero block): "When we grade a call SIGN, firms sign it __% of the time (n=…). When we say PASS, they pass __%. Here's our wrongful-decline rate — the cases we told a firm to drop that they signed elsewhere — because we'd rather show you our worst error than hide it." Until the corpus crosses the min-n threshold, it honestly reads "still building — N of 30," which is *itself* a trust signal (you're watching a real number accrue, not a marketing fabrication).

3. **Lead with the buyer's own economics — marketing-spend protection.** The current hero ("see the signable cases that walked, and what they cost you") is good but abstract. Sharpen it to the gut number the partner already feels: *you spend five figures a month to make the phone ring, then lose 1 in 3 signable callers after it rings, and no one in the building can see it.* The $284/lead stat exists on the page but isn't woven into the hero narrative; weave it in.

---

## 3. Home page — section-by-section redesign

Current order: Hero → SampleStatement → How it works (3 steps) → StatBar → Independence + table → What lands on your desk → Audit CTA → ROI → Beta → Compliance → Final CTA. Good bones. Changes:

- **Hero.** Keep the structure, sharpen the promise toward marketing-spend protection and add the accuracy proof-point as a sub-line. Candidate H1s to test against the current one ("See the signable cases that walked out of your intake, and what they cost you."):
  - "You paid for that lead. Your intake let it walk. We're the only ones who'll tell you."
  - "The independent audit of your intake — the one number on your firm that isn't self-graded."
  Add a hero proof chip: the live accuracy stat (or "still building" state) + "we publish our own miss rate."
- **Hero artifact → make it the tape, not (only) the statement.** Lead the visual with the audio moment; keep the SampleStatement as the second artifact. Seeing *and hearing* beats seeing.
- **How it works (3 steps).** Keep. Tighten step 3 to reflect that it's now a running product, not just "join the beta" (the beta framing should be one line, not the headline of the step).
- **StatBar.** Fix a real self-contradiction: the site features "48% unreachable" (a *missed-calls* stat) while its own CATEGORY_BOUNDARY_LINE says "if your problem is missed calls, buy an AI receptionist; our work starts where the phone gets answered." Featuring the missed-calls number undercuts the positioning. Replace it with a stat about leakage *after* the answer, or reframe it ("even the calls you answer leak"). Keep $284/lead, <10%-know-their-CAC, and the LA-Hispanic figure (the bilingual wall is a real, on-positioning leak).
- **Independence section + table.** Keep almost verbatim — it's the strongest thing on the page. Add one row to the comparison table: **"Publishes its own accuracy / miss rate?"** → No / No / No / Yes. That row *is* the moat, stated as a checkbox a math buyer can't argue with.
- **What lands on your desk.** Reconcile the deliverable names with what actually shipped. The four listed (Recoverable-Lead Alert, Missed-Revenue Statement, Team Coaching, Saved-Case Ledger) now map to real surfaces (the worklist, the statement, coaching, Recovered). Add a fifth, promoted high: **"Our accuracy" — the track record that proves the other four.** Make accuracy a *deliverable*, not a footnote.
- **ROI calculator.** Reframe from generic recovery to **marketing-waste**: input monthly ad spend + cost per case → output "a 1-in-3 intake leak is setting fire to $X of the money you already spent." Same math, a frame that makes the partner angry at the leak, not skeptical of the tool.
- **Beta section.** Keep, but design it to gracefully become the "founding-member pricing" section post-beta (see §9). The "who does the work / Ali as analyst of record" content is a genuine trust asset — keep it prominent.
- **Compliance strip.** Keep. It's a differentiator, correctly placed low (reassurance, not lead).
- **Add a new section: the champion.** The CHAMPION_LINE ("this isn't a gotcha… the desk makes your manager look good") is one of the best lines in the constants and appears nowhere strong on the home page. The buyer is the partner; the *user* is the intake coordinator, and if the coordinator experiences this as a narc they'll sabotage it. A short "built to make your intake team look good, not exposed" section defuses the #1 internal objection and is nearly unique in the category.

---

## 4. The proof revolution (the section that wins the deal)

This is the redesign's center of gravity. Assemble the proof into a tiered ladder, strongest first:

1. **The tape** (hear a case walk) — visceral, undeniable.
2. **The accuracy track record** (the calibration number + the wrongful-decline rate + n) — the rational proof, and the moat.
3. **The reconciliation claim** — "a flag means a case that *truly* walked, checked against the fee agreements that actually got signed," not a capture-time guess. (Already in DIFFERENTIATORS; elevate it.)
4. **The sample statement + sample alert** (what you'll hold) — keep, demote below the tape.
5. **The founder attestation** (Ali reviews every score; former PI paralegal who sat in the intake seat) — the human stake.

The site currently has 3, 4, and 5 but leads with 4. Reorder: hear it, then see the accuracy, then see the artifact.

---

## 5. Page-by-page: keep / revise / create / delete

**KEEP, light touch:** `/compliance`, `/security`, `/for-callers` (claimant transparency + En español — a genuine trust/ethics asset most vendors lack; keep), `/terms`, `/privacy`, `/msa`, `/dpa`, `/apply`.

**REVISE (substantive):**
- **`/honesty` → the flagship proof page** (consider renaming the nav label to "Accuracy" while keeping the URL, or new `/accuracy`). The single biggest revision on the site: from "what we won't claim yet" to the live track record + the wrongful-decline rate + the corpus description. Keep the confidence-tier table and the estimation methodology. This page becomes a reason to buy, not a disclaimer.
- **`/how-it-works`.** Update to include auto-triage ("the queue fills itself from the recordings — your team confirms a grade in one tap, they don't re-key a form") and the accuracy loop. Currently it describes the mechanism as it was before those shipped.
- **`/pricing`.** Two fixes: (a) reconcile the number — the site says Core $2,500 / Pro $5,000 / Charter $1,500-intro, while the compliance-invariants doc still says "Core ~$1,500 / Pro ~$3,000." One of them is stale; the site + .env ($2,500/$5,000) is the live decision, so the *invariants doc* should be updated, and the redesign should confirm the real numbers with Ali. (b) The PRICING_ANCHOR_LINE ("sits inside the tool budget you already carry") and the PRICING_COMPLIANCE_ARGUMENT are excellent — keep. Add the marketing-waste anchor: "less than the fee on one signable case a year."
- **`/manifesto`.** Strong POV ("why intake is where PI firms bleed"). Keep, but audit for overlap with `/founder` and `/letter` (three long-form persuasion pieces — see below).
- **Home** (all of §3).

**EVALUATE FOR MERGE/DELETE:**
- **`/concierge`** ("concierge setup"). Feels orphaned and possibly redundant with `/how-it-works` and the onboarding (~2 hours to forward recordings, already covered by LIFT_LINE). Likely fold its content into `/how-it-works` or the beta/apply flow and delete the standalone page, unless it serves a specific sales moment.
- **Three overlapping persuasion long-reads — `/manifesto`, `/founder`, `/letter`.** Manifesto (POV), Founder (why I built it), Letter (signed public essay). There's real risk of redundancy and diluted attention. Decide the distinct job of each: Manifesto = the *category thesis* (intake is the leak); Founder = the *human credibility* (who Ali is, why trust him); Letter = the *personal stake/attestation*. If they can't each hold a distinct job, merge Letter into Founder. Keep at most two.

**CREATE (new pages/surfaces):**
1. **`/accuracy`** (or the transformed `/honesty`) — covered above. The proof page.
2. **A "the tape" surface** — either a hero component or a short `/proof` page: 3-5 redacted "worst-lost call" moments with audio + the flip-fact. This is the most persuasive asset the site can have and it has nothing like it today.
3. **(Consider) `/for-intake-managers`** — the champion angle as a page, so a partner can forward it to the person who'll actually use it ("here's how this makes you look good"). Or fold into how-it-works. Low priority but genuinely differentiated.

---

## 6. Specific copy fixes (line-level)

- **Reconcile "in development" vs shipped.** MONTH_6_ITEMS marks "a statement that trends over time" and "intake-team scorecards" as "In development with the founding cohort." Both shipped (Recovered = trending statement; Our accuracy + scorecard). Change status to live. Marketing vaporware as "in development" is honest; marketing *shipped* features as "in development" is leaving money on the table.
- **The 48%-unreachable stat vs the category boundary** (see §3 StatBar). Resolve the contradiction.
- **The guarantee — I owe you a correction.** Earlier this session I said "kill the dollar guarantee, it violates §IV." Having now read GUARANTEE_CANONICAL, I was partly wrong: the existing $25k *find-it-free* guarantee is carefully constructed to attach to a **diagnostic finding + first-month-free**, explicitly "an estimate of what walked, not a promise of recovery." That is materially safer than the "we'll recover $X" guarantee I was warning against, and it's already SUSPENDED for the beta. Recommendation: keep it as written, bring it back at launch (not during the free beta, where there's no fee to waive), and never let it drift toward an outcome promise. My earlier warning stands only against a *recovery* guarantee, which this isn't.
- **Speed-to-lead stays generic** (the 400% number is correctly kill-listed). Don't let any redesign copy re-introduce a speed multiplier from memory.
- **Bilingual leak: use the safe framing.** The specific Spanish-lift percentages are kill-listed; the honest hook is the ACS "~16-18M limited-English Spanish speakers" + "the specific lift is what the beta measures." Keep it directional.

---

## 7. Design / visual upgrades (not just copy)

The design system is clean and consistent (font-display, rounded-card, accent, navy, the hairline borders). Upgrades:

- **A real hero visual beyond a static document.** Today it's a SampleStatement image. Add motion/interactivity: the tape player, the live accuracy stat, or a short animated "call → grade → the miss" sequence. The category is full of flat SaaS heroes; an *audible* proof is a pattern-break.
- **The accuracy number as a designed stat object** (big, with its n and confidence range visible) — the visual embodiment of the moat, reused in the hero and on /accuracy.
- **The comparison table is the best visual on the site** — lean into that style (clean checkbox matrices) for the proof section too.
- **Mobile.** PI partners and intake staff read on phones; verify the tape player, the comparison table (currently `min-w-[36rem]` → horizontal scroll on mobile), and the ROI calculator are thumb-friendly.
- **Trust chrome.** A persistent, quiet proof strip (accuracy stat + "we publish our miss rate" + "reviewed by a former PI paralegal") near CTAs, not just buried on /honesty.

---

## 8. Compliance guardrails the redesign must hold (non-negotiable)

Every change above still binds to the invariants (they're supreme, and the site already respects them):
- **§I** flat fee only — never per-case / % / outcome-tied. (The anchor lines and the compliance argument are already correct.)
- **§IV** no guarantee of recovery; every dollar is an estimate with its inputs; **the published accuracy number must carry its n and confidence interval and stay suppressed under the min-n gate** (already enforced in the calibration engine — the site must render that honesty, not paper over it).
- **§V** no unsubstantiated superlatives. "The only ones who publish their miss rate" must be *literally true and substantiated* before it ships (it is, if we in fact publish it and no named competitor does — verify the competitor claim). Avoid "the best / #1."
- **Kill-list stats never return** (speed-to-lead 400%, Spanish-lift %s, first-lawyer 79%/391%, LPL-carrier %s).
- **The tape** must respect CIPA/consent and confidentiality: use consented/redacted/synthetic audio only, never a real claimant's call without the consent chain (§II) — likely a synthesized or fully-consented, de-identified reconstruction. Route the "tape" concept through Yang before it ships (novel use of call audio in marketing).

---

## 9. Beta → launch versioning

The site is heavily "5 founding seats, free during the beta." That's right for now, but design every section so it degrades gracefully to the launch version:
- Beta "free" → founding-member/Charter pricing (the constants already exist: CHARTER_*).
- "In development" statuses → "live."
- Dollar figures return to public copy post-beta (founder decision already noted in constants).
- The accuracy number goes from "still building — N of 30" to the published rate as the corpus matures.
Build the redesign so this is a copy/flag flip, not a re-layout.

---

## 10. Open questions for Ali (decisions the redesign needs)

1. **Confirm live pricing** — $2,500 Core / $5,000 Pro / $1,500 Charter-intro (site/.env) vs the stale invariants-doc numbers. Which is real?
2. **The tape** — willing to feature consented/redacted or synthesized audio of a lost call? (The single most persuasive asset; needs Yang sign-off.)
3. **Publish the accuracy number publicly** once the corpus crosses min-n — yes? (It's the moat, but it's also committing to show the miss rate. Recommend yes.)
4. **Rename /honesty → /accuracy** in nav, or keep "honesty" framing?
5. **Consolidate manifesto/founder/letter** — keep all three or merge to two?
6. **Delete /concierge** or repurpose it?
7. **Post-beta timing** — when does the "5 free seats" framing flip to pricing?

---

## Bottom line

The site doesn't need a new voice, a new position, or a compliance rework — it has excellent versions of all three. It needs to **catch up to the product it now describes**: publish the accuracy it can finally prove, let a partner *hear* a case walk, sharpen the hook to the money the buyer already spends, promote shipped features out of "in development," and tighten a slightly sprawling IA. Do that and it stops being a well-written brochure for a scorer and becomes the undeniable proof page for the independent authority on PI intake.

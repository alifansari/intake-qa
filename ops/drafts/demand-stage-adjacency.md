# Demand-Stage Option Analysis: Feed It, Partner With It, or Avoid It

> **Status:** Wave 6 research brief (2026-07-10), staged for Ali. Companion to
> `engine-v2-EXECUTIVE-SUMMARY.md` and `engine-v2-conveyor-MVP.md`.
> **Headline:** verdict (b) > (a) > (c) — partnership surface first, architected option second,
> and a hard boundary: never build demand *generation*. Two urgent takeaways folded into the
> main docs: (1) **Supio Intake is live with a call-scoring agent — the window is compressing**;
> (2) **Increment 0 must store typed `answer_value` + citation, not just ask-states.**

## 1. What a demand package needs that is born at intake

A demand package is a fact skeleton wrapped in medical records. The skeleton — and only the skeleton — originates on call one:

- **First-report facts**: incident date, mechanism, police report/citation number — the liability narrative's anchor.
- **Initial symptom narrative**: contemporaneous symptom onset is the single best rebuttal to the gap-in-treatment / degenerative defense. If the Day-0 call captured "neck hurt at the scene," that's near-testimonial evidence; if it didn't, the defense writes the gap story.
- **Coverage identification**: defendant carrier, commercial-defendant signals ("company truck"), UM/UIM, Prop 213 status — the facts that cap the demand number.
- **Witnesses, scene evidence, priors**: witness names go stale in weeks; photos get deleted; undisclosed priors discovered late are how demands blow up.

Notice: this is **isomorphic to the conveyor-MVP question catalog** (`incident_date`, `injuries_and_treatment_immediacy`, `prior_injuries_claims`, `witnesses`, `police_report_citation`, `commercial_defendant_coverage_source`, `um_uim_coverage`, `client_insured_status_prop213`, `premises_owner_notice`, `incident_report_photos`). The develop-queue already chases exactly the demand skeleton.

**Garbage-in evidence**: practitioner literature consistently says demands fail on missing facts, not bad prose — omitted dates, vague injury accounts, and missing documentation cause adjusters to "assume missing records contain damaging information" and lowball ([LezDo](https://www.lezdotechmed.com/blog/why-personal-injury-demand-letter-might-be-ignored), [LawPractice.ai](https://www.lawpractice.ai/blog/personal-injury-demand-letters-tips), [ProPlaintiff checklist](https://www.proplaintiff.ai/post/demand-package-checklist-for-personal-injury-attorneys)). The strongest evidence is structural: **EvenUp built an entire product (Case Preparation, Series D launch) whose pitch is "identifying problems, priors, and missing medical bills and records before a demand is ever written"** ([EvenUp](https://www.evenuplaw.com/blog/evenup-announces-135-million-series-d-and-launches-four-new-groundbreaking-products/)) — a $2B company monetizing the fact that inputs arrive incomplete. Their metric — demands delivered 47 days faster, records requested 66 days faster ([LawSites](https://www.lawnext.com/2026/05/evenup-extends-beyond-software-with-launch-of-pre-litigation-as-a-service-offering-for-pi-law-firms.html)) — is a proxy for "the facts weren't in hand."

## 2. Competitive state + the reverse-threat check

- **EvenUp** ($2B, Series E): unpublished, case-based pricing (third-party estimates $500–2,000/mo); deep **bidirectional CMS integrations** (Litify, Filevine, CASEpeer, Clio Grow, SmartAdvocate) — ~40% of new contracts now come through the CMS channel ([note.com analysis](https://note.com/guchey/n/nc6bd968b47d9?hl=en), [EvenUp integrations](https://www.evenuplaw.com/products/integrations/)). **Moving backward: confirmed.** Sequence: Demands → Case Preparation (pre-demand) → Communication Agents (Jan 2026, voice/SMS agents opening claims, checking treatment) → **PLAAS (May 2026): "claim setup and investigation" through negotiation, $10M+ in early subscriptions** — plus intake-optimization content marketing and a claim of 2,000+ firms "across demand letters, **intake**, medical review."
- **Supio**: unpublished custom pricing; open API; CMS integrations (Litify, SmartAdvocate, CASEpeer, MyCase, Smokeball). **Moving backward: confirmed and worse.** **Supio Intake is live**: a 24/7 Voice Agent, a **Scoring Agent that "grades every call and agent against your intake SOP with report cards,"** and a live **Coaching Agent** ([supio.com/products/intake](https://www.supio.com/products/intake)). That is our wedge, shipped by a demand-stage vendor.
- **Parrot**: not a demand player — deposition transcription/court reporting ($14M raised). No intake threat.

So the reverse threat is not hypothetical: **both demand incumbents are marching to intake** because they've learned their output quality is gated by intake capture. This validates the thesis and compresses the window.

## 3. The intake-to-demand data spine — field-level changes to Increment 0

The current Increment 0 (`case_disposition` + `case_outcome` + `intake_feature_snapshot`) is built to validate *selection*, not to feed *demands*. Four cheap changes, today:

1. **Capture answers, not just ask-states.** `question_checks` currently stores `{state ∈ asked_answered|asked_unclear|not_asked, span}`. Add a typed **`answer_value`** column (`date` | `text` | `enum` | `json`) + `answer_citation`. "They asked about UM/UIM" is QA; "*UM/UIM = $100k/$300k, Farmers*" is a demand-package fact. Same Claude pass, one more extraction field. This is the entire difference between a QA log and a data spine.
2. **Canonical fact keys with additive-only versioning.** Freeze `question_key` semantics as a stable ontology (`coverage.um_uim`, `incident.date`, `witnesses[]`, `priors[]`) so a future export never needs a migration of historical rows. The catalog is already versioned (`rubric_version`) — add the rule that keys are never repurposed.
3. **`external_case_ref` on `case_disposition`** (CMS matter ID: Filevine/Litify/Clio). Without a join key to the firm's CMS, no downstream integration is possible later, and it cannot be backfilled. One nullable text column.
4. **Three fields in `case_outcome`'s monthly reconciliation**: `demand_sent_at`, `demand_amount`, `first_offer`. This makes the corpus *intake facts → demand → recovery* instead of *intake facts → recovery*, which (a) is the dataset behind the roadmapped demand-stage value RANGE, and (b) generates the partnership stat: "cases with all 7 value-determining facts captured demanded N days faster / settled X% closer to limits."

Preserve what's already right: immutable snapshot timestamps + verbatim transcript citations are the crown jewel — **provenance**. No demand tool can say "client reported radiating pain on the Day-0 call, cited to the recording." We can.

## 4. Verdict

**Ranking: (b) > (a) > (c) — with a hard (c) boundary.**

- **(b) Partnership/integration surface — first, and soon.** "Our intake QA makes your demand stronger — the case-making facts were captured and cited on call one" is a true, sellable, compliance-clean pitch, and a cited-fact export (JSON per case) is a weekend of work once answer_values exist. Caveat: since EvenUp and Supio are invading intake, treat them as *frenemies* — build a **neutral export any demand tool consumes**, not a deep bilateral integration with one. Their backward march also hands us the Switzerland positioning a second time: Supio's Coaching Agent grading Supio's own Voice Agent is the same conflict as Eve's Auditor grading Jenny.
- **(a) Natural second product — yes as an *architected option*, not a build.** The data pipeline should be demand-shaped from day one (the four changes above, ~3 columns and a form tweak). The disclaimed value-RANGE at demand stage is already roadmapped; the spine is what makes it cheap in 2027.
- **(c) The trap is real but narrow: do not build demand *generation*.** That's a knife fight with a $2B company with 150 in-house legal staff, a $1B+ fast follower, and per-case pricing we can't match on a flat-fee compliance spine. Same logic as "don't build the voice agent."

**Single cheapest option-preserving move: add the typed `answer_value` (+ citation) field to `question_checks` and stamp it into `intake_feature_snapshot` before Increment 0 ships.** Everything downstream — the export, the partnership pitch, the demand-stage range, the flywheel's feature vector — is derivative of whether we stored the facts or only the fact that someone asked for them.

## 5. The discoverability / privilege defense (the legal crux of amendment #2)

> Added 2026-07-10 (companion research wave). This is the section the earlier brief was
> missing: *if* Intake QA ever emits a post-signing value RANGE, the load-bearing question
> is whether that output is protected work product or a **discoverable admission against the
> firm's own client**. 2026 case law now answers it — and the answer is *conditional on the
> contract*, which is why this can never be a bolt-on "score."

**The governing 2026 split (same season, same reasoning, cite both):**
- ***United States v. Heppner*** (S.D.N.Y., Rakoff, J., Feb. 17, 2026) — a party's AI-generated
  analyses were held **neither privileged nor work product**, because he used a *public,
  consumer* AI tool whose terms permitted training + third-party disclosure, and **no lawyer
  directed the work** ([Harvard Law Review](https://harvardlawreview.org/blog/2026/03/united-states-v-heppner/), [Gibson Dunn](https://www.gibsondunn.com/ai-privilege-waivers-sdny-rules-against-privilege-protection-for-consumer-ai-outputs/)).
- ***Warner v. Gilbarco*** (E.D. Mich.) — days later, held AI platforms are "**tools, not
  persons**," so using one no more waives work product than "a word processor, a search
  engine, or a legal research database" ([Perkins Coie](https://perkinscoie.com/insights/update/heppner-and-gilbarco-courts-apply-privilege-and-work-product-protection-generative)).

The two rhyme rather than conflict — both apply *ordinary* privilege law and turn on the
same two levers: **(1) the contractual architecture of the tool** (does the DPA bar training
on inputs, restrict third-party disclosure, impose confidentiality?) and **(2) attorney
direction**. *Heppner* itself signals it "would have reached a different result" on an
enterprise tool that contractually prohibits model training on user inputs.

**On the exact question — is an AI case-value output work product?** Now reasonably clear and
*conditional*: **protected** when created at counsel's direction, on a confidentiality-vetted
platform, treated as legal work product; **discoverable** when generated on a public tool,
without legal oversight, or later relied on as an ordinary business record ([Haynes Boone](https://www.haynesboone.com/news/alerts/generative-ai-in-litigation)).
The worst case — a vendor-generated valuation the firm files away as a routine internal
record — is a **discoverable admission against the firm's own client**.

**The four contract/process terms that must all hold before Intake QA emits any range:**
1. **Privilege-preserving DPA** — bar training on firm/claimant inputs, prohibit third-party
   disclosure, impose confidentiality (the exact features whose *absence* sank *Heppner*).
   Dovetails with the existing §VI no-training + zero/short-retention + deletion-cascade
   invariant; retention that outlives consent is now both a §VI defect *and* a privilege risk.
2. **Attorney direction on the record** — the lawyer triggers the valuation; the ratification
   event is the timestamp proving "prepared at counsel's direction in anticipation of
   litigation" (the missing element in *Heppner*).
3. **Framed + stored as legal work product, not a routine record** — delivered into the
   firm's privileged file; Intake QA's own copy minimized and purged, never kept as a business
   record the firm "later relies on."
4. **"Tool, not a person"** — *Gilbarco* gives the affirmative frame: the range engine is a
   tool the attorney uses, like a legal-research database, so its use is not a waiver.

**Why this reinforces the verdict (DEFER, partner-bridge now):** the discoverability posture
is *only* safe post-signing, attorney-directed, on a no-training/zero-retention contract, with
a human-ratification gate — i.e., it cannot exist at intake, cannot be a vendor "score"
divorced from attorney direction, and cannot ship before Yang clears the contractual
architecture (§VII). That's a high bar that beta-test #2 pull-signal must clear the effort of,
which is exactly why the range stays roadmapped-not-built until the market asks.

Sources: [LawSites PLAAS](https://www.lawnext.com/2026/05/evenup-extends-beyond-software-with-launch-of-pre-litigation-as-a-service-offering-for-pi-law-firms.html) · [EvenUp Series D](https://www.evenuplaw.com/blog/evenup-announces-135-million-series-d-and-launches-four-new-groundbreaking-products/) · [LawSites Communication Agents](https://www.lawnext.com/2026/01/evenup-launches-ai-communication-agents-to-handle-routine-tasks-in-pi-cases-also-enhances-its-ai-drafting.html) · [EvenUp Integrations](https://www.evenuplaw.com/products/integrations/) · [Supio Intake](https://www.supio.com/products/intake) · [Supio Integrations](https://www.supio.com/integrations) · [AI Vortex EvenUp review](https://www.aivortex.io/legal/ai-tools/evenup/) · [Parrot/TechCrunch](https://techcrunch.com/2023/06/20/parrot-ai-a-transcription-platform-that-turns-speech-into-text-raises-11m-series-a/) · [LezDo](https://www.lezdotechmed.com/blog/why-personal-injury-demand-letter-might-be-ignored) · [LawPractice.ai](https://www.lawpractice.ai/blog/personal-injury-demand-letters-tips) · [Harvard Law Review — US v. Heppner](https://harvardlawreview.org/blog/2026/03/united-states-v-heppner/) · [Gibson Dunn — SDNY AI privilege](https://www.gibsondunn.com/ai-privilege-waivers-sdny-rules-against-privilege-protection-for-consumer-ai-outputs/) · [Perkins Coie — Heppner & Gilbarco](https://perkinscoie.com/insights/update/heppner-and-gilbarco-courts-apply-privilege-and-work-product-protection-generative) · [Haynes Boone — are AI outputs discoverable](https://www.haynesboone.com/news/alerts/generative-ai-in-litigation)

# The Leak-Signal Prospecting System (Function I.2 — Sales Development / Outbound)

> **STATUS: STAGED OPERATING SYSTEM — nothing here contacts a firm or a claimant.** This is the
> intelligence layer that runs *before* the outreach library (`outreach-sequences.md` Assets A–E):
> it decides **which** firms to work, **why** they leak, **how much** that leak is worth, and
> **what the single sharpest opening line is** for each. Every downstream touch remains behind the
> §VII human chokepoint — Ali is the only sender, by hand, one firm at a time.
>
> **What this owns (and the existing corpus does not):** a rigorous, ethically-sourced **leak-signal
> taxonomy**, an **in-market trigger** layer (buying signals), a **lead-scoring / prioritization**
> engine, and the **pre-contact loss estimate** that powers the ROI line. It feeds Asset A (the recon
> finding), the Variant choice in Asset B (B-1 Spanish / B-2 after-hours / B-3 argument-led), and the
> ROI spine of the `autopsy-wedge-playbook.md`.
>
> **Companion (the math):** `leak-signal-loss-model.md` — the quantification engine this doc cites.
> **Running log:** `leak-signal-worklog.md`.

---

## 0. The one job of this function, in one sentence

**Convert public, firm-directed leak signals into a ranked queue of firms, each tagged with its
dominant leak and a falsifiable, their-numbers estimate of the signed cases it is losing per month —
so every scarce founder-hour of outreach lands on the firm most likely to say "prove it."**

Not reach. Not a list. A *ranked, reasoned, quantified* queue where the top firm is the one with the
biggest leak, the clearest public evidence of it, and the strongest in-market signal — worked deeply,
not blasted.

---

## 1. Why "leak signals" is the right wedge (the strategic frame)

Three facts from the corpus set the whole design:

1. **The constraint is founder-hours per qualified conversation, not firms** (insight B1). The
   serviceable universe is ~800–1,500 CA solo/small PI firms; the founding cohort is 3–5. So the
   entire value of this function is *ranking* — spending the next hour on the right firm.
2. **The product recovers a specific, nameable leak.** IntakeQA is now an autonomous bilingual voice
   intake+closing agent that answers 24/7 and signs leads. It does not fix "bad marketing" in the
   abstract — it plugs four concrete holes: **after-hours / no-answer, slow speed-to-lead, the
   Spanish gap, and weekend/overflow overflow.** Every leak signal we prospect on must map to a hole
   the product actually plugs, or the pitch is vapor.
3. **Attorneys distrust a vendor who hands them a fabricated loss number** (persona research, insight
   2026-07-10: "65% of B2B buyers distrust a vendor-computed 'you're losing $84k'"). This is the
   single most important design constraint in this whole system. **The estimate is a prospecting and
   prioritization tool for us; the *message* is always a falsifiable claim the firm checks against its
   own books.** We never lead with a slick total. We lead with a public fact about *them* and an
   arithmetic *they* finish. See `leak-signal-loss-model.md` §"Two layers."

The leak-signal wedge is right because it is the only prospecting frame that is simultaneously
**(a) public and firm-directed** (no claimant data, §III/§VI clean), **(b) falsifiable** (a partner
can verify the signal in thirty seconds, which is what earns a Rule 7.1-skeptical buyer's attention),
and **(c) directly tied to a hole the product plugs** (so the demo is the proof).

---

## 2. The ICP gate (who is even eligible to score)

A firm enters the scoring queue only if it clears all four gates. Gates are hard filters; signals
(§3) are the ranking layer applied *after* the gates.

| Gate | Pass condition | Why | Source |
|---|---|---|---|
| **G1 — Practice** | Plaintiff **personal-injury** is a core practice (auto/MVA, premises, workplace, product) | Volume PI is where lead cost is high and intake volume creates leak | insight C3 |
| **G2 — Size** | **1–10 attorneys** (sweet spot 2–7) | Big enough to buy leads + run an intake desk; small enough the owner *feels* every leaked case and decides fast | insight C3 |
| **G3 — Pays per lead** | Visible paid acquisition (LSA / PPC / TV / lead-buying) | If leads are free (pure referral), a leaked call has no *sunk cost* — the ROI story loses its edge | insight C3 |
| **G4 — Geography** | Target ring for the current cohort (LA-first / CA-statewide per O2; NorCal swap-in if the cohort lands north) | Match the live beta footprint; keep the warm-frame association valid | O2 §naming |

**Disqualifiers (remove regardless of any signal):** not PI (G1=fail), pure-referral/no paid flow
(G3=fail), outside the ring (G4=fail), >15 attorneys with a dedicated in-house intake center already
(different, higher-ACV motion — route to the Mass-Tort/Multi-Office lane, §I.20), and any firm that
has said "no" on any channel (permanent stop, §III).

---

## 3. THE LEAK-SIGNAL TAXONOMY (the core asset)

Each signal is something **publicly observable about a firm's front door** that predicts a specific
leak the product plugs. For each: what it is, **how to detect it ethically** (public, records nothing,
no login-scraping, no claimant data), **signal strength** (how reliably it predicts real leakage),
and **which leak channel + which product hole** it maps to.

> **Detection ethics invariant (applies to every signal below):** we observe the firm's *public front
> door* only — the same thing any prospective client experiences. We call the published line and
> *listen*; we submit the public web form; we read public ads, reviews, and job posts. **We record
> nothing, we never dial or research a claimant, we never touch anything behind a login or paywall**
> (§II/§III/§VI). One source is a lead; a firm enters the queue only on ≥2 independent public sources
> (the "no citation, no claim" rule applied to list-building; `dream25-targeting-plan.md` §2).

### 3.A — Leak signals (the firm is losing cases *right now*)

| # | Signal | How to detect (public, records nothing) | Strength | Leak channel → product hole |
|---|--------|------------------------------------------|----------|------------------------------|
| **L1** | **After-hours → voicemail / machine** | Call the published intake line after 6pm, before 8am, and on a weekend. Note: live person? bilingual answering service? or voicemail/machine? | **Very high** | After-hours no-answer → the agent answers 24/7 |
| **L2** | **Daytime no-answer / hold-to-voicemail** | Call the main line mid-morning and mid-afternoon on a weekday. Does a human pick up within ~30s, or does it ring out / tree-loop / go to voicemail? (Corpus: ~35% of small-firm calls go unanswered *even 10am–4pm*.) | **High** | In-hours overflow → the agent absorbs overflow/simultaneous calls |
| **L3** | **Spanish gap** — Spanish demand, English-only front door | Site has a Spanish page / "Se habla español" claim **but** the phone tree/greeting is English-only, or the after-hours service is English-only. Also: Spanish Google/Meta ads pointing to an English intake line. | **Very high** (rare + product-unique) | Spanish leak → the agent closes natively in Spanish |
| **L4** | **Slow / no web-form callback** | Submit the public contact form (as a genuine general inquiry, honest identity — see §6 ethics). Time the reply. No reply in 24–48h, or a days-later generic email, is the signal. | **High** | Speed-to-lead → the agent responds instantly, 24/7 |
| **L5** | **Generic 1-800 answering service** | The after-hours or overflow answer is a scripted non-legal answering service ("law office, how may I direct your call") that only takes a message — cannot qualify, cannot sign, often English-only. | **High** | Un-qualifying answer → the agent qualifies + signs, not just messages |
| **L6** | **Reviews complaining about reachability** | Read public Google / Yelp / Avvo reviews for "no one answered," "never called me back," "couldn't reach anyone," "left three messages." A public, dated, firm-attributed admission of the leak. | **Very high** (self-attested) | Confirms L1/L2/L4 with the firm's own clients' words |
| **L7** | **Phone-tree friction** | The published line dumps into a multi-level IVR before any human, or a long hold, at the exact moment an injured caller (in pain, may be shopping 2–3 firms) will hang up. | Medium | Speed/abandonment → instant human-grade answer |

### 3.B — Spend signals (the leak has a hard dollar cost — makes ROI real)

| # | Signal | How to detect (public) | Strength | Why it matters |
|---|--------|------------------------|----------|----------------|
| **S1** | **Google Local Services Ads "Screened" badge** | Search the firm's PI keywords + city; look for the LSA badge at the top of results (green check "Google Screened"). LSA is **pay-per-lead** — a leaked call is money already spent. | **Very high** | The sharpest sunk-cost proof: they literally paid for that call |
| **S2** | **Active paid search (PPC)** | Google Ads Transparency Center (`adstransparency.google.com`) — search the advertiser; confirm active ads. PI keywords ("car accident lawyer") are among the most expensive in all of search. | **High** | High cost-per-lead → every leak is expensive |
| **S3** | **Active social ads** | Meta Ad Library (`facebook.com/ads/library`) — search the firm; view active/past creatives, incl. Spanish creatives (which pair with L3 for a devastating combined line). | Medium–High | Confirms paid demand-gen; Spanish creatives = confirmed Spanish demand |
| **S4** | **TV / billboard / radio presence** | Public — local TV PI ads, billboards, radio. High fixed spend to make the phone ring. | Medium | Big top-of-funnel spend amplifies any bottom-of-funnel leak |
| **S5** | **Lead-buying behavior** | Directory/aggregator presence (e.g., listed on lead-gen networks) or public statements of buying leads. | Medium | Bought leads have the highest sunk cost per leaked call |

### 3.C — In-market / trigger signals (the firm is *ready to buy now*)

These are the modern SDR "buying signals" — they don't prove a leak, they prove *timing*. A firm with
a leak (§3.A) **and** an in-market trigger jumps the queue.

| # | Trigger | How to detect (public) | Signal read |
|---|--------|------------------------|-------------|
| **T1** | **Hiring intake staff** | Job posts for "intake specialist," "legal intake coordinator," "bilingual intake," "case manager," "receptionist" on Indeed / LinkedIn Jobs / ZipRecruiter / the firm's careers page. | The firm is *admitting* the intake pain and about to spend $45–70k/yr on it — the exact budget the agent competes for. **Strongest single timing signal.** |
| **T2** | **Bilingual hire specifically** | Any intake/receptionist post requiring Spanish. | Pairs with L3: the firm *knows* it has a Spanish gap and is trying to hire out of it. |
| **T3** | **Recent ad-spend ramp** | New/expanded LSA presence, new PPC campaigns, new Meta creatives vs. a prior check. | More top-of-funnel spend → more leak pressure → more pain from a bottom-of-funnel hole. |
| **T4** | **Office / associate expansion** | Press releases, new locations, associate hiring, Super Lawyers listings, big-verdict announcements. | Growth-minded + capitalized = can decide and pay (psychographic gate, insight C3-5). |
| **T5** | **New CRM / intake-tech adoption** | Public case studies, job posts naming Litify/Filevine/Lead Docket/CASEpeer/Clio, conference attendance. | Actively investing in intake = receptive to an intake tool; also an integration hook (§I.9). |

---

## 4. THE LEAD-SCORING ENGINE (how the queue is ranked)

Every gated firm (§2) gets three sub-scores. The product of leak × spend, lifted by trigger, is the
priority. **Fit is a gate; leak-severity and timing are the ranking.**

### 4.1 Leak Severity (0–10) — *how much are they losing*
Sum the detected §3.A signals, weighted by strength, capped at 10:
- L1 after-hours voicemail: **+3**  ·  L3 Spanish gap: **+3**  ·  L6 review complaints: **+2**
- L2 daytime no-answer: **+2**  ·  L4 slow web callback: **+2**  ·  L5 generic service: **+1**  ·  L7 IVR friction: **+1**

### 4.2 Spend Intensity (0–5) — *does the leak cost real money*
- S1 LSA badge: **+3**  ·  S2 active PPC: **+2**  ·  S3 social ads: **+1**  ·  S4 TV/billboard: **+2**  ·  S5 lead-buying: **+2** (cap 5)

### 4.3 In-Market (0–3) — *are they ready now*
- T1 hiring intake: **+3**  ·  T2 bilingual hire: **+2** (stacks w/ T1)  ·  T3 ad ramp: **+1**  ·  T4 expansion: **+1**  ·  T5 intake-tech: **+1** (cap 3)

### 4.4 Priority score
```
PRIORITY = (Leak Severity × Spend Intensity) + (2 × In-Market)
           └── the size of the bleed ──┘        └ timing bonus ┘
```
Rationale: leak × spend is the *dollar* size of the opportunity (a big leak at a firm that pays
nothing per lead is a weak sell; a small leak at a firm buying $1,500 truck leads is a strong one).
In-market is added, not multiplied, so a firm with a known leak still ranks even before a trigger fires
— but a hiring post vaults it. **Ties broken by S1 (LSA badge)** — demonstrable per-lead spend is the
clearest sign the ROI story lands (consistent with `dream25-targeting-plan.md` §3).

### 4.5 The "sharpest line" assignment (the output that feeds outreach)
Every scored firm exits with **one dominant leak** = the highest-weighted §3.A signal detected. That
dominant leak deterministically selects the Asset B variant and the opening sentence:

| Dominant leak | Asset B variant | Opening-line seed (Ali rewrites in his own words) |
|---|---|---|
| L3 Spanish gap | **B-1 (Spanish)** | "Your site has a Spanish page, but the line I called after hours only offered English." |
| L1 / L2 / L4 / L5 | **B-2 (after-hours/silence)** | "I called your line Tuesday at 7pm and Saturday — both went to voicemail." / "I submitted your contact form Monday; as of Thursday, no reply." |
| L6 (review-attested) | **B-2**, opened with the client's own words | "A recent Google review on your profile mentions no callback — I checked your front door and could see why." |
| No sharp public finding | **B-3 (argument-led)** | The argument-led fallback; no fabricated finding. |

This is the handoff. The prospecting system's entire job is to deliver, per firm: **(priority score,
dominant leak, Asset-B variant, one true opening fact, a their-numbers loss estimate)** into the
outreach cadence (Asset E). Ali never has to guess who to work or how to open.

---

## 5. THE OPERATING WORKFLOW (detect → score → estimate → hand off)

The whole system runs as a repeatable per-firm SOP, ~20–30 min of desk recon per firm (records
nothing), then Ali's by-hand outreach. It layers on the existing weekly rhythm in
`outreach-operator-setup.md`.

**Per candidate firm (the recon pass):**
1. **Gate (2 min):** confirm G1–G4 from public directory + State Bar. Fail any → drop.
2. **Spend scan (5 min):** LSA badge check, Google Ads Transparency, Meta Ad Library. Record S-signals.
3. **Front-door test (8 min):** call the line after-hours + mid-day (listen only, records nothing);
   note L1/L2/L5/L7. Check site for a Spanish page vs. English-only tree (L3).
4. **Web-form + review scan (5 min):** submit the public form as an honest general inquiry, start the
   reply timer (L4); scan Google/Yelp/Avvo reviews for reachability complaints (L6).
5. **Trigger scan (5 min):** search Indeed/LinkedIn Jobs + the careers page for intake hiring (T1/T2);
   note any expansion/ad-ramp (T3/T4/T5).
6. **Score + estimate:** compute Leak/Spend/In-Market → PRIORITY; assign dominant leak + Asset-B
   variant; compute the their-numbers loss estimate (`leak-signal-loss-model.md`).
7. **Log one row** in the prospect ledger (§7). Records nothing about any *caller* — only public
   firm-level facts + our own observations.

**Then the queue drives the week:** work the top-PRIORITY firms first through Asset E's 3-touch
cadence, opened with the dominant-leak line. Never work more than Ali can do by hand and deeply.

---

## 6. ETHICS & COMPLIANCE INVARIANTS (read before any recon)

This function is *outbound*, which is exactly where the §III/§VI lines get tested. Non-negotiable:

1. **Firm-directed only.** We research and contact *firms* (B2B), never claimants (§III). We never
   research, list, or contact an injured person. Zero claimant data touches this pipeline (§VI).
2. **Public front door only, records nothing.** Every §3 detection is something any prospective client
   experiences. We **do not record** any call we place to a firm's line — CIPA §632 is all-party and
   *our* consent is not a defense (verified 2026-07-11). We listen; we do not capture audio.
3. **The web-form test is an honest inquiry, not a pretext.** When timing a form reply (L4), the
   submission uses Ali's real identity and a genuine question ("I'm an intake analyst evaluating your
   firm's front door — how fast does your team respond?") **or** is skipped. **No fabricated claimant,
   no fake injury, no deception** — a fake-injury mystery-shop is a separate, Yang-gated protocol
   (`yang-cipa-632-mystery-shop-protocol.md`) and is NOT part of routine recon. Default: skip the form
   test and rely on L1/L2/L6 unless the honest-inquiry version is cleared.
4. **≥2-source rule.** A firm enters the worked queue only on two independent public signals. One is a
   lead, not a target ("no citation, no claim" applied to list-building).
5. **No fabricated loss number in any message.** The estimate ranks *our* queue; the *message* states a
   public fact + an arithmetic the firm finishes (§1 fact 3; loss-model §"Two layers"). Never "you're
   losing $84,000."
6. **Pricing stays blocked.** No dollar *price* in any asset until Ali locks a table into
   compliance-invariants §I. (Loss *estimates* are the firm's own division off *their* inputs, which is
   different from *our* price — but still ranges-only, labeled assumptions, no promised recovery.)
7. **§VII chokepoint.** This system produces a queue and drafts. Ali sends. No agent, tool, or schedule
   ever contacts a firm. The daily wake-up agent *improves the system*; it does not run outreach.
8. **Rule 7.1 discipline in every line.** The opening fact must be literally true and checkable in
   thirty seconds. An unverifiable claim to an attorney is a violation, not puffery (persona guide).

---

## 7. INSTRUMENTATION — the prospect ledger

One row per firm (a simple sheet is the CRM for now, per `outreach-operator-setup.md`). Columns:

`firm · city · attys · G1–G4 pass · L-signals · S-signals · T-signals · Leak/Spend/InMkt scores ·
PRIORITY · dominant leak · Asset-B variant · loss estimate (range) · touch history · outcome · reason`

**Feed the two decisive rates** (`autopsy-wedge-playbook.md` §8): log `touch→qualified` by dominant
leak, so we learn *which leak sells* — early evidence on whether the Spanish line, the after-hours
line, or the argument-led line converts best. That routes back to product and to the Variant weighting.

---

## 8. THE BIGGEST RISK (named, not smoothed — §VIII)

**The leak signals are individually observable but their *aggregate* into a dollar figure is an
estimate, and the buyer is a professional skeptic.** If we over-quantify — hand a partner a confident
"$84k/yr" total — we lose the exact trust the independent-scorer position is built on. The mitigation
is structural and load-bearing: **the number is ours for ranking, the message is theirs for checking.**
The prospecting estimate never appears as a claim; it appears as *their* arithmetic off *their* lead
cost and *their* close rate, with our public fact as the only input we assert. See the loss model.

**Secondary risk:** recon that drifts into a fake-injury mystery shop without the Yang-gated protocol.
The default SOP (§5) is built to produce a scored firm from L1/L2/L6 + spend/trigger scans *without*
ever needing a pretextual form submission. Hold that line.

---

## 9. HOW THIS PLUGS INTO THE REST OF THE MACHINE

- **Feeds → `outreach-sequences.md`:** delivers the recon finding (Asset A), the Variant choice (Asset
  B-1/B-2/B-3), and the ROI seed per firm.
- **Feeds → `autopsy-wedge-playbook.md`:** the dominant-leak line is the cold-open; the loss estimate is
  the pre-autopsy hypothesis the live readout then *proves on their own calls*.
- **Feeds → `dream25-targeting-plan.md`:** this is the operational scoring engine behind that plan's
  ideal-fit rubric — same ethics, sharper mechanics.
- **Feeds → metrics.md:** `Qualified firm conversations booked` (top of funnel) is what this function
  moves; instrument reply-rate *by dominant leak*.
- **Consumes ← `leak-signal-loss-model.md`:** the quantification math.

---

*Sources: insights.md B1/B2/B4/C1/C3/C4/D1 (labels preserved); dream25-targeting-plan.md §2–3;
outreach-sequences.md Assets A–E; autopsy-wedge-playbook.md §2–8; O2-gtm-plan.md (geography/cohort).
CIPA §632 all-party / one-party-not-a-defense verified 2026-07-11. Live detection-tool specifics
(LSA badge, Ads Transparency Center, Meta Ad Library, job boards) are being re-verified in the current
research pass and finalized in `leak-signal-loss-model.md` + the worklog.*

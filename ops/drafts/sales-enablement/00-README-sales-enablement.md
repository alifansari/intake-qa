# Sales Enablement Kit — Intake Closer (I.4)

> **Owner lane:** Revenue / GTM §I.4 — Sales Enablement (rep ramp, demo choreography,
> objection-handling). This kit exists to make any rep — including the founder acting as
> first rep — able to run a trust-gated PI-firm sale end to end, and to make the
> malpractice / UPL / ethics objections (the *real* blockers) losable-proof.
>
> **STATUS: STAGED DRAFT, NOT LIVE.** Per `ops/OPERATING-PROTOCOL.md` §VII: nothing here
> is sent to a prospect, published, or spoken on a live call until the gates below clear.
> This is the material Ali (and future reps) run by hand.

---

## 0. The one honest banner (read before using any page in this kit)

This kit is written for the **Intake Closer** — the autonomous bilingual (English/Spanish)
inbound AI voice intake-and-closing agent described in `INTAKE_CLOSER_DESIGN.md` (pivot
authorized by Ali 2026-07-08, branch `intake-closer-pivot`).

Two facts you must hold at once:

1. **The Closer is the product this kit sells.** The demo is *"the agent audibly signing a
   mock lead in Spanish,"* the positioning is *"a closing agent, not a receptionist,"* and
   the buyer's decisive objections are malpractice / UPL / ethics / TCPA / recording
   consent — not the scorer's softer QA objections.
2. **The Closer is not yet GA, and several of its economics are gated.** The currently
   *live* product is still the independent scorer (Intake QA). This kit therefore **stages
   ahead of general availability** and inherits three hard gates. Do not run the kit live
   until the relevant gate clears:

| Gate | What it blocks | Owner | Source |
|---|---|---|---|
| **Pricing table not locked** | Any dollar figure spoken to a prospect; the whole ROI/close arithmetic's price side | **Ali** | `pricing-decision-brief.md`, `decisions.md` three-way split |
| **Per-signed-case pricing mode** | Any "per signed case" economics; the strongest-but-riskiest packaging | **Yang** (Rule 5.4 / §§6151-6152 / AB 931) | `INTAKE_CLOSER_DESIGN.md` §7, `regulatory-clearance-memo.md` |
| **Public comparative / legal claims** | Competitive battlecards used in writing; any "compliant with X" statement | **Yang + Ali** (§VII) | `competitive-supio-battlecard.md` header, `regulatory-clearance-memo.md` §6 |

If a page here quotes a price, names a statute as "we comply," or makes a written
comparative claim, it is **internal rehearsal only** until its gate clears.

---

## 1. What Sales Enablement owns (and what it does not)

**Owns:** the rep's readiness and the room's choreography. Specifically —
- **Rep ramp & certification** — how a new rep goes from hired to customer-facing, and the
  bar they must clear first (03).
- **Demo choreography** — the live bilingual-close demo, beat by beat, including how it
  fails gracefully (02).
- **Objection-handling** — the battlecards, led by the ethics/malpractice blockers (04).
- **Discovery & qualification** — the questions that find the leak and qualify the firm (05).
- **Talk tracks & positioning** — the words, by persona (06).
- **Competitive** — how we win the room against each alternative, including "do nothing" (07).
- **The learning loop** — win/loss capture that feeds the next rep and the product (08).

**Does not own** (adjacent lanes — this kit consumes their outputs, never overwrites them):
- **Pricing/packaging** (§VI-13, §I-13) — we quote what Ali locks; we never invent a number.
- **The legal/compliance substance** (§V) — we *deliver* the ethics answers Yang blesses; we
  never author new legal positions. Every legal line in 04 traces to a §V source file.
- **Demand gen / SDR / outreach** (§I.2, I.5, I.6) — they fill pipeline; we convert it.
- **Product Marketing positioning** (§I.7) — we operationalize the "closing agent, not
  receptionist" line into a rep motion; we don't set the category.

---

## 2. The kit (file map)

| # | File | What it is | Live-gate |
|---|---|---|---|
| 00 | `00-README-sales-enablement.md` | This index + charter | internal |
| 01 | `01-icp-and-positioning.md` | ICP, buyer personas, the positioning statement, the value narrative | positioning internal; price refs gated (Ali) |
| 02 | `02-demo-playbook.md` | **The centerpiece** — the live bilingual-close demo, choreographed, with the misfire playbook | needs GA build + Ali/Yang on any claim |
| 03 | `03-rep-ramp-and-certification.md` | 30/60/90 curriculum + the 3-part certification bar | internal |
| 04 | `04-objection-handling-battlecards.md` | **The real blockers** — malpractice/UPL/ethics/TCPA + practical objections | legal lines gated to §V sources (Yang) |
| 05 | `05-discovery-and-qualification.md` | MEDDICC-adapted qualification + leak-signal discovery | internal |
| 06 | `06-talk-tracks-and-messaging.md` | Elevator pitches by persona, the value story, email follow-ups | comparative/price lines gated |
| 07 | `07-competitive-battlecards.md` | vs answering services, vs AI intake, vs generic voice AI, vs do-nothing | written comparative use → Yala/Ali (§VII) |
| 08 | `08-win-loss-and-enablement-ops.md` | The learning loop, deal debriefs, content-freshness cadence | internal |

Build order reflects leverage: 02 and 04 are the two pages that decide deals; everything
else supports them.

---

## 3. The spine (one idea the whole kit repeats)

**"We answer and sign the cases you're already losing — at night, on weekends, and in
Spanish — and a licensed attorney approves every engagement before it's real."**

Four load-bearing words, each of which is also a compliance answer:
- **Answer** — inbound only. The caller dialed the firm. (This one word defeats the Rule 7.3
  "soliciting strangers" objection and most of the TCPA objection — see 04.)
- **Sign** — a *closing* agent, not a receptionist. This is the premium-price justification
  and the wedge vs every answering service (07).
- **In Spanish** — native-parity, the wedge competitors are weakest on, and the biggest
  leak in the CA PI market (01, 07).
- **A licensed attorney approves** — attorney-in-the-loop. This is the UPL and malpractice
  answer in five words (04, 08 of the design doc).

Say the spine early, say it whole, and let every objection answer point back to one of its
four words.

---

## 4. Non-negotiable discipline (inherited from the house — enforce in every page)

These are the same rails the scorer's demo lived by; they are *more* important for the
Closer because the buyer is a Rule-7.1-conditioned lawyer who reads an unverifiable claim as
a violation, not puffery.

- **No unverified stat, ever.** Every number is labeled **[VERIFIED]** (primary source on
  file) or **[REPORTED]** (secondary, hedged aloud). If it isn't in `ops/insights.md` or a
  sourced research brief with a label, it does not get said. No exceptions for a good story.
- **Ranges only on money. Their arithmetic, not ours.** Never a vendor-computed loss or ROI
  ("you're losing $84k a year"). Hand them a verified input; let them do the division; let
  *them* say the punchline.
- **No results guarantee, no superlative.** No "the only," "the best," "guaranteed to sign
  X." (§V; SB 37's misleading-guarantee bar.)
- **AI in supervisory framing only.** Never "AI-powered" as a brag. "The agent handles the
  call; a licensed attorney approves the engagement; nothing becomes a case without a human."
- **No launch price before Ali locks the table.** "Flat monthly, in writing after your
  pilot" — never an improvised figure.
- **Never author a legal position.** Objection answers *deliver* what Yang has (or will)
  bless, cite the source file, and end on "your own ethics counsel makes the final call."

---

## 5. How this kit ties into the compounding loop

- Reads: `ops/metrics.md` (North Star = signed pilots → paid), `ops/insights.md` (persona
  field guides), `regulatory-clearance-memo.md` + Yang packets (all legal substance),
  `INTAKE_CLOSER_DESIGN.md` (the product), `pricing-decision-brief.md` (price, gated).
- Writes: deal debriefs and objection-frequency data back to `08` and, when they generate a
  product or legal insight, up to `ops/insights.md` / the right Yang packet.
- The win/loss loop (08) is the mechanism that makes rep N+1 better than rep N: every lost
  deal's *real* reason becomes a new objection card or a product/legal escalation.

---

*Sources: `INTAKE_CLOSER_DESIGN.md`, `regulatory-clearance-memo.md`, `DEMO_SCRIPT.md`,
`demo-onboarding-script.md`, `competitive-supio-battlecard.md`, `offer-architecture.md`,
`pricing-decision-brief.md`, `ops/insights.md` (persona field guides), plus four sourced
research briefs commissioned for this kit (TCPA/AI-voice, legal-ethics, competitive,
sales-enablement best practice) — cited inline in 02/04/07.*

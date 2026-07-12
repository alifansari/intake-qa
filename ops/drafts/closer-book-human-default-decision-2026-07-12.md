# Intake Closer — "book-human-default, instrument the split" decision (STAGED for Ali + Yang)

*2026-07-12. Grounded in the 2-round deep-research pass (see `intake-simplicity-research-brief-2026-07-12.md` §3/§4) and `INTAKE_CLOSER_DESIGN.md`. This is a DECISION MEMO + experiment design, not shipped code. Anything that dials, records, or lets a bot deliver a retainer crosses compliance-invariants §II/§VII and is **novel in a regulated area → Yang before go-live.**)*

## The decision

**Ship the scorer/desk now. Run the "closer" as a book-human-DEFAULT, instrumented experiment inside the beta — never as an autonomous closer at launch.** Re-scope the pivot from *"autonomous bilingual closing agent that signs"* to *"instant bilingual QUALIFIER that answers every call, warm-hands-off to the firm's own people, and — only where a firm explicitly opts in — offers a retainer e-sign to clear-merit, low-emotion cases as document delivery."*

## Why (evidence, adversarially verified)

1. **The premise number does not exist.** No published study measures AI-*close* vs qualify-then-human-callback signed-retainer rates on distressed PI callers. Even Eve/Ghaffari's "60% of transfers signed" is a **hybrid** — the AI qualified and warm-transferred; a *human* closed. Betting the company's positioning on an unmeasured close is exactly the "confidently wrong" failure that got engine v1 switched off.
2. **Essentially all measurable lift is answer + qualify + instant handoff, not the emotional close.** 84% of consumers prefer a human when contacting a law firm; 47% say heavy AI reliance reduces trust; positive-review rate 56% (human) vs 10% (chatbot); synthetic empathy can *backfire* on distressed callers (USF study). A bot arguing a grieving caller into signing risks both the signature and a one-star review.
3. **It keeps §I clean.** The closer's "most compelling economics" in `INTAKE_CLOSER_DESIGN.md` lean on per-signed-case pricing — **prohibited.** A flat-fee qualifier with an opt-in e-sign has no outcome-tied dependency.
4. **It preserves the independence moat.** "Switzerland — we audit whoever handles the call" survives if we don't build a competing closer as the headline. The qualifier+handoff is complementary to the desk, not a reframe of it.

## The product shape (one decision fork, not a persuasion engine)

After qualification the agent does exactly one of two things, set by a **per-firm toggle defaulted to BOOK-HUMAN:**
- **(default) Book-human:** create an urgent human-callback task with the full transcript + a 15–30s structured whisper summary (issue / what was tried / caller sentiment / urgency). Never make the caller repeat themselves.
- **(opt-in) Offer e-sign:** only for clear-merit, low-emotion cases, framed as *document delivery* (not advice), with the licensed attorney approving the engagement in the loop. Distressed / ambiguous / high-value → force book-human regardless of toggle.

Hard guardrails baked in as defaults (attorney never configures them):
- **Consent-first (§II/CIPA):** all-party-consent geodetect; no recording without the firm's consent chain. Inbound / caller-initiated only — **never autodial** scraped accident victims (§III/TCPA + FCC AI-voice).
- **AI self-disclosure** in a warm one-line greeting; "virtual assistant," never "robot."
- **Hard no-legal-advice guardrail** with escalation ("I can't give legal advice — let me connect you with an attorney"). UPL/Rule 5.5.
- **Always-available human escape hatch** ("say 'real person' any time").
- Stays behind the existing `VOICE_ENABLED=off` + `TEST_MODE` + `KILL_SWITCH` gates until Yang signs off.

## The instrumented experiment (own the market's missing datapoint)

Make the beta measure what nobody has published. Per firm, per call, log:
- **Arm:** book-human vs e-sign-offered (the toggle split).
- **Language:** English vs Spanish (the other A/B — no audited Spanish-vs-English sign delta exists anywhere; make it metric #1).
- **Funnel:** answered → qualified → (signed-on-call | human-callback-booked → signed) → realized outcome.
- **Disclosure effect:** did the AI-identity opener precede a drop-off?
- **Emotion/merit bucket** of the call (to learn the green-vs-distressed ratio that decides whether the e-sign capability is even worth building).

Ship the measurement schema *before* any closing behavior, silent and internal (the "start the flywheel now" amendment) — the model waits; the data does not.

## What's actually gated (do NOT let an agent ship these)

- Live voice dialing/recording, and any bot-delivered retainer → **Yang first (§II/§VII), then Ali.**
- Any pricing that ties a cent to signing → **prohibited (§I).** Closer prices flat + optional included-minutes bucket only.
- Spanish live-answering as a *claim* ("only intake QA in Spanish") → banned until the four-fifths parity audit exists; route Spanish to founder review with an honest label meanwhile.

## Open questions for Yang / the beta (from research §7)

1. Does a third-party voice vendor recording privileged intake risk waiving privilege absent "agent-of-attorney" framing? (highest-value unresolved legal question — resolve before launch)
2. What share of after-hours PI calls are clear-green low-emotion (safe to e-sign) vs distressed/ambiguous (must route human)? (decides whether the e-sign arm is worth building — sample real transcripts)
3. Does the AI-disclosure opener reduce sign/booking for distressed English and Spanish-dominant callers? (no data — the toggle A/B generates it)

**Recommended path:** keep the pivot branch inactive; build the measurement schema + book-human-default toggle behind the existing off-gates; route the three questions above to Yang; do not enable any closing behavior until she signs off.

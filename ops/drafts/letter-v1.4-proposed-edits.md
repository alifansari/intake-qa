# Proposed /letter edits — v1.4 (AWAITING ALI — do not apply without his sign-off)

**Why these are separate:** `web/src/app/letter/content.ts` is marked "final,
legally-reviewed, stored VERBATIM," carries Ali's signature, and has a public version
changelog. Per compliance-invariants §VII these edits cross the human-approval gate.

**The problem (copy-audit 2026-07-11, P0-1):** the letter promises — twice — that the
Calibration & Honesty page publishes the error rate ("states, in plain numbers, how often
my scoring gets it wrong: the false-alarm rate, kept current" and "Read how often I get it
wrong, in my own numbers, in public"). `/honesty` correctly refuses to publish
precision/recall until the test corpus is documented. Every other surface making this
promise has now been fixed (homepage strip, footer link, GUARANTEE_METHODOLOGY); the
letter is the last surface making a claim the click-through disproves — and it's the
surface whose entire argument is that unstaked words are worthless.

---

## Edit 1 — content.ts, ¶4 (the "error rate" paragraph)

**Current:**
> …I will do the thing almost no one selling you anything will do: I publish my own error
> rate. Intake QA maintains a public Calibration & Honesty page that states, in plain
> numbers, how often my scoring gets it wrong: the false-alarm rate, kept current as the
> calls come in. I will come back to why that page exists.

**Proposed:**
> …I will do the thing almost no one selling you anything will do: I bind myself to a
> published error rate. Intake QA maintains a public Calibration & Honesty page that
> states the method, the two ways the model fails, and the numbers I refuse to print
> until the test corpus that produced them is documented. The false-alarm rate goes on
> that page, in public, as the calls come in — and nothing goes there before it can be
> checked. I will come back to why that page exists.

(Everything after — "For now, it is the whole argument in miniature…" — stands unchanged
and actually reads *stronger* against the refusal.)

## Edit 2 — content.ts, closing paragraph

**Current:**
> Before you decide, go read the Calibration & Honesty page. Read how often I get it
> wrong, in my own numbers, in public. If you find yourself trusting me more after
> reading how I fail, then you already understand the whole argument…

**Proposed:**
> Before you decide, go read the Calibration & Honesty page. Read how the score fails,
> what I will put a number on, and what I won't until I can prove it. If you find
> yourself trusting me more after reading what I refuse to claim, then you already
> understand the whole argument…

## Edit 3 — letter/page.tsx line 91 (attestation block, under the signature)

**Current:** `I publish my own error rate at /honesty.`
**Proposed:** `What I will and won't claim is at /honesty.`

## Edit 4 — colophon changelog (page.tsx)

Prepend to the changelog: `1.4: the Calibration & Honesty references were corrected to
match the page: the method and failure modes are published now; the error rate publishes
with its documented test corpus, not before.` Bump the version line to
`Version 1.4 · updated <date applied>`.

---

**Also fixed already (context, no action needed):** homepage `HONESTY_STRIP_LINE` → "We
tell you what we won't claim yet."; homepage link → "See the calibration page →"; footer
link → "Calibration & honesty"; `GUARANTEE_METHODOLOGY` → "…will be published on this
page the day the test corpus is documented — and not before."

**And the standing counter-option:** if Ali would rather keep every "I publish my error
rate" sentence untouched, the alternative is to actually publish the number now with its
corpus caveats on /honesty — but that contradicts the page's own (correct) reasoning that
a number without a documented test set is exactly what this audience has been pitched
before. Recommend the edits above.

# DEMO_SCRIPT.md — the 1:1 demo, on THEIR calls

A repeatable script for demoing Intake QA to a California PI firm — grounded in the
persona field guides (`ops/insights.md`, 2026-07-10) and the copy audit
(`ops/drafts/copy-audit-2026-07-11.md`). Everything runs with `TEST_MODE=true` and the
kill switch on: no real number is ever texted, nothing transmits.

The one idea that organizes the whole demo: **their calls, their arithmetic, their
credit.** We never demo on our sample data when one of their own recordings is
available, we never compute their ROI for them, and the intake team gets the credit for
every callback.

## Read the room first

- **Managing partner** (2–10 attorney firm): ~45% of his week is admin; you get one
  distracted 20–30 minute session. He reads vendor claims through Rule 7.1 — an
  unverifiable number is a violation, not puffery. Lead with his own calls and his own
  math.
- **Intake coordinator**: she is also the receptionist and often a case manager;
  attention comes in ~47-second windows. The tool must read as a gift (her callback
  list, her wins), never as surveillance. If she's in the room, she sees HER calls
  before the partner sees any score.

## Never say (each of these has bounced this exact buyer)

- Any vendor-computed loss or ROI figure ("you're losing $84k a year"). 65% of B2B
  buyers call vendor ROI math inflated. Hand them the inputs; they do the division.
- **The "5 minutes = 400% conversion" stat — refuted under adversarial verification
  (copy audit P0-4). Never cite it.** Speed claims stay directional: "the faster the
  callback, the more of them sign."
- **"$468 per signed case" as a fact.** The published derivation is broken (copy audit
  P0-2). If cost-per-signed-case comes up, it's a *reported range* — see the ROI spine.
- Monthly-dollar extrapolations from any sample ("at this rate, that's $X a month") —
  the exact math this audience has learned to distrust.
- "AI-powered" as a selling point. AI appears only in supervisory framing: "the model
  flags; a human reviews; nothing sends itself."
- Guarantees, "the only," "the best," a published error rate (we don't publish one yet
  — the calibration page says exactly why, which is the better pitch).
- "Clients" for unsigned callers. Their vocabulary: *signable, PNC, walked, sign rate,
  statute, specials.*

## Before the demo (once)

```bash
npm --prefix web run smoke          # schema + guardrails in order
npm --prefix web run dev            # http://localhost:3000
```

Keep `TEST_MODE=true` and `KILL_SWITCH` as-is. Part of the pitch is that the safety is on.

## The story (say this)

"You already paid to make the phone ring. We read every intake call — English and
Spanish — and when a signable caller walks without signing, they show up on your desk
the same day with a number to call back. Your team changes nothing about how they
answer the phone. A human approves anything that ever goes out, and during the beta
nothing goes out at all."

## The click-through

1. **Their call first (`/demo` — public, no login).** Before the meeting, ask them to
   have one recorded intake call handy (a call THEY recorded on their own line under
   their own consent practice — we never touch consent, §II). Upload it live. Watch
   transcribe → score, then walk the result: signable or not, the exact quotes that
   justify the flag, tiered confidence. Say plainly: "audio is never stored, results
   purge in 72 hours, and this screen cannot text anyone." If they came empty-handed,
   the sample call works — but say it's a sample, and pivot to the Leak Audit ask.

2. **The same call's Deadline Watch + case summary.** Statute-of-limitations estimate
   by deterministic date math — "attorney-verifiable, never legal advice." Partners
   check this one; let them.

3. **The desk (`/desk/queue`) — the coordinator's screen, shown as HERS.** If the
   coordinator is present, hand her the mouse here. The queue is her callback list:
   one screen, tap-to-call, one-tap logging (Reached / Left voicemail / Bad number /
   Signed / Not interested), a warm two-sentence opener for each callback. Point at
   the wins strip: "callbacks worked, reached, signed — that's your work, with your
   name on it." Never call it a score. Nothing here grades her; it hands her saves.

4. **The morning digest (show a rendered one).** One email around 8am Pacific, only
   what needs action, forwardable without a login. On a clean day it says "N calls
   read, all handled" — exception-based is why it survives week three when every other
   tool's emails get filtered.

5. **The honesty pages (`/honesty`, `/compliance`) — for the skeptic.** "We publish
   the method and the two ways the model fails; we refuse to publish precision numbers
   until the test corpus is documented — a number without its test set is the kind of
   thing you've been pitched before." This page is the peer-forwardable artifact; say
   so: "hand it to your ethics counsel."

6. **`/apply` — the exit.** A handful of fields, one button. NDA before anything
   connects; setup is a 15-minute call; free during the beta.

## The ROI spine (1:1, spoken, ranges only — never slides, never their number)

Use these as *anchors they check against their own books*, in this order:

- **"What does a lead cost you?"** Let them answer first. The verified anchor if they
  ask ours: **~$284 per PI lead** (rankings.io 2026, 13 plaintiff firms, $3.3M spend —
  verified). Most partners' numbers are higher; theirs wins.
- **Cost per signed case: their division, not ours.** "Whatever your lead-to-sign rate
  is, divide — that's what one signed case costs you before any work starts." If they
  push for an industry figure, don't supply one: the published cost-per-signed-case
  numbers in this category failed verification (copy audit P0-2), so the honest answer
  is "the only number that survives checking is the one from your own books." Give them
  the verified lead cost and their own rate; let them do the division. Never hand over a
  cost-per-signed-case dollar figure — not even as a range endpoint.
- **The punchline they compute themselves:** "A signable case that walks took that
  acquisition money with it — and its contingency fee, which on even a modest case is
  typically north of $10,000. You know your average fee; you can do this math faster
  than I can." Recovering a small number of walked cases a year covers a flat annual
  software cost many times over — **let them say that sentence, not you.**
- **Pricing, when asked:** "Free during the beta. At launch it's a flat monthly fee —
  never a percentage, never per case, never a share of any recovery." Launch numbers
  are pending (pricing brief is with Ali); do not improvise a figure, and never state
  "one case pays for a year" as a claim — their fee, their division.

## If the coordinator is the audience (10-minute variant)

Skip pricing and stats entirely. Order: her queue (3) → one of her own calls scored
(1) → the digest (4). Framing throughout: "this hands you the callbacks that win, and
it logs the saves you already make — 'three signed cases came from your callbacks' is
the sentence your boss reads." Symmetric tracking matters to her: attorney follow-up
is tracked the same way. No leaderboards, no red numbers.

## Close

"Run it on your own calls for a month, free. If the flags are wrong, tell us — the
false alarms are part of the deal and we track them in the open. The NDA comes first,
nothing connects until it's signed, and every guardrail you saw is enforced in code —
quiet hours, opt-out, kill switch, human approval. The whole ask today is ten of your
recorded calls."

---

*Sources for every number above: `ops/insights.md` B4 (2026-07-07, verified/reported
labels preserved) and `ops/drafts/copy-audit-2026-07-11.md` (P0-2, P0-4 refutations).
If a stat isn't in those two files with a verified label, it doesn't get said.*

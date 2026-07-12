# Product machinery status — the conversion desk (audit + next-highest-ICE queue)

**Sub-objective 4.1.** Audit whether the Session-7 conversion machinery (B-010/011/012/013)
actually shipped and works against the real `beta/integration` code, then name the
next-highest-ICE desk items that keep the coordinator using it daily through week 3.

- **Audited against:** worktree `wt-integration`, branch `beta/integration`, HEAD `6785dd1`.
  Session-7 code is **merged in** (commits `8b80e64` pure logic, `ec1726c` persistence,
  `df1794c` wiring, `b59e896` decision log) — not stranded on the unpushed `beta/s7-conversion`
  branch the Session-7 decision entry described. Migrations were renumbered on merge
  (`a271fc4`): SQLite `0030_flag_status_attempts.sql`, Supabase `0038_flag_status_attempts.sql`.
- **Verification run:** `node --test tests/queue-view.test.mjs tests/flag-attempts.test.mjs
  tests/flag-status-guard.test.mjs` → **23/23 pass** (this session, 2026-07-11).
- **Method:** read the pure view logic, both DB adapters, the API route, the card, the
  migration, and the digest; traced each backlog item to running code; ran the tests.

---

## Verdict table

| Item | Backlog claim | Shipped? | Working? | Gap |
|---|---|---|---|---|
| **B-010** queue hygiene | terminal cards collapse; oldest-actionable first | ✅ shipped | ✅ tested | active queue sorts by **original call date only** — `last_attempt_at` captured but unused; confidence-tier priority silently dropped (see Gap 2, Gap 3) |
| **B-011** 6-touch nudge | "attempt N of 6" grounded in Velocify science | ✅ shipped | ✅ tested | none material; counter only increments in the single chokepoint, guarded-digest write can't double-count |
| **B-012** wins tally | strip on `/desk/queue` **+ weekly line in the digest** | ⚠️ **half** | ✅ (the half that shipped) | the digest line **never shipped** — the email-first coordinator gets no recognition (Gap 1) |
| **B-013** statute clock | honest elapsed-time urgency, **no computed deadline dates** | ✅ shipped | ✅ tested | none — compliance rail is clean and test-pinned |

Bottom line: **three of four fully landed and are test-covered; B-012 shipped half its
scope.** The compliance rail on B-013 (the one the brief called out) is intact and enforced by
a test that fails if the words `statute|deadline|expires` or any date ever appear in an urgency
label. The real story is not a regression — it's that Session 7 solved the *terminal-card*
graveyard but left the *in-progress-card* pile-up, which is the actual week-3 failure mode.

---

## What shipped, verified line-by-line

### B-010 — queue hygiene (ICE 512) — SHIPPED, WORKING
- `partitionLeaks()` in `web/src/lib/desk/queue-view.mjs` splits leaks into `active` and a
  collapsed `done` pile by `isTerminal(saveStatus)`; active is sorted ascending by `callDate`
  (longest-waiting caller = top card). Pure, no I/O.
- `web/src/app/desk/queue/page.tsx` renders `active` as full `LeakCard`s and `done` inside a
  `<details>` "Handled (N) — signed, passed, or bad number", each a slim `compact` row with
  **Reopen**. The ad-hoc inline TERMINAL filter is gone.
- **Terminal set is single-sourced** and pinned: `TERMINAL_STATUSES = ["signed","didnt_sign",
  "bad_number"]`, and a test asserts it matches the `flag_status` CHECK constraint exactly.
- Tests: "terminal cards collapse into done", "oldest-actionable first", "a day-15 queue of 30
  stale cards stays a today's list", "unparseable/missing call dates don't crash the sort" — all pass.

### B-011 — 6-touch attempt nudge (ICE 336) — SHIPPED, WORKING
- Migration `0030`/`0038` adds `attempts INTEGER NOT NULL DEFAULT 0` + `last_attempt_at` to
  `flag_status` (sibling table; the frozen `flags` row is never mutated — doctrine held).
- **Single-chokepoint increment.** `setFlagStatus` in `web/ingest/db.mjs` (and Postgres twin
  `db-postgres.mjs`) computes `attemptInc = status==='reached_out' || status==='back_in_touch'
  ? 1 : 0` and applies it in the one upsert. Terminal outcomes and Undo/Reopen do **not**
  increment. The `guardTerminal` (emailed-digest) path only *advances* status
  (`isRegression` check), so a replayed stale "We called them" link can't re-increment or
  un-sign — verified by `flag-status-guard.test.mjs`.
- `attemptNudge(attempts, status)` returns `null` before the first attempt and on any terminal
  status; else tiers the copy: calls 1–2 legitimize the next try, 3–5 credit the range, 6+
  credits a full effort and hands judgment back.
- **Tone rail enforced by test:** "nudges never read as surveillance — no 'only', no 'must', no
  quota framing" passes. No red number, no "N of 6" ratio in the UI (the ratio lives in the
  copy's *science*, not as a score).

### B-012 — coordinator wins tally (ICE 280) — HALF SHIPPED
- **Shipped:** `getCallbackWins(db, firmId, sinceIso)` (both adapters) returns
  `{worked, reached, signed}` over the last 7 days; `queue/page.tsx` renders "Your wins this
  week" with a credit-framed line ("started with your callbacks — worth saying out loud in
  Friday's meeting"). Her own tally, no leaderboard, no comparison. Compliant and on-rail.
- **NOT shipped:** the backlog deliverable was *"small stats strip on /desk/queue **+ weekly
  line in the digest**"*. `missed-digest.mjs` carries **no wins line** — `buildMissedDigest`
  never calls `getCallbackWins`, and `renderMissedDigest` has no recognition block. The
  Session-7 decision entry quietly narrowed the scope to the strip and didn't flag the drop.
  This matters because the **digest is the plan-of-record daily surface** (2026-07-10
  "digest-first desk"): the coordinator is explicitly told she doesn't need to open the app. So
  today her recognition ammunition only exists on a screen she's been told to skip. See D-023.
- **Minor test-coverage gap:** `getCallbackWins` has no unit test (the other three primitives
  all do). The SQL is simple, but the `reached`/`signed` bucket definitions are load-bearing
  for a claim shown to staff — worth pinning.

### B-013 — honest elapsed-time urgency (ICE 216) — SHIPPED, WORKING, COMPLIANT
- `callUrgency(callDateIso, now)` returns `{days, tone, label}` with tone `fresh (<2d) → aging
  (2–6d) → urgent (7+d)`, computed on the **server clock** in `queue/page.tsx` (no hydration
  drift), elapsed days only.
- **Compliance rail (the brief's flagged one) is clean:** no statute math, no deadline date,
  ever. The vaporware "statute clocks" footnote is deleted; the new footnote says the waiting
  time is a callback reminder and "Statute-of-limitations tracking stays with your attorneys."
  Pinned by test "urgency labels speak elapsed time and encouragement — never a deadline date".
- Visual weight escalates to amber only — never red; the path to green (the Call button) is on
  the same card. On-rail with the persona guidance.

---

## Gaps found (ranked by how fast they erode daily use)

### Gap 2 — THE week-3 killer: the active queue sorts by original call date, ignoring `last_attempt_at`
This is the sharpest finding and it is the direct sequel to B-010. `partitionLeaks` sorts the
active list purely by `callDate` (the caller's *original* call). But by week 3 the active list is
a **mix of two populations**:
1. never-touched callers (correctly ranked by call-age), and
2. in-progress cases she's already working (`reached_out`, 3–5 logged attempts).

Because everything sorts by original call date, **a case she left a voicemail on yesterday
(attempt 4, first called 9 days ago) floats to the TOP, above a brand-new never-touched caller
from this morning.** That inverts "one queue, one next action": the top card should be *who is
due for the next action*, not *who called longest ago*. The data to fix it (`last_attempt_at`)
is already captured and already flows through `listLeakedFlags` — it's simply unused in the
comparator. This is the exact daily-erosion Session 7 was built to prevent, one layer up. **Fix
is a pure-function change** (D-021), lands in the already-tested harness.

### Gap 1 — B-012's digest recognition line is missing (scope miss)
Covered above. The email-first coordinator gets urgency-free, recognition-free rows. Cheap to
close by threading two functions that already exist (`getCallbackWins`, `callUrgency`) into
`missed-digest.mjs`. (D-023.)

### Gap 4 — no non-terminal "defer / not today" state → the active pile only grows
B-010 collapses *terminal* cards. But a case she worked today and will retry tomorrow has
nowhere to go: it stays `reached_out` and therefore stays **active and near the top** (Gap 2
makes this worse). There is no honest way to say "handled for today, resurface tomorrow" without
marking it terminal (a lie). So the active list only shrinks when a case *finishes* — which for
a 6-touch cadence is days away. That is a graveyard by a different door. (D-022.)

### Gap 3 — confidence-tier priority is silently dropped in the active order (design decision, not a bug)
`listLeakedFlags` SQL orders strong-tier-first, but `partitionLeaks` re-sorts active purely by
`callDate`, discarding it. A **strong, high-fee, fresh** flag can sit below a **moderate, stale**
one. For a small daily queue (a handful of cards) this is fine and arguably correct (age = the
honest urgency signal). For a firm with a fat queue it can bury the best case. Worth a conscious
call, folded into D-021's comparator rather than left implicit.

### Low-risk-confirm — migration numbering gaps
The renumber left holes: SQLite skips `0027`, Supabase skips `0035`. Hosted Supabase migrations
are applied **by hand one at a time** (per decisions log), so a gap is cosmetic, not a runner
blocker — but confirm no automated runner enforces contiguity before Monday. Not a launch gate.

---

## Next-highest-ICE desk items for week-3 survival

Persona rails held throughout: **one screen / one queue / one tap; credit, not surveillance; no
computed deadlines; no quota, no red number, no staff-vs-staff comparison.** ICE = Impact ×
Confidence × Ease (1–10 each).

### D-021 — Next-action sort: order the active queue by what's DUE (uses `last_attempt_at`)  ·  ICE: 9×8×8 = 576  ·  lane: product
- **Hypothesis:** If the active queue's top card is *who to call next* (untouched cases ranked by
  call-age as today; touched cases ranked by time-since-last-attempt against a gentle cadence),
  then daily use survives week 3 because the list reads as a live "next action" queue instead of
  inverting to bury fresh callers under half-worked ones (Gap 2).
- **Deliverable:** change the `partitionLeaks` comparator (a `nextDueRank(leak, now)` helper),
  optionally surface a one-line "ready for the next try" cue, extend `queue-view.test.mjs`. No
  migration — `last_attempt_at` already flows. Fold the Gap-3 tier decision in here (e.g. tier as
  a tiebreak within the same due-bucket). PR on `queue-view.mjs` + `page.tsx`.
- **Rail:** the cue is "ready for the next try," never "overdue"/"behind"; no red, no count-down.
- **Why top:** highest impact (fixes the actual week-3 inversion), highest ease (pure function,
  existing data, existing test harness), and it directly completes B-010's own thesis.

### D-023 — Complete B-012: wins + urgency in the digest  ·  ICE: 7×8×8 = 448  ·  lane: product
- **Hypothesis:** If the daily digest carries the weekly "callbacks → reached → signed" line and
  a per-row "waiting N days" cue, then the email-first coordinator gets recognition + urgency
  without opening the app — closing the loop the digest-first plan of record opened (Gap 1).
- **Deliverable:** thread `getCallbackWins` + `callUrgency` (both already exist and are pure)
  into `buildMissedDigest`/`renderMissedDigest`; add a unit test for `getCallbackWins` while
  there. PR on `missed-digest.mjs`.
- **Rail:** her tally only, credit-framed; elapsed-time cue only, never a deadline. Same rails the
  on-screen versions already pass.
- **Why #2:** cheapest real win — finishes a shipped-but-half item using code that already exists.

### D-022 — "Not today" defer: an honest way to clear a worked card and resurface it  ·  ICE: 9×7×6 = 378  ·  lane: product
- **Hypothesis:** If a coordinator can defer a card she's worked ("remind me tomorrow") without
  marking it terminal, then the active list actually reaches zero each day and stays a today's
  list through week 3 — instead of accreting in-progress cases until they finish (Gap 4).
- **Deliverable:** `snoozed_until` column on `flag_status` (twin migrations, sibling doctrine),
  a filter in `partitionLeaks` (snoozed → out of active until due, **never** into terminal/done —
  it must always resurface, never disappear), one "Not today" button on the card, and a test that
  a snoozed case reappears and is never silently aged out. PR + migration.
- **Rail:** defer must *always* resurface (compliance-adjacent: a case can never silently vanish);
  no snooze on a terminal case; framed as "we'll bring it back," not "dismiss."
- **Pairs with D-021:** together they make the active queue a true "call these now" list.

### D-024 — "Worked to zero" progress moment  ·  ICE: 6×7×8 = 336  ·  lane: product
- **Hypothesis:** If the desk shows a small "3 of 7 handled today" progress line (and a real
  empty-state celebration when the active list hits zero), then daily engagement holds because the
  coordinator gets the inbox-zero payoff — recognition, not a metric she's judged on.
- **Deliverable:** derive today's handled/remaining from existing status timestamps; render a
  progress line + reuse the existing all-clear panel copy. Pure/read-only; no migration. PR on
  `page.tsx`.
- **Rail:** progress toward *her* zero, framed as accomplishment; never a rate, never a comparison.

**Sequencing:** D-021 → D-023 → D-022 → D-024. D-021 and D-023 are pure/near-pure and could land
before Monday if desired; D-022 needs a migration so it rides the next migration window. All four
are backend/product-internal (no public claim, no pricing, no outreach) → ship on merge under the
operating protocol; none route to Yang and none touch a §VII gate. D-021's comparator and D-022's
"always resurfaces" invariant are the two things to pin with tests.

---

## Proposed `ops/decisions.md` entry (stage — do NOT append live)

```
## 2026-07-12 — Conversion-machinery audit (Session-7 verify) + week-3 desk queue  ·  agent: product-dev (research/QC) · lane: product
- **Change:** Audited B-010/011/012/013 against merged `beta/integration` (HEAD 6785dd1); ran
  the 3 test files (23/23 pass). Findings: B-010/B-011/B-013 fully shipped, working, test-pinned;
  B-013's no-computed-deadline compliance rail is clean and enforced. B-012 shipped HALF —
  the on-screen wins strip landed, but the scoped "weekly line in the digest" never shipped, so
  the email-first coordinator (the plan-of-record daily surface) gets no recognition.
- **Gaps:** (2/killer) active queue sorts by original call date only; `last_attempt_at` is
  captured but unused, so in-progress cases bury fresh callers by week 3 — inverts one-queue-one-
  next-action. (1) digest recognition line missing. (4) no non-terminal "defer/not today" state,
  so the active pile only shrinks on terminal outcomes. (3) confidence-tier order silently dropped
  in active list (design call to make explicit). Low-risk: migration numbering has cosmetic gaps
  (sqlite 0027 / supabase 0035 skipped) — confirm no contiguity-enforcing runner.
- **Next items (ICE):** D-021 next-action sort (576), D-023 finish B-012 in the digest (448),
  D-022 "not today" defer state (378), D-024 worked-to-zero progress (336). All product-internal,
  no §VII gate, no Yang. Persona rails held: credit not surveillance, no deadline math, no quota.
- **Expected effect:** desk daily-active retention through week 3 of a pilot; the queue stays a
  "call these now" list instead of a pile of half-worked cases.
- **Status:** audit staged for Ali; D-021/D-023 buildable pre-Monday if prioritized.
- **Review date:** 2026-08-01 (alongside the Session-7 items' own review).
```

---

## Biggest risk (named)

**The desk's week-3 failure has moved up one layer and is currently invisible.** Session 7
correctly killed the *terminal-card* graveyard, so a demo and week-1 usage look great — the queue
is clean. But because the active list sorts by original call date and has no defer state
(Gaps 2 + 4), by week 3 the coordinator's top cards become the cases she's *already working*,
sorted by the wrong key, while fresh high-value callers sink. The tool will feel worse exactly
when the pilot-to-paid decision is being formed, and nothing in the current tests or metrics will
flag it — the unit tests assert the sort is oldest-first (which is the bug, not the guardrail).
D-021 + D-022 are the fix; they should not wait for a post-mortem after a pilot cools off.

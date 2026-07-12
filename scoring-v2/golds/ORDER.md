# GOLD ORDER — PINNED CALIBRATION STATE (do not reorder casually)

The six golds are sent to the model in this exact order on every request:

    1. gold-1  — clean sign        (strong reads; on-call e-sign justified)
    2. gold-2  — signed dog        (SAME aggressive close, thin reads)
    3. gold-3  — correct develop   (named unknowns, pre-registered exit)
    4. gold-4  — correct decline   (Prop 213 gate fact extracted, not fired)
    5. gold-5  — refer-out         (med-mal out of scope; high specialist value)
    6. gold-6  — high-value sign   (trucking; urgency; rep deferral recorded)

Why this order is load-bearing (and therefore pinned):

- **Few-shot order is calibration state.** Order effects in in-context
  learning are large and documented (reversing two examples has flipped
  benchmark accuracy from ~88% to near-chance in the worst published case).
  v1 pinned its order (2, 1, 3); v2 keeps the discipline. Any validation
  result (QWK, canary behavior) is valid ONLY under this exact order.
- **The contrastive pair sits adjacent (1 → 2).** Gold 1 and gold 2 contain
  the same aggressive on-call close with opposite pipeline outcomes because
  the dimension reads differ. Adjacency teaches the decision boundary rather
  than the prototype — the model sees the same behavior graded two ways for
  reasons that are entirely in the reads.
- **The set does not end on a decline.** Recency bias tilts toward the last
  label seen; ending on gold-4 or another adverse profile would tilt marginal
  calls toward adverse reads. The set ends on gold-6: strong reads, honest
  urgency, and the reminder that reads are recorded independently of what
  the rep did.
- **Coverage:** the four outcomes v1 never tested each appear once —
  develop (3), decline (4), refer_out (5), over-conversion boundary (2) —
  plus a clean sign (1) and a genuine lost high-value case (6).

Change control:
- Reordering, editing, adding, or removing a gold is a CALIBRATION CHANGE.
  It requires: a decisions-log entry, a full re-run of the gold set through
  the harness, the v1-vs-v2 comparison set, and the canary transcripts, with
  a block on any QWK regression > 0.05 (objective-spec §5).
- The harness (`score-v2.js`) loads golds strictly by this list, not by
  directory order. This file is documentation; `scoring-v2/lib/golds.mjs`
  carries the same list in code (`GOLD_ORDER`). Keep the two in sync — the
  unit tests assert it.

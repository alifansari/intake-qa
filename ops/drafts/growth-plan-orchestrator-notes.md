# Orchestrator notes on the MASTER-GROWTH-PLAN (adversarial read) · 2026-07-12

The master plan is strong and I endorse its through-line and sequencing. Two corrections
after independent verification:

1. **D-021 is NOT a bug and NOT a Monday item (master synth over-dramatized it).**
   The product-machinery-status.md sub-draft — the one that actually read the code — labels
   the tier-dropped active sort "a design decision, not a bug," and says for a small daily
   queue (a handful of cards = exactly the beta cohort) it is "fine and arguably correct
   (age = the honest urgency signal)." It only buries the best case for a firm with a FAT
   queue. There is no unit test "asserting the buggy sort." D-021 is a real week-3+
   ENHANCEMENT (next-due sort via last_attempt_at) for when queues fatten — build it then,
   NOT before Monday.

2. **None of the three "before Monday" Claude items are launch-blockers.** For a 3–5 firm
   cohort: week-1 call volume is tiny (the corpus-spine "permanently lost data" is a handful
   of calls if it ships week-1 instead of Monday), and the CR-A/CR-B conversions happen
   weeks out (audit→pilot→paid), so instrumentation is needed before the FIRST conversions,
   not Monday. **Recommendation: the certified-green beta/integration branch stays FROZEN**
   (only the Ali-gated items touch it). All growth code ships on separate branches, verified,
   staged as clean post-launch merges. Do not risk the launch I certified to save a few days
   on non-blocking work.

Order of safe post-launch Claude builds (off beta/integration, separate branches):
CR-A/CR-B instrumentation (built on Session-3's existing /studio/beta funnel; no hosted
migration) → corpus spine rows 0–2 (dark, sibling-only; needs migration 0039+, an Ali step)
→ D-021 next-due sort (week-3) → clio.mjs refresh-token silent-401 fix.

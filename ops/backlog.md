# Hypothesis Backlog

> The one prioritized queue. Every agent pulls from here; nothing gets built ad hoc. Each item
> is a testable hypothesis, not a task ("If we do X, metric M moves because of insight I").
> Scored by ICE: Impact (1–10) × Confidence (1–10) × Ease (1–10), then sorted by score.

## Format

```
### B-NNN — [title]  ·  ICE: I×C×E = score  ·  lane: product|website|outreach|research
- **Hypothesis:** If we ___, then [metric] moves because [insight ref].
- **Deliverable:** what "done" looks like (a draft/PR, never a published thing).
- **Status:** queued | in-progress | staged-for-approval | shipped | killed
- **Result:** (filled in after review) did the metric move? keep/kill/iterate.
```

## Rules

- Keep this list short and ruthless. Kill stale items. A backlog of 50 is a backlog of 0.
- Every item names the insight it rests on (from `ops/insights.md`). No insight → weak hypothesis.
- Builders stage; they never publish. "Done" = staged for Ali's approval + logged in decisions.

---

### B-001 — Benchmark report as second-touch authority asset  ·  ICE: 9×7×4 = 252  ·  lane: research→outreach
- **Hypothesis:** If we ship "State of NorCal PI Intake" grounded in the CIPA-safe mystery-shop
  dataset, then qualified conversations rise because independent-scorer authority (Moody's/J.D.
  Power model) earns the first meeting.
- **Deliverable:** research analyst assembles the dataset spec + findings draft; outreach drafts
  the distribution plan. Yang sign-off before any dialing.
- **Status:** in-dev

### B-002 — Spanish-intake quality gap as earned-PR pillar  ·  ICE: 8×6×5 = 240  ·  lane: outreach
- **Hypothesis:** If we quantify and publish the Spanish-intake quality gap (Fricker testimonial
  injustice framing), then earned media + inbound interest rise because it's a justice story with
  a number attached.
- **Deliverable:** outreach drafts the angle + target outlets; research analyst supplies the
  defensible number. No claimant data used without consent.
- **Status:** queued

### B-003 — Live in-call coaching component hardening  ·  ICE: 7×6×5 = 210  ·  lane: product
- **Hypothesis:** If `IntakeCoach.jsx` is production-hardened (latency, false-positive rate,
  consent gating), then pilot demos convert better because the "wow" is real and defensible.
- **Deliverable:** product-dev PR + a Calibration note on its false-alarm rate.
- **Status:** queued

### B-004 — Self-improving agent architecture (standing meta-item)  ·  ICE: 8×5×6 = 240  ·  lane: research
- **Hypothesis:** If each cycle the analyst spends one beat auditing the agent system itself —
  where the loop lost value, which agent/prompt/ledger is the weakest link, what capability no
  competitor could replicate — then output quality compounds because the machine that builds the
  product also rebuilds itself. Ali's standing directive: run at max value/productivity and build
  what no one else could.
- **Deliverable:** a dated `ops/insights.md` entry with concrete, ICE-scored proposals to improve
  an agent prompt, a ledger, the compliance skill, or the loop — staged as edits for Ali's approval,
  never self-applied to `.claude/` without a logged decision.
- **Status:** standing (revisit every cycle)

<!-- Add new hypotheses below; re-sort by ICE score after each cycle. -->

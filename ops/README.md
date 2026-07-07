# ops/ — the shared brain

Four ledgers + the compliance skill are what turn four agents into a compounding system.

- `metrics.md` — the scoreboard (North Star + input levers). Read first.
- `insights.md` — research findings. Research writes; builders read.
- `backlog.md` — one prioritized, ICE-scored hypothesis queue. Everyone pulls from here.
- `decisions.md` — the memory. Every change logged with a hypothesis and a review date.
- `../.claude/skills/compliance-invariants/SKILL.md` — the guardrails that outrank everything.

**The cycle:** research writes insights → insights become ICE-scored hypotheses in the backlog →
builders pull the top item in their lane, produce a *staged* draft/PR, and log a decision with a
review date → at the review date, the result is recorded and the metric checked → learning feeds
back into insights. That feedback loop is the rocketship.

## Making it continuous

Subagents run when you run them. To make `/rocketship` truly recurring, pick one:

1. **Cron + headless Claude Code** (simplest). Add to your crontab:
   ```
   # 9am Monday, weekly loop, non-interactive
   0 9 * * 1 cd /path/to/intake-qa && claude -p "/rocketship" >> ops/loop.log 2>&1
   ```
   `-p` runs headless. Because every builder stages instead of publishing, an unattended run is
   safe: it produces drafts/PRs and log entries for you to review, never a sent email or a live
   deploy.

2. **GitHub Actions** on a `schedule:` trigger running the same headless command in CI, opening a
   PR with the week's staged work. Good if you want the output as a reviewable PR every Monday.

3. **A scheduled task** in Claude.ai's own scheduling surface for the research half (quarterly
   Deep Research scans), pasted into `insights.md`, with the builders run locally.

Whichever you choose: the human-approval gates in `compliance-invariants` §VII still hold. Nothing
reaches a prospect, the public site, or production without you pressing the button.

# Automation — how the daily loop runs itself

The `/rocketship` loop runs **every day in the cloud** via GitHub Actions
(`.github/workflows/rocketship-daily.yml`). No laptop required. Each run stages
the day's work and opens a Pull Request whose description is a plain-English
digest of what happened — that PR is your end-of-day readout.

## What it does (and what it will never do)

- ✅ Runs the full four-agent loop: research → prioritize → build → compliance gate → report.
- ✅ Writes to the `ops/` ledgers, drafts copy, and stages code as a PR.
- ✅ Hands you a one-screen digest: what was learned, what was built, and the
  short list of things that need your yes/no.
- ❌ Never sends a text/email to a firm, publishes to the live site, or deploys.
  Those cross a human-approval gate (`compliance-invariants` §VII) — one click
  from you, by law, not by preference.

**The digest is not a review queue.** Most of what the loop produces is internal
(research, backlog, staged PRs) and needs nothing from you. Only real outward
actions need approval.

## One-time setup (required — the loop can't run without this)

1. Go to **github.com/alifansari/intake-qa → Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `ANTHROPIC_API_KEY`  ·  Value: your Anthropic API key (from console.anthropic.com).
4. Save.

Then test it once: **Actions tab → "Rocketship — daily compounding loop" → Run workflow**.
In a few minutes a PR titled `Rocketship — <date>` appears with the digest. GitHub
emails you when it opens, so that email *is* your daily readout.

## Cost (be aware)

A daily full run spins up Opus/Sonnet agents doing real research + building — this
is meaningful Anthropic API spend, billed to the key above. If it's more than you
want pre-revenue, switch to weekly: edit the `cron` line in the workflow to
`'0 17 * * 1'` (Monday 9am Pacific). GitHub Actions compute itself is free at this scale.

## Change the cadence

Edit `- cron:` in `.github/workflows/rocketship-daily.yml` (times are UTC):
- Daily 6pm PT (current): `'0 1 * * *'`
- Weekdays only, 6pm PT: `'0 1 * * 2-6'`
- Weekly, Mon 9am PT: `'0 17 * * 1'`

## Honest status

This is v1 of the automation. The first real run is a shakedown — headless CI
sometimes surfaces a step an interactive session doesn't (a build that needs
deps, an agent that expects a browser). If the first digest reports errors,
that's expected; send it to Claude Code and it gets fixed on the next commit.

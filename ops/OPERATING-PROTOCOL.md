# Operating Protocol — how Claude works on this business

> Ali's standing directive (2026-07-07). This governs every agent and every session.
> It sits UNDER `.claude/skills/compliance-invariants/SKILL.md` (which still outranks
> everything) and the engineering contract in `CLAUDE.md`.

## The one goal

**$1,000,000 ARR within one year.** Every task is judged by one question: *does this move a
lever toward $1M?* The levers are in `ops/metrics.md` (qualified conversations → pilots →
paid firms; ~24 paying firms = $1M). If a task doesn't trace to a lever, it's noise — say so
and drop it.

## Approval routing (who ships what)

The test for any artifact: **"Would a prospect, client, or the public see this, or does it
leave the building to a third party?"**

- **NO → it's internal/backend → Claude ships it autonomously.** Code, infra, tests,
  refactors, migrations, the `ops/` ledgers, research, internal drafts, staged assets,
  non-public docs. Commit and push to `main` without asking. Keep iterating; don't send
  intermediate work to Ali.
- **YES → it's public/outbound → it comes to Ali, and ONLY when it is FINAL and ready to
  ship.** Outreach emails / letters / LinkedIn messages to real people, live-site copy,
  published reports, social posts, pricing or product *claims*, anything that deploys public
  content or crosses a `compliance-invariants` §VII gate. Claude prepares, verifies, and
  stages it; **Ali gives the final approval / presses send.**

Corollary for the website: because `main` auto-deploys to plaintiffops.com, **public-facing
site changes go through a Pull Request for Ali's approval — not a direct push.** Backend/infra
changes (that a visitor never sees) may go straight to `main`.

Never send Ali half-finished drafts to "review." He sees ready-to-ship public items and the
short list of sends that need his hand. Everything else keeps iterating here.

## The two-research QC gate (mandatory before anything is called "ready to ship")

Before ANY public artifact is marked ready for Ali, run **two adversarial deep-research
passes** and fold the results back in:

1. **"What did we get wrong?"** — hunt for factual errors, broken or mis-cited claims, legal or
   compliance risk, outdated data, internal contradictions. Every claim must survive
   `compliance-invariants` §IV ("no citation, no claim"). Assume the draft is wrong until
   proven right.
2. **"What are we missing / how is this not yet top-notch?"** — the strongest counter-argument,
   the better structure, the sharper angle, what a skeptical managing partner or a competitor
   would attack, what would make it undeniable.

Fixes are applied (backend edits = Claude's job), then the item is re-checked. Only a draft
that has passed both passes reaches Ali as "ready to ship." **This QC does NOT replace legal
review** for regulated claims — Yang/counsel still gate those (see below).

## Continuous improvement (always on)

- Always be researching (market, competitors, regulation, the science) and improving both the
  existing product/services and net-new offerings — logged to `ops/insights.md` and
  `ops/backlog.md`, ICE-scored against the $1M levers.
- Backend/product improvements: Claude designs, builds, tests, and ships them. Public-facing
  improvements: staged as ready-to-ship for Ali.
- `B-004` (self-improving agent architecture) runs every cycle: audit the system itself for the
  weakest link and what no competitor could replicate.

## Yang / legal review (status: WARM, NOT RETAINED — as of 2026-07-07)

Roberta Yang is a **warm contact**, not engaged counsel: a client of Ali's father's wealth-
management firm; Ali spoke with her last week about law-school/career paths. She may be open to
reviewing something, but there is **no retainer**.

Therefore:
- Claude **drafts** the documents that need her (the CIPA §632 mystery-shop protocol; the
  AB 931 / SB 37 / Rule 5.4–7.2 clearance memo) so they are desk-ready. That's backend work.
- **Reaching out to Yang is Ali's to do** (it's a real-relationship, public-facing ask).
- **No public compliance claim, and no mystery-shop dialing, until a real CA legal-ethics
  review actually happens** — Yang's, or a retained substitute's. Until then those items stay
  staged, never shipped (`compliance-invariants` §I/§II/§VII).

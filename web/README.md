# Intake QA — web app

The hosted product for Intake QA (a service of Plaintiff Ops LLC): a Next.js App Router app
that scores a PI firm's recorded intake calls, surfaces likely-signable callers who never
signed, and runs the founding-beta funnel (apply → NDA → onboarding → desk).

**Safety posture:** nothing sends anything by default. `TEST_MODE=true` and
`KILL_SWITCH=true` ship on — every SMS/e-sign/email path is simulated or logged until you
deliberately go live. Keep them on for all local work.

## Local quickstart

```bash
# from the repo root (the CLI scoring engine lives there and web/ vendors it)
npm install

# then the web app
cd web
npm install
cp .env.example .env.local
```

Fill in `.env.local`. The vars that matter for local dev:

| Var | Why |
| --- | --- |
| `DATABASE_URL` | Supabase **pooler** URL (port 6543) — required for the studio and intake surfaces; everything else falls back to local SQLite/JSON without it |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (auth + hosted data) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client-safe) |
| `FOUNDER_EMAIL` | The one email allowed into `/studio`; leave blank to keep the studio off |
| `ANTHROPIC_API_KEY` | Claude scoring (needed to score calls) |
| `ASSEMBLYAI_API_KEY` | Transcription (needed to process audio) |
| `TEST_MODE=true` | Simulate all sends — keep `true` locally, always |
| `KILL_SWITCH=true` | Global halt on all sends — keep `true` locally, always |

Everything else in `.env.example` is optional locally and documented inline there.

## Migrations (two tracks)

- `npm run db:migrate` — local SQLite, migrations `0001`–`0026` (`db/migrations/`). This is
  what the pilot surfaces and the test suite run against.
- `npm run db:migrate:postgres -- 0001 0002 ...` — hosted Supabase Postgres, migrations
  `0001`–`0034` (`supabase/migrations/`). Pass the numeric prefixes you want applied (it
  never blindly re-runs history); reads `DATABASE_URL` from the env or `web/.env.local`.
- The tracks diverge above `0019` by design: RLS, the Spot Check Studio, and the intake
  system exist **only** on the Postgres track, so the same logical migration can carry a
  different number on each track (e.g. SQLite `0026_firm_callrail_secret` = Postgres
  `0034_firm_callrail_secret`). `npm run smoke` knows about the divergence.

## Seeding demo data

- Local: `npm run seed:demo`
- Hosted Postgres: `node db/seed-demo-postgres.mjs` (uses the same `DATABASE_URL`)

## Run

```bash
npm run dev    # http://localhost:3000
```

## Verify

```bash
npm test       # unit + integration tests (node --test)
npm run smoke  # no-network preflight: migrations, schema, compliance posture, env
```

## Deploying

Follow the checklists at the repo root before anything goes near production:
[`../BETA_ONBOARDING.md`](../BETA_ONBOARDING.md) (onboarding a beta firm) and
[`../GO_LIVE.md`](../GO_LIVE.md) (the go-live gate — A2P 10DLC, env flips, approvals).

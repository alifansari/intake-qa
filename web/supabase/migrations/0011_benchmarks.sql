-- Intake QA — peer benchmarking (Postgres/Supabase twin of SQLite 0011).
--
-- Per-firm consent flag + anonymized aggregate snapshots (k-anonymity enforced
-- in analytics/benchmarks.mjs: >= 5 consenting firms). Snapshots contain no
-- firm-identifiable data. RLS ENABLED, NO POLICY on snapshots (aggregate/
-- operator data, service role only).

alter table firms add column if not exists benchmark_data_sharing boolean not null default false;

create table if not exists benchmark_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  contributor_count     integer not null,
  sample_size           integer not null,
  median_handling_score double precision,
  q1_handling_score     double precision,
  q3_handling_score     double precision,
  leak_rate             double precision,
  sign_rate_by_band     jsonb,
  created_at            timestamptz not null default now()
);
create index if not exists idx_benchmark_created on benchmark_snapshots(created_at);

alter table benchmark_snapshots enable row level security;

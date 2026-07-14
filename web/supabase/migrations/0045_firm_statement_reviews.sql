-- Intake QA — firm-pipeline statement review gate (migration 0045, Postgres dialect).
-- Postgres twin of db/migrations/0037_firm_statement_reviews.sql. See that file for WHY.
--
-- Tiered / sampled review for the ongoing Monthly Missed-Revenue Statement on the
-- REAL firm pipeline. A (firm, period) statement auto-releases only when every
-- leaked flag is engine-scored + evidence-verified; otherwise it holds in
-- analyst_review for human sign-off. Gated at the app layer by
-- SAMPLED_REVIEW_ENABLED (DEFAULT OFF) — inert until then.
--
-- ADDITIVE ONLY. Firm-scoped RLS matches the other firm-data tables
-- (calls/flags/call_analyses): firm users see only their own rows; the trusted
-- service role bypasses RLS.

create table if not exists firm_statement_reviews (
  id                  uuid primary key default gen_random_uuid(),
  firm_id             uuid not null references firms(id) on delete cascade,
  period              text not null,                       -- 'YYYY-MM'
  report_status       text not null default 'draft'
                        check (report_status in ('draft', 'analyst_review', 'released')),
  provenance          text check (provenance in ('analyst_reviewed', 'engine_scored')),
  auto_count          integer not null default 0,
  force_review_count  integer not null default 0,
  released_at         timestamptz,
  released_by         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (firm_id, period)
);
create index if not exists idx_firm_statement_reviews_firm on firm_statement_reviews(firm_id);

alter table firm_statement_reviews enable row level security;
drop policy if exists firm_statement_reviews_firm_all on firm_statement_reviews;
create policy firm_statement_reviews_firm_all on firm_statement_reviews
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

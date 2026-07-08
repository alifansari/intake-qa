-- Intake QA — firm-scoped RLS policies for the recovery-desk tables (migration 0020).
--
-- HARD REQUIREMENT (CLAUDE.md): every table with firm data must have RLS ENABLED
-- WITH A POLICY. Migration 0014 enabled RLS on these tables but shipped NO policy
-- (service-role-only), and template_versions (0006) + fee_value_ranges (0014) were
-- in the same state. This closes that gap using the existing 0001 pattern:
--   * direct firm_id column  -> firm_id in (select current_user_firm_ids())
--   * child of flags         -> EXISTS through flags.firm_id (through the parent)
--
-- fee_value_ranges is reference data: rows with firm_id IS NULL are GLOBAL published
-- ranges, readable by any authenticated user; firm-specific rows are firm-scoped.
--
-- Idempotent: RLS is already enabled by 0014/0006; policies are drop-if-exists +
-- create. Safe to re-run. Postgres/Supabase only (SQLite has no RLS).

-- Ensure RLS is on (no-op if 0014/0006 already enabled it).
alter table transcript_citations enable row level security;
alter table flag_confidence       enable row level security;
alter table analysis_versions     enable row level security;
alter table artifact_access_log   enable row level security;
alter table citation_failures     enable row level security;
alter table fee_value_ranges      enable row level security;
alter table template_versions     enable row level security;

-- ---------------------------------------------------------------------------
-- Direct firm_id tables.
-- ---------------------------------------------------------------------------

drop policy if exists template_versions_firm_all on template_versions;
create policy template_versions_firm_all on template_versions
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

drop policy if exists artifact_access_log_firm_all on artifact_access_log;
create policy artifact_access_log_firm_all on artifact_access_log
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

-- fee_value_ranges: global (firm_id IS NULL) rows are readable by any authed user;
-- firm-specific rows are firm-scoped. Writes require the row to belong to the
-- caller's firm (global reference rows are managed by the service role only).
drop policy if exists fee_value_ranges_read on fee_value_ranges;
create policy fee_value_ranges_read on fee_value_ranges
  for select
  using (firm_id is null or firm_id in (select current_user_firm_ids()));

drop policy if exists fee_value_ranges_write on fee_value_ranges;
create policy fee_value_ranges_write on fee_value_ranges
  for all
  using (firm_id in (select current_user_firm_ids()))
  with check (firm_id in (select current_user_firm_ids()));

-- ---------------------------------------------------------------------------
-- Child-of-flags tables: scope through flags.firm_id (the 0001 messages pattern).
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['transcript_citations','flag_confidence','analysis_versions','citation_failures']
  loop
    execute format('drop policy if exists %I_firm_all on %I', t, t);
    execute format(
      'create policy %I_firm_all on %I for all
         using (exists (select 1 from flags f
                         where f.id = %I.flag_id
                           and f.firm_id in (select current_user_firm_ids())))
         with check (exists (select 1 from flags f
                              where f.id = %I.flag_id
                                and f.firm_id in (select current_user_firm_ids())))',
      t, t, t, t);
  end loop;
end $$;

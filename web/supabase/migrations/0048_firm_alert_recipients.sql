-- Per-firm alert recipients (Postgres/Supabase dialect).
--
-- SQLite twin: web/db/migrations/0040_firm_alert_recipients.sql.
--
-- WHY: the missed-call pager and daily digest must reach the firm's own intake
-- team at an address they choose (shared inbox / on-call), not only whoever has
-- a login. Nullable: unset = fall back to member emails. RLS on `firms` already
-- covers new columns (table-level policy).
alter table firms add column if not exists alert_emails text;

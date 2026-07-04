-- Intake QA — Supabase (Postgres) schema for the hosted product.
--
-- This mirrors the pilot's SQLite tables (web/db/migrations/*.sql) so the same
-- pipeline data lives here once the product graduates off local SQLite. Run it
-- in the Supabase SQL editor (or `supabase db push`) after creating a project.
--
-- HARD REQUIREMENT (CLAUDE.md): every table containing firm data has RLS ENABLED
-- with a policy. Access is scoped to the authenticated user's firm via the
-- firm_members mapping. Nothing is readable/writable across firms.
--
-- Money is stored as whole US dollars (integer), matching the pilot.

-- ---------------------------------------------------------------------------
-- Firms and membership (who may see a firm's data)
-- ---------------------------------------------------------------------------

create table if not exists firms (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  avg_case_fee        integer not null default 0,
  timezone            text not null default 'America/Los_Angeles',
  subscription_price  integer,
  kill_switch         boolean not null default true,   -- start ON (safe)
  created_at          timestamptz not null default now()
);

-- Maps an auth user to a firm. A user only ever sees their own firm's rows.
create table if not exists firm_members (
  firm_id  uuid not null references firms(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     text not null default 'operator',
  created_at timestamptz not null default now(),
  primary key (firm_id, user_id)
);

-- Helper: firms the current user belongs to. SECURITY DEFINER so policies can
-- consult firm_members without recursing into its own RLS policy.
create or replace function current_user_firm_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select firm_id from firm_members where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Calls -> flags -> conversations -> messages ; outcomes ; recoveries ; handoffs
-- ---------------------------------------------------------------------------

create table if not exists calls (
  id             uuid primary key default gen_random_uuid(),
  firm_id        uuid not null references firms(id) on delete cascade,
  source         text not null check (source in ('callrail','manual')),
  external_call_id text,
  recording_url  text,
  transcript     text,
  caller_phone   text,
  caller_name    text,
  received_at    timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists calls_firm_idx on calls(firm_id);

create table if not exists flags (
  id                  uuid primary key default gen_random_uuid(),
  call_id             uuid not null references calls(id) on delete cascade,
  firm_id             uuid not null references firms(id) on delete cascade,
  qualification_score integer,
  signability_score   integer,
  is_leaked_signable  boolean not null default false,
  reason              text,
  created_at          timestamptz not null default now()
);
create index if not exists flags_firm_idx on flags(firm_id);

create table if not exists conversations (
  id             uuid primary key default gen_random_uuid(),
  flag_id        uuid references flags(id) on delete set null,
  firm_id        uuid not null references firms(id) on delete cascade,
  caller_phone   text,
  status         text not null default 'pending_approval'
                   check (status in ('pending_approval','active','opted_out','handed_off','closed')),
  consent_basis  text not null check (length(consent_basis) > 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists conversations_firm_idx on conversations(firm_id);

create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  direction       text not null check (direction in ('outbound','inbound')),
  body            text,
  status          text not null default 'drafted'
                    check (status in ('drafted','approved','sent','delivered','received','failed','rejected')),
  approved_by     text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id);
create index if not exists messages_status_idx on messages(status);

create table if not exists outcomes (
  id                     uuid primary key default gen_random_uuid(),
  conversation_id        uuid not null references conversations(id) on delete cascade,
  result                 text not null
                           check (result in ('signed','booked_callback','no_response','opted_out','lost')),
  recovered_fee_estimate integer,
  noted_at               timestamptz not null default now()
);
create index if not exists outcomes_conversation_idx on outcomes(conversation_id);

create table if not exists recoveries (
  id              uuid primary key default gen_random_uuid(),
  firm_id         uuid not null references firms(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  signed          boolean not null default false,
  fee_amount      integer not null default 0,
  week_of         date not null,                       -- ISO Monday of the recovery week
  created_at      timestamptz not null default now()
);
create index if not exists recoveries_firm_week_idx on recoveries(firm_id, week_of);

create table if not exists handoffs (
  id                    uuid primary key default gen_random_uuid(),
  conversation_id       uuid not null references conversations(id) on delete cascade,
  firm_id               uuid not null references firms(id) on delete cascade,
  kind                  text not null check (kind in ('esign','callback')),
  provider              text,
  signature_request_id  text,
  sign_url              text,
  embedded              boolean not null default false,
  callback_requested_at timestamptz,
  status                text not null default 'pending'
                          check (status in ('pending','completed','canceled')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists handoffs_firm_idx on handoffs(firm_id);
create index if not exists handoffs_sigreq_idx on handoffs(signature_request_id);

-- Consent log (CLAUDE.md guardrail d) — every consent-relevant event, firm-scoped.
create table if not exists consent_events (
  id              uuid primary key default gen_random_uuid(),
  firm_id         uuid not null references firms(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  basis           text not null,
  detail          text,
  created_at      timestamptz not null default now()
);
create index if not exists consent_events_firm_idx on consent_events(firm_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — ENABLE on every table + firm-scoped policies.
-- A row is visible/mutable only if its firm_id is in the caller's firm set.
-- For child tables without a direct firm_id (messages), scope via the parent.
-- ---------------------------------------------------------------------------

alter table firms          enable row level security;
alter table firm_members   enable row level security;
alter table calls          enable row level security;
alter table flags          enable row level security;
alter table conversations  enable row level security;
alter table messages       enable row level security;
alter table outcomes       enable row level security;
alter table recoveries     enable row level security;
alter table handoffs       enable row level security;
alter table consent_events enable row level security;

-- firms: a member can see/update their firm.
drop policy if exists firms_member_select on firms;
create policy firms_member_select on firms
  for select using (id in (select current_user_firm_ids()));
drop policy if exists firms_member_update on firms;
create policy firms_member_update on firms
  for update using (id in (select current_user_firm_ids()));

-- firm_members: a user sees their own membership rows.
drop policy if exists firm_members_self on firm_members;
create policy firm_members_self on firm_members
  for select using (user_id = auth.uid());

-- Generic firm-scoped tables (direct firm_id column).
do $$
declare t text;
begin
  foreach t in array array['calls','flags','conversations','recoveries','handoffs','consent_events']
  loop
    execute format('drop policy if exists %I_firm_all on %I', t, t);
    execute format(
      'create policy %I_firm_all on %I for all
         using (firm_id in (select current_user_firm_ids()))
         with check (firm_id in (select current_user_firm_ids()))',
      t, t);
  end loop;
end $$;

-- messages + outcomes: scope through the parent conversation's firm_id.
drop policy if exists messages_firm_all on messages;
create policy messages_firm_all on messages
  for all
  using (
    exists (select 1 from conversations c
             where c.id = messages.conversation_id
               and c.firm_id in (select current_user_firm_ids())))
  with check (
    exists (select 1 from conversations c
             where c.id = messages.conversation_id
               and c.firm_id in (select current_user_firm_ids())));

drop policy if exists outcomes_firm_all on outcomes;
create policy outcomes_firm_all on outcomes
  for all
  using (
    exists (select 1 from conversations c
             where c.id = outcomes.conversation_id
               and c.firm_id in (select current_user_firm_ids())))
  with check (
    exists (select 1 from conversations c
             where c.id = outcomes.conversation_id
               and c.firm_id in (select current_user_firm_ids())));

-- Intake QA — canonical intake record + chat-intake demo persistence (migration 0025).
--
-- SCOPE: Phase 2 of the intake system — the CANONICAL INTAKE RECORD every
-- channel produces (website chat today; phone/web-form later), plus its
-- append-only event trail and file attachments. The chat demo at /intake-demo
-- writes here (service role) so an ABANDONED session is still a captured lead.
-- Nothing here books, alerts, or writes to any external system.
--
-- CANONICAL RECORD SHAPE (one row = one lead, every channel identical):
--   contact / incident / path_data / routing / provenance / review jsonb blocks
--   + hoisted columns (channel, matter_type, bucket, status, confidence) for
--   querying. Zod validates the blocks at every boundary (src/lib/intake).
--
-- FOUR TERMINAL BUCKETS everywhere: book | escalate | human_handoff | decline
-- ("decline-by-design" — a polite, captured decline, never a dead end).
--
-- COMPLIANCE:
--   * CIPA consent-first: the chat's FIRST message is the AI disclosure; the
--     record stores consent_version + consent_at, and provenance keeps the
--     disclosure text version shown (compliance-invariants §II).
--   * UPL / ABA Formal Op. 512: the agent GATHERS AND SCHEDULES ONLY. Nothing
--     in this schema stores an AI legal conclusion or case valuation — routing
--     reasons are deterministic rule keys, and `review` exists because
--     AI-captured data stays visually distinct until a human verifies it.
--   * All rows are written by the SERVER (service role). Firm members can READ
--     their firm's leads; anonymous demo rows (firm_id null) are service-role
--     only. No public write path exists at the DB layer.
--
-- Additive only. Idempotent where practical. Postgres/Supabase only.

-- ---------------------------------------------------------------------------
-- intake_leads — the canonical intake record.
-- ---------------------------------------------------------------------------
create table if not exists intake_leads (
  id               uuid primary key default gen_random_uuid(),
  firm_id          uuid references firms(id) on delete cascade,  -- null = unattributed demo lead
  channel          text not null default 'website_chat'
    check (channel in ('website_chat','phone','web_form','manual')),
  matter_type      text not null default 'unknown'
    check (matter_type in ('mva','premises','dog_bite','other','unknown')),
  -- Terminal bucket; null while the conversation is still in progress.
  bucket           text
    check (bucket is null or bucket in ('book','escalate','human_handoff','decline')),
  status           text not null default 'in_progress'
    check (status in ('in_progress','abandoned','complete')),
  confidence       numeric,                     -- routing confidence 0–1 (deterministic)
  contact          jsonb not null default '{}'::jsonb,   -- name, phone, email, preferred language
  incident         jsonb not null default '{}'::jsonb,   -- date, narrative (verbatim), emergency screen
  path_data        jsonb not null default '{}'::jsonb,   -- per-matter-type block (MVA/premises/dog-bite)
  routing          jsonb not null default '{}'::jsonb,   -- bucket, confidence, reasons[], next_action, sol gate
  provenance       jsonb not null default '{}'::jsonb,   -- session id, tree_version, disclosure version, timestamps
  review           jsonb not null default '{}'::jsonb,   -- human verification state (AI-captured until verified)
  tree_version     text,
  consent_version  text,                        -- version of the CIPA/AI disclosure the visitor proceeded past
  consent_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists intake_leads_firm_idx on intake_leads(firm_id);
create index if not exists intake_leads_bucket_idx on intake_leads(bucket);

-- ---------------------------------------------------------------------------
-- intake_lead_events — append-only trail: every question, answer, branch, and
-- routing decision. "Every number drillable" (the Ledger, Phase 6) resolves to
-- these rows; nothing is editable in place.
-- ---------------------------------------------------------------------------
create table if not exists intake_lead_events (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references intake_leads(id) on delete cascade,
  seq         integer not null check (seq >= 0),
  kind        text not null,                    -- e.g. 'consent','question','answer','upload','routed'
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  constraint intake_lead_events_unique unique (lead_id, seq)
);

create index if not exists intake_lead_events_lead_idx on intake_lead_events(lead_id);

-- ---------------------------------------------------------------------------
-- intake_attachments — files the visitor attaches (crash/hazard/injury photos),
-- stored in the PRIVATE intake-uploads bucket, linked to the canonical record.
-- ---------------------------------------------------------------------------
create table if not exists intake_attachments (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references intake_leads(id) on delete cascade,
  storage_path      text not null,
  original_filename text not null,
  content_type      text,
  size_bytes        integer check (size_bytes is null or size_bytes >= 0),
  created_at        timestamptz not null default now()
);

create index if not exists intake_attachments_lead_idx on intake_attachments(lead_id);

-- ---------------------------------------------------------------------------
-- RLS — firm members can READ their firm's leads/events/attachments; ALL writes
-- go through the server (service role bypasses RLS). Demo rows (firm_id null)
-- are readable by no one but the service role. No public write path.
-- ---------------------------------------------------------------------------
alter table intake_leads       enable row level security;
alter table intake_lead_events enable row level security;
alter table intake_attachments enable row level security;

drop policy if exists intake_leads_firm_read on intake_leads;
create policy intake_leads_firm_read on intake_leads
  for select
  using (firm_id in (select current_user_firm_ids()));

drop policy if exists intake_lead_events_firm_read on intake_lead_events;
create policy intake_lead_events_firm_read on intake_lead_events
  for select
  using (exists (
    select 1 from intake_leads l
    where l.id = intake_lead_events.lead_id
      and l.firm_id in (select current_user_firm_ids())
  ));

drop policy if exists intake_attachments_firm_read on intake_attachments;
create policy intake_attachments_firm_read on intake_attachments
  for select
  using (exists (
    select 1 from intake_leads l
    where l.id = intake_attachments.lead_id
      and l.firm_id in (select current_user_firm_ids())
  ));

-- ---------------------------------------------------------------------------
-- Private Storage bucket for visitor uploads. NO object policies on purpose:
-- demo visitors are anonymous, so every upload happens through a short-lived
-- signed upload URL minted by the server (service role), exactly like the
-- demo-audio pattern in web/src/lib/supabase/storage.ts. Downloads are
-- server-side signed URLs only.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('intake-uploads', 'intake-uploads', false)
on conflict (id) do update set public = false;

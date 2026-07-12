-- Intake QA — persisted welcome emails (0036).
--
-- WHY: /api/studio/onboard-firm now composes the complete firm-personalized
-- welcome email (sign-in link, webhook address, first-48-hours plan). This table
-- keeps the REDACTED copy — the temporary password is masked before persistence
-- (it is shown once at provisioning and never stored readable) — so the founder
-- can re-read what a firm was sent, and so a founder-clicked send is recorded.
--
-- RLS: enabled, NO policy → service-role/founder surface only (same posture as
-- beta_applicants in 0023). A firm never needs to query its own welcome email;
-- exposure is app-mediated through the founder-gated studio.

create table if not exists welcome_emails (
  id              uuid primary key default gen_random_uuid(),
  firm_id         uuid not null references firms(id),
  to_email        text not null,
  subject         text not null,
  body_redacted   text not null,   -- NEVER the raw temp password
  sent_at         timestamptz,     -- set only by the founder-clicked send
  sent_message_id text,            -- Resend message id when sent live
  created_at      timestamptz not null default now()
);
create index if not exists welcome_emails_firm_idx on welcome_emails(firm_id);

alter table welcome_emails enable row level security;

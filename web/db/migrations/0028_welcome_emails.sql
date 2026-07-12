-- Persisted welcome emails (sqlite twin of supabase 0036).
-- The REDACTED welcome-email copy composed at onboarding (temp password masked
-- before persistence — never stored readable) plus the founder-clicked send stamp.

CREATE TABLE IF NOT EXISTS welcome_emails (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  firm_id         INTEGER NOT NULL REFERENCES firms(id),
  to_email        TEXT    NOT NULL,
  subject         TEXT    NOT NULL,
  body_redacted   TEXT    NOT NULL,
  sent_at         TEXT,
  sent_message_id TEXT,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_welcome_emails_firm ON welcome_emails(firm_id);

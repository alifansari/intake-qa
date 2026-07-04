-- Flattened read model for the in-app approval queue: each outbound message with
-- its conversation + caller context. security_invoker=on means the view runs
-- with the CALLER's privileges, so the underlying tables' RLS (firm scoping)
-- still applies — a user only ever sees their own firm's queue.

create or replace view queue_messages
with (security_invoker = on) as
select
  m.id                as message_id,
  m.body              as body,
  m.status            as status,
  m.approved_by       as approved_by,
  m.created_at        as created_at,
  c.id                as conversation_id,
  c.firm_id           as firm_id,
  c.status            as conversation_status,
  c.caller_phone      as caller_phone,
  cl.caller_name      as caller_name,
  f.reason            as flag_reason
from messages m
join conversations c on c.id = m.conversation_id
left join flags f on f.id = c.flag_id
left join calls cl on cl.id = f.call_id
where m.direction = 'outbound';

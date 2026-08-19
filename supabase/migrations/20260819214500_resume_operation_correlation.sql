-- Correlate every asynchronous CareerOS command with the exact assistant result.
-- Existing rows remain nullable; new resume-agent writes always set operation_id.

alter table public.resume_messages
  add column if not exists operation_id uuid;

create index if not exists idx_resume_messages_user_operation_created
  on public.resume_messages (user_id, operation_id, created_at desc)
  where operation_id is not null;

comment on column public.resume_messages.operation_id is
  'Durable correlation id for one asynchronous CareerOS operation; used instead of timestamp polling.';

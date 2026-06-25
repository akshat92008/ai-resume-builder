-- Add missing columns to agent_runs table
alter table public.agent_runs
  add column if not exists session_id uuid references public.builder_sessions(id) on delete set null,
  add column if not exists latency_ms integer,
  add column if not exists model text;

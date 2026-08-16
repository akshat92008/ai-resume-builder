-- CareerOS trust hardening: AI economics + privacy-safe telemetry.
-- Raw model/user payload capture remains an application-level opt-in. These
-- columns allow operations to measure cost/reliability without storing PII.

alter table public.agent_runs
  add column if not exists provider text,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists total_tokens integer,
  add column if not exists estimated_cost_usd numeric(12, 6),
  add column if not exists attempts integer not null default 1;

do $$ begin
  alter table public.agent_runs add constraint agent_runs_token_counts_nonnegative
    check (
      (input_tokens is null or input_tokens >= 0) and
      (output_tokens is null or output_tokens >= 0) and
      (total_tokens is null or total_tokens >= 0) and
      (estimated_cost_usd is null or estimated_cost_usd >= 0) and
      attempts >= 1
    );
exception when duplicate_object then null; end $$;

create index if not exists idx_agent_runs_user_created_at
  on public.agent_runs(user_id, created_at desc);
create index if not exists idx_agent_runs_agent_created_at
  on public.agent_runs(agent_name, created_at desc);

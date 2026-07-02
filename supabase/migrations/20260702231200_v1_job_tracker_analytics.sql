-- Phase 2: V1 Job Tracker and Analytics Extensions

-- 1. Extend Job Applications for Offer Comparison and Kanban Tracking
alter table public.job_applications
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists currency text default 'USD',
  add column if not exists bonus numeric,
  add column if not exists equity numeric,
  add column if not exists benefits_json jsonb default '{}'::jsonb,
  add column if not exists location text,
  add column if not exists work_type text, -- 'remote', 'hybrid', 'onsite'
  add column if not exists stage text,     -- e.g., 'screening', 'technical', 'final'
  add column if not exists offer_deadline timestamptz;

-- 2. Telemetry and Analytics Events
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

do $$ begin
  create policy "Users can insert their own analytics events" on public.analytics_events for insert with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users can read their own analytics events" on public.analytics_events for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_analytics_events_user_id on public.analytics_events(user_id);
create index if not exists idx_analytics_events_type on public.analytics_events(event_type);

-- 3. Chrome Extension State
create table if not exists public.extension_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_token text not null unique,
  device_info jsonb not null default '{}'::jsonb,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.extension_sessions enable row level security;

do $$ begin
  create policy "Users can manage their own extension sessions" on public.extension_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_extension_sessions_user_id on public.extension_sessions(user_id);
create index if not exists idx_extension_sessions_token on public.extension_sessions(session_token);

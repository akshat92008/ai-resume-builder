-- CareerPath AI launch scope: agentic resume builder tables and resume metadata.

alter table public.profiles
  add column if not exists personal_json jsonb default '{}'::jsonb,
  add column if not exists education_json jsonb default '[]'::jsonb,
  add column if not exists skills_json jsonb default '{}'::jsonb,
  add column if not exists projects_json jsonb default '[]'::jsonb,
  add column if not exists experience_json jsonb default '[]'::jsonb,
  add column if not exists certifications_json jsonb default '[]'::jsonb,
  add column if not exists achievements_json jsonb default '[]'::jsonb,
  add column if not exists languages_json jsonb default '[]'::jsonb,
  add column if not exists raw_notes text;

alter table public.resumes
  add column if not exists profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists target_role text,
  add column if not exists mode text check (mode in ('build', 'improve', 'tailor')),
  add column if not exists status text default 'draft' check (status in ('draft', 'needs_info', 'generated', 'audited', 'final')),
  add column if not exists score_json jsonb default '{}'::jsonb,
  add column if not exists audit_json jsonb default '{}'::jsonb,
  add column if not exists job_description text,
  add column if not exists version int default 1;

create table if not exists public.builder_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mode text not null check (mode in ('build', 'improve', 'tailor')),
  target_role text,
  current_step text,
  profile_json jsonb default '{}'::jsonb,
  messages_json jsonb default '[]'::jsonb,
  missing_questions_json jsonb default '[]'::jsonb,
  resume_id uuid references public.resumes(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  agent_name text not null,
  input_json jsonb default '{}'::jsonb,
  output_json jsonb default '{}'::jsonb,
  status text default 'completed',
  error text,
  created_at timestamptz default now()
);

alter table public.builder_sessions enable row level security;
alter table public.agent_runs enable row level security;

drop policy if exists "builder sessions owner manage" on public.builder_sessions;
create policy "builder sessions owner manage" on public.builder_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "agent runs owner manage" on public.agent_runs;
create policy "agent runs owner manage" on public.agent_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_builder_sessions_user_id on public.builder_sessions(user_id);
create index if not exists idx_builder_sessions_resume_id on public.builder_sessions(resume_id);
create index if not exists idx_agent_runs_user_id on public.agent_runs(user_id);
create index if not exists idx_agent_runs_resume_id on public.agent_runs(resume_id);
create index if not exists idx_resumes_target_role on public.resumes(target_role);

drop trigger if exists builder_sessions_updated_at on public.builder_sessions;
create trigger builder_sessions_updated_at
  before update on public.builder_sessions
  for each row execute procedure public.set_updated_at();

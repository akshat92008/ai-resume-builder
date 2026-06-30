-- CareerPath AI by Amaura Labs
-- Run this in Supabase SQL editor after creating a project.
-- Clean canonical schema for v1.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  city text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  target_roles text[] default '{}',
  headline text,
  summary text,
  public_slug text unique,
  portfolio_public boolean default false,
  role text default 'user',
  plan text default 'free',
  plan_status text default 'active',
  pro_until timestamptz,
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  personal_json jsonb default '{}'::jsonb,
  education_json jsonb default '[]'::jsonb,
  skills_json jsonb default '{}'::jsonb,
  projects_json jsonb default '[]'::jsonb,
  experience_json jsonb default '[]'::jsonb,
  certifications_json jsonb default '[]'::jsonb,
  achievements_json jsonb default '[]'::jsonb,
  languages_json jsonb default '[]'::jsonb,
  raw_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "profiles owner read write" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles admin manage" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();

create index if not exists idx_profiles_public_slug on public.profiles(public_slug);
create index if not exists idx_profiles_referral_code on public.profiles(referral_code);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, public_slug, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    trim(trailing '-' from lower(regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || substr(replace(new.id::text, '-', ''), 1, 6),
    upper(substr(replace(new.id::text, '-', ''), 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() = old.id and old.role != 'admin' then
    new.role = old.role;
    new.plan = old.plan;
    new.plan_status = old.plan_status;
    new.pro_until = old.pro_until;
    new.referral_code = old.referral_code;
    new.referred_by = old.referred_by;
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_privileged_fields() from public;
revoke execute on function public.protect_profile_privileged_fields() from anon;
revoke execute on function public.protect_profile_privileged_fields() from authenticated;
grant execute on function public.protect_profile_privileged_fields() to service_role;

create trigger protect_profile_privileged_fields_trigger before update on public.profiles for each row execute procedure public.protect_profile_privileged_fields();

-- ---------------------------------------------------------------------------
-- Resumes
-- ---------------------------------------------------------------------------

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  title text,
  target_role text,
  mode text check (mode in ('build', 'improve', 'tailor')),
  status text default 'draft' check (status in ('draft', 'needs_info', 'generated', 'audited', 'final')),
  style text,
  profile_json jsonb default '{}'::jsonb,
  career_profile_json jsonb default '{}'::jsonb,
  resume_document_json jsonb default '{}'::jsonb,
  application_pack_json jsonb default '{}'::jsonb,
  applications_json jsonb default '[]'::jsonb,
  job_search_insights_json jsonb default '[]'::jsonb,
  content_json jsonb,
  score_json jsonb default '{}'::jsonb,
  audit_json jsonb default '{}'::jsonb,
  job_description text,
  tailoring_json jsonb default '{}'::jsonb,
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.resumes enable row level security;
create policy "resumes owner manage" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger resumes_updated_at before update on public.resumes for each row execute procedure public.set_updated_at();

create index if not exists idx_resumes_user_id on public.resumes(user_id);
create index if not exists idx_resumes_target_role on public.resumes(target_role);

-- ---------------------------------------------------------------------------
-- Agentic Career OS
-- ---------------------------------------------------------------------------

create table if not exists public.career_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.career_profiles enable row level security;
create policy "career profiles owner manage" on public.career_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.career_raw_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile_id uuid references public.career_profiles(id) on delete cascade,
  content text not null,
  source text,
  created_at timestamptz not null default now()
);

alter table public.career_raw_inputs enable row level security;
create policy "career raw inputs owner manage" on public.career_raw_inputs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile_id uuid references public.career_profiles(id) on delete cascade,
  title text not null,
  version_type text not null,
  target_role text,
  document jsonb not null default '{}'::jsonb,
  score jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resume_documents enable row level security;
create policy "resume documents owner manage" on public.resume_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  raw_text text not null,
  extracted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.job_descriptions enable row level security;
create policy "job descriptions owner manage" on public.job_descriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.application_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_description_id uuid references public.job_descriptions(id) on delete cascade,
  resume_id uuid references public.resume_documents(id) on delete set null,
  pack jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.application_packs enable row level security;
create policy "application packs owner manage" on public.application_packs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  job_url text,
  job_description_id uuid references public.job_descriptions(id) on delete set null,
  resume_id uuid references public.resume_documents(id) on delete set null,
  application_pack_id uuid references public.application_packs(id) on delete set null,
  status text not null default 'saved',
  applied_at timestamptz,
  follow_up_at timestamptz,
  notes text,
  outcome jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.job_applications enable row level security;
create policy "job applications owner manage" on public.job_applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.job_search_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  insight jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.job_search_insights enable row level security;
create policy "job search insights owner manage" on public.job_search_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_career_profiles_user_id on public.career_profiles(user_id);
create index if not exists idx_career_raw_inputs_profile_id on public.career_raw_inputs(profile_id);
create index if not exists idx_resume_documents_user_id on public.resume_documents(user_id);
create index if not exists idx_job_descriptions_user_id on public.job_descriptions(user_id);
create index if not exists idx_application_packs_user_id on public.application_packs(user_id);
create index if not exists idx_job_applications_user_status on public.job_applications(user_id, status);
create index if not exists idx_job_search_insights_user_id on public.job_search_insights(user_id);

-- ---------------------------------------------------------------------------
-- Builder Sessions
-- ---------------------------------------------------------------------------

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

alter table public.builder_sessions enable row level security;
create policy "builder sessions owner manage" on public.builder_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger builder_sessions_updated_at before update on public.builder_sessions for each row execute procedure public.set_updated_at();

create index if not exists idx_builder_sessions_user_id on public.builder_sessions(user_id);
create index if not exists idx_builder_sessions_resume_id on public.builder_sessions(resume_id);

-- ---------------------------------------------------------------------------
-- Agent Runs
-- ---------------------------------------------------------------------------

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  session_id uuid references public.builder_sessions(id) on delete set null,
  agent_name text not null,
  input_json jsonb default '{}'::jsonb,
  output_json jsonb default '{}'::jsonb,
  status text default 'completed',
  error text,
  latency_ms integer,
  model text,
  created_at timestamptz default now()
);

alter table public.agent_runs enable row level security;
create policy "agent runs owner manage" on public.agent_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_agent_runs_user_id on public.agent_runs(user_id);
create index if not exists idx_agent_runs_resume_id on public.agent_runs(resume_id);

-- ---------------------------------------------------------------------------
-- Usage Events (Rate Limiting)
-- ---------------------------------------------------------------------------

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  ip_hash text,
  event_type text,
  created_at timestamptz default now()
);

alter table public.usage_events enable row level security;
create policy "usage events admin manage" on public.usage_events for all using (public.is_admin()) with check (public.is_admin());

create index if not exists idx_usage_events_user_id on public.usage_events(user_id);
create index if not exists idx_usage_events_ip_hash on public.usage_events(ip_hash);

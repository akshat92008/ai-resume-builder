-- Clean legacy tables
drop table if exists public.cover_letters cascade;
drop table if exists public.linkedin_about cascade;
drop table if exists public.proof_score_submissions cascade;
drop table if exists public.leads cascade;
drop table if exists public.orders cascade;
drop table if exists public.referrals cascade;
drop table if exists public.testimonials cascade;
drop table if exists public.portfolio_views cascade;
drop table if exists public.events cascade;
drop table if exists public.app_settings cascade;
drop table if exists public.education cascade;
drop table if exists public.skills cascade;
drop table if exists public.projects cascade;
drop table if exists public.experiences cascade;
drop table if exists public.certificates cascade;
drop table if exists public.achievements cascade;
drop table if exists public.proof_links cascade;
drop table if exists public.jobs cascade;

-- Re-apply clean schema
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
do $$ begin
  create policy "profiles owner read write" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "profiles admin manage" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
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

drop trigger if exists protect_profile_privileged_fields_trigger on public.profiles;
create trigger protect_profile_privileged_fields_trigger before update on public.profiles for each row execute procedure public.protect_profile_privileged_fields();

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  title text,
  target_role text,
  mode text check (mode in ('build', 'improve', 'tailor')),
  status text default 'draft' check (status in ('draft', 'needs_info', 'generated', 'audited', 'final')),
  style text,
  content_json jsonb,
  score_json jsonb default '{}'::jsonb,
  audit_json jsonb default '{}'::jsonb,
  job_description text,
  version int default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.resumes enable row level security;
do $$ begin
  create policy "resumes owner manage" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

drop trigger if exists resumes_updated_at on public.resumes;
create trigger resumes_updated_at before update on public.resumes for each row execute procedure public.set_updated_at();

create index if not exists idx_resumes_user_id on public.resumes(user_id);
create index if not exists idx_resumes_target_role on public.resumes(target_role);

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
do $$ begin
  create policy "builder sessions owner manage" on public.builder_sessions
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

drop trigger if exists builder_sessions_updated_at on public.builder_sessions;
create trigger builder_sessions_updated_at before update on public.builder_sessions for each row execute procedure public.set_updated_at();

create index if not exists idx_builder_sessions_user_id on public.builder_sessions(user_id);
create index if not exists idx_builder_sessions_resume_id on public.builder_sessions(resume_id);

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
do $$ begin
  create policy "agent runs owner manage" on public.agent_runs
    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_agent_runs_user_id on public.agent_runs(user_id);
create index if not exists idx_agent_runs_resume_id on public.agent_runs(resume_id);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  ip_hash text,
  event_type text,
  created_at timestamptz default now()
);

alter table public.usage_events enable row level security;
do $$ begin
  create policy "usage events admin manage" on public.usage_events for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null; end $$;

create index if not exists idx_usage_events_user_id on public.usage_events(user_id);
create index if not exists idx_usage_events_ip_hash on public.usage_events(ip_hash);

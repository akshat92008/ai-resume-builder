-- CareerPath AI by Amaura Labs
-- Run this in Supabase SQL editor after creating a project.

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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  institution text,
  degree text,
  field text,
  start_year int,
  end_year int,
  score text,
  coursework text[] default '{}',
  achievements text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text,
  category text,
  proficiency text,
  proof_links text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  short_description text,
  problem_solved text,
  target_users text,
  tech_stack text[] default '{}',
  features text[] default '{}',
  impact text,
  github_url text,
  live_url text,
  screenshots_url text,
  case_study_url text,
  role text,
  start_date date,
  end_date date,
  status text,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company text,
  role text,
  start_date date,
  end_date date,
  description text,
  responsibilities text[] default '{}',
  achievements text[] default '{}',
  proof_links text[] default '{}',
  certificate_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  issuer text,
  issue_date date,
  credential_url text,
  related_skills text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  description text,
  date date,
  proof_url text,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.proof_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  url text,
  type text,
  related_type text,
  related_id uuid,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_title text,
  company_name text,
  job_description text,
  role_category text,
  experience_level text,
  style text,
  analysis_json jsonb,
  fit_score int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  title text,
  style text,
  content_json jsonb,
  proof_score int,
  warnings jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  resume_id uuid references public.resumes(id) on delete set null,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.linkedin_about (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.proof_score_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  whatsapp text,
  course text,
  college text,
  target_role text,
  resume_text text,
  github_url text,
  linkedin_url text,
  portfolio_url text,
  projects_text text,
  result_json jsonb,
  score int,
  source text,
  created_at timestamptz default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text,
  name text,
  email text,
  phone text,
  whatsapp text,
  course text,
  college text,
  company text,
  role text,
  message text,
  source text,
  metadata jsonb default '{}',
  status text default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id text primary key,
  user_id uuid references auth.users(id) not null,
  email text,
  plan text,
  amount_inr int,
  currency text default 'INR',
  provider text,
  status text default 'pending',
  payment_reference text,
  payment_proof_url text,
  checkout_url text,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid references public.profiles(id) on delete cascade,
  referred_email text,
  referred_user_id uuid references public.profiles(id) on delete set null,
  status text default 'pending',
  reward text,
  created_at timestamptz default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  role text,
  college text,
  quote text,
  rating int,
  public boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.portfolio_views (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  viewed_at timestamptz default now(),
  referrer text,
  user_agent text
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  key text,
  value jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, key)
);

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

create or replace function public.is_public_profile(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = owner_id
    and portfolio_public = true
  );
$$;

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

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','education','skills','projects','experiences','certificates','achievements',
    'proof_links','jobs','resumes','cover_letters','linkedin_about','proof_score_submissions',
    'leads','orders','referrals','testimonials','portfolio_views','events','app_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "profiles owner read write" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles admin manage" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

create or replace view public.public_profiles as
  select id, full_name, headline, summary, public_slug, portfolio_public, target_roles, github_url, linkedin_url, portfolio_url, city, created_at, updated_at
  from public.profiles
  where portfolio_public = true;

grant select on public.public_profiles to anon, authenticated;

create policy "education owner manage" on public.education for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "skills owner manage" on public.skills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "projects owner manage" on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "experiences owner manage" on public.experiences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "certificates owner manage" on public.certificates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "achievements owner manage" on public.achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "proof links owner manage" on public.proof_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public Views for Child Tables
create or replace view public.public_education as
  select id, user_id, institution, degree, field, start_year, end_year, score, achievements, created_at, updated_at
  from public.education
  where user_id in (select id from public.public_profiles);

create or replace view public.public_skills as
  select id, user_id, name, category, proficiency, proof_links, created_at, updated_at
  from public.skills
  where user_id in (select id from public.public_profiles);

create or replace view public.public_projects as
  select id, user_id, title, short_description, problem_solved, tech_stack, features, impact, github_url, live_url, case_study_url, screenshots_url, status, tags, created_at, updated_at
  from public.projects
  where user_id in (select id from public.public_profiles);

create or replace view public.public_experiences as
  select id, user_id, company, role, start_date, end_date, description, responsibilities, achievements, created_at, updated_at
  from public.experiences
  where user_id in (select id from public.public_profiles);

create or replace view public.public_certificates as
  select id, user_id, title, issuer, issue_date, credential_url, created_at, updated_at
  from public.certificates
  where user_id in (select id from public.public_profiles);

create or replace view public.public_achievements as
  select id, user_id, title, description, date, proof_url, category, created_at, updated_at
  from public.achievements
  where user_id in (select id from public.public_profiles);

create or replace view public.public_proof_links as
  select id, user_id, title, url, type, created_at, updated_at
  from public.proof_links
  where user_id in (select id from public.public_profiles);

grant select on public.public_education to anon, authenticated;
grant select on public.public_skills to anon, authenticated;
grant select on public.public_projects to anon, authenticated;
grant select on public.public_experiences to anon, authenticated;
grant select on public.public_certificates to anon, authenticated;
grant select on public.public_achievements to anon, authenticated;
grant select on public.public_proof_links to anon, authenticated;

create policy "jobs owner manage" on public.jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "resumes owner manage" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cover letters owner manage" on public.cover_letters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "linkedin about owner manage" on public.linkedin_about for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "app settings owner manage" on public.app_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "referrals owner read" on public.referrals for select using (auth.uid() = referrer_id or public.is_admin());
create policy "referrals owner insert" on public.referrals for insert with check (auth.uid() = referrer_id);

create policy "anon proof score insert" on public.proof_score_submissions for insert with check (true);
create policy "admin proof score read" on public.proof_score_submissions for select using (public.is_admin());
create policy "owner proof score read" on public.proof_score_submissions for select using (auth.uid() = user_id);

create policy "anon leads insert" on public.leads for insert with check (true);
create policy "admin leads manage" on public.leads for all using (public.is_admin()) with check (public.is_admin());
create policy "owner leads read" on public.leads for select using (auth.uid() = user_id);

create policy "orders owner read" on public.orders for select using (auth.uid() = user_id or email = auth.jwt()->>'email' or public.is_admin());
create policy "orders owner insert" on public.orders for insert with check (auth.uid() = user_id);
create policy "orders admin manage" on public.orders for all using (public.is_admin()) with check (public.is_admin());

create policy "testimonials public read" on public.testimonials for select using (public = true);
create policy "testimonials admin manage" on public.testimonials for all using (public.is_admin()) with check (public.is_admin());

create policy "portfolio views insert" on public.portfolio_views for insert with check (true);
create policy "portfolio views admin owner read" on public.portfolio_views for select using (public.is_admin() or profile_id = auth.uid());

create policy "events insert" on public.events for insert with check (true);
create policy "events admin read" on public.events for select using (public.is_admin());
create policy "events owner read" on public.events for select using (auth.uid() = user_id);

create index if not exists idx_profiles_public_slug on public.profiles(public_slug);
create index if not exists idx_profiles_referral_code on public.profiles(referral_code);
create index if not exists idx_leads_type_status on public.leads(type, status);
create index if not exists idx_orders_status_user_id on public.orders(status, user_id);
create index if not exists idx_proof_score_submissions_email on public.proof_score_submissions(email);
create index if not exists idx_jobs_user_id on public.jobs(user_id);
create index if not exists idx_resumes_user_id on public.resumes(user_id);
create index if not exists idx_events_event_name_user_id on public.events(event_name, user_id);

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
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger education_updated_at before update on public.education for each row execute procedure public.set_updated_at();
create trigger skills_updated_at before update on public.skills for each row execute procedure public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute procedure public.set_updated_at();
create trigger experiences_updated_at before update on public.experiences for each row execute procedure public.set_updated_at();
create trigger certificates_updated_at before update on public.certificates for each row execute procedure public.set_updated_at();
create trigger achievements_updated_at before update on public.achievements for each row execute procedure public.set_updated_at();
create trigger proof_links_updated_at before update on public.proof_links for each row execute procedure public.set_updated_at();
create trigger jobs_updated_at before update on public.jobs for each row execute procedure public.set_updated_at();
create trigger resumes_updated_at before update on public.resumes for each row execute procedure public.set_updated_at();
create trigger cover_letters_updated_at before update on public.cover_letters for each row execute procedure public.set_updated_at();
create trigger linkedin_about_updated_at before update on public.linkedin_about for each row execute procedure public.set_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute procedure public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();
create trigger app_settings_updated_at before update on public.app_settings for each row execute procedure public.set_updated_at();

-- Atomic approval transaction
create or replace function public.approve_order_and_update_plan(p_order_id text, p_admin_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_allowed_statuses text[] := array['created', 'pending', 'submitted'];
  v_invalid_statuses text[] := array['approved', 'rejected', 'cancelled', 'failed'];
begin
  select * into v_order from public.orders where id = p_order_id;
  
  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order.status = any(v_invalid_statuses) then
    raise exception 'Cannot approve order with status: %', v_order.status;
  end if;
  
  if not (v_order.status = any(v_allowed_statuses)) then
    raise exception 'Invalid order status: %', v_order.status;
  end if;

  if v_order.user_id is null then
    raise exception 'Order must belong to a user.';
  end if;

  if v_order.plan = any(array['pro', 'lifetime', 'college']) then
    update public.profiles
    set 
      plan = v_order.plan,
      plan_status = 'active',
      updated_at = now()
    where id = v_order.user_id;

    if not found then
      raise exception 'Profile for user % not found.', v_order.user_id;
    end if;
  end if;

  update public.orders
  set 
    status = 'approved',
    approved_at = now(),
    approved_by = p_admin_id,
    updated_at = now()
  where id = p_order_id;

  select * into v_order from public.orders where id = p_order_id;
  
  return to_jsonb(v_order);
end;
$$;

revoke execute on function public.approve_order_and_update_plan(text, uuid) from public, anon, authenticated;
grant execute on function public.approve_order_and_update_plan(text, uuid) to service_role;

insert into public.testimonials (name, role, college, quote, rating, public)
values
  ('Demo student', 'BCA final year student', 'Example College', 'Demo testimonial: replace this with a real student quote after launch.', 5, true),
  ('Demo placement lead', 'Training and placement coordinator', 'Example Institute', 'Demo testimonial: CareerPath-style reports can help placement teams spot proof gaps quickly.', 5, true)
on conflict do nothing;

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


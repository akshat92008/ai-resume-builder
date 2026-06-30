-- Agentic CareerPath AI: memory vault, proof-based resume documents,
-- application packs, tracker, and learning-loop insight storage.

alter table public.resumes
  add column if not exists profile_json jsonb default '{}'::jsonb,
  add column if not exists career_profile_json jsonb default '{}'::jsonb,
  add column if not exists resume_document_json jsonb default '{}'::jsonb,
  add column if not exists application_pack_json jsonb default '{}'::jsonb,
  add column if not exists applications_json jsonb default '[]'::jsonb,
  add column if not exists job_search_insights_json jsonb default '[]'::jsonb;

create table if not exists public.career_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.career_raw_inputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile_id uuid references public.career_profiles(id) on delete cascade,
  content text not null,
  source text,
  created_at timestamptz not null default now()
);

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

create table if not exists public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  raw_text text not null,
  extracted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.application_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  job_description_id uuid references public.job_descriptions(id) on delete cascade,
  resume_id uuid references public.resume_documents(id) on delete set null,
  pack jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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

create table if not exists public.job_search_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  insight jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.career_profiles enable row level security;
alter table public.career_raw_inputs enable row level security;
alter table public.resume_documents enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.application_packs enable row level security;
alter table public.job_applications enable row level security;
alter table public.job_search_insights enable row level security;

do $$ begin
  create policy "career profiles owner manage" on public.career_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "career raw inputs owner manage" on public.career_raw_inputs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "resume documents owner manage" on public.resume_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "job descriptions owner manage" on public.job_descriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "application packs owner manage" on public.application_packs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "job applications owner manage" on public.job_applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "job search insights owner manage" on public.job_search_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

create index if not exists idx_career_profiles_user_id on public.career_profiles(user_id);
create index if not exists idx_career_raw_inputs_profile_id on public.career_raw_inputs(profile_id);
create index if not exists idx_resume_documents_user_id on public.resume_documents(user_id);
create index if not exists idx_job_descriptions_user_id on public.job_descriptions(user_id);
create index if not exists idx_application_packs_user_id on public.application_packs(user_id);
create index if not exists idx_job_applications_user_status on public.job_applications(user_id, status);
create index if not exists idx_job_search_insights_user_id on public.job_search_insights(user_id);

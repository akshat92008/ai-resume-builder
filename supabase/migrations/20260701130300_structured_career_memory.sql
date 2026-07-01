-- Phase 1: Structured Career Memory (V1)
-- Moving away from monolithic profile_json to relational tables for "Store once -> Generate forever"

-- Enums
do $$
begin
  create type proof_level as enum ('verified', 'strong', 'estimated', 'weak', 'risky');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type skill_category as enum ('technical', 'soft', 'tool', 'language', 'domain');
exception
  when duplicate_object then null;
end $$;

-- Personal Profile
create table if not exists public.career_personal_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  full_name text,
  email text,
  phone text,
  website text,
  linkedin text,
  github text,
  portfolio text,
  location text,
  preferred_pronouns text,
  timezone text,
  nationality text,
  work_authorization text,
  visa_status text,
  languages text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Career Preferences
create table if not exists public.career_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  target_roles text[] not null default '{}',
  dream_role text,
  dream_companies text[] not null default '{}',
  target_salary text,
  target_industries text[] not null default '{}',
  target_locations text[] not null default '{}',
  preferred_countries text[] not null default '{}',
  work_preference text,
  remote boolean default false,
  hybrid boolean default false,
  relocation boolean default false,
  experience_level text,
  preferred_resume_length text default 'one_page',
  preferred_writing_tone text default 'professional',
  target_seniority text,
  template_preference text default 'ats',
  ats_preference text default 'balanced',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Career Education
create table if not exists public.career_education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  institution text not null,
  degree text,
  branch text,
  field_of_study text,
  start_date text,
  end_date text,
  grade text,
  location text,
  relevant_coursework text[] not null default '{}',
  thesis text,
  awards text[] not null default '{}',
  activities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Career Experience
create table if not exists public.career_experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  company text not null,
  role text not null,
  location text,
  start_date text,
  end_date text,
  is_current boolean default false,
  description text,
  responsibilities text[] not null default '{}',
  projects text[] not null default '{}',
  technologies text[] not null default '{}',
  metrics text[] not null default '{}',
  leadership text[] not null default '{}',
  business_impact text[] not null default '{}',
  documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Career Projects
create table if not exists public.career_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  problem text,
  solution text,
  role text,
  github_url text,
  live_demo_url text,
  screenshots text[] not null default '{}',
  architecture text,
  challenges text[] not null default '{}',
  learnings text[] not null default '{}',
  metrics text[] not null default '{}',
  tags text[] not null default '{}',
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Career Skills
create table if not exists public.career_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category skill_category not null default 'technical',
  subcategory text,
  proficiency text,
  evidence text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Career Certifications
create table if not exists public.career_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  issuer text,
  issue_date text,
  expiry_date text,
  credential_url text,
  skills text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Career Achievements
create table if not exists public.career_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  text text not null,
  metric text,
  context text,
  impact text,
  evidence text,
  proof_level proof_level default 'estimated',
  experience_id uuid references public.career_experience(id) on delete set null,
  project_id uuid references public.career_projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Career Documents
create table if not exists public.career_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  url text,
  notes text,
  created_at timestamptz not null default now()
);

-- Entity Links
create table if not exists public.career_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  label text not null,
  url text not null,
  type text,
  project_id uuid references public.career_projects(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Many-to-Many Linking Tables
create table if not exists public.career_experience_skills (
  experience_id uuid references public.career_experience(id) on delete cascade,
  skill_id uuid references public.career_skills(id) on delete cascade,
  primary key (experience_id, skill_id)
);

create table if not exists public.career_project_skills (
  project_id uuid references public.career_projects(id) on delete cascade,
  skill_id uuid references public.career_skills(id) on delete cascade,
  primary key (project_id, skill_id)
);

-- RLS Policies
alter table public.career_personal_profiles enable row level security;
alter table public.career_preferences enable row level security;
alter table public.career_education enable row level security;
alter table public.career_experience enable row level security;
alter table public.career_projects enable row level security;
alter table public.career_skills enable row level security;
alter table public.career_certifications enable row level security;
alter table public.career_achievements enable row level security;
alter table public.career_documents enable row level security;
alter table public.career_links enable row level security;
alter table public.career_experience_skills enable row level security;
alter table public.career_project_skills enable row level security;

create policy "Users can manage their own personal profile" on public.career_personal_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own preferences" on public.career_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own education" on public.career_education for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own experience" on public.career_experience for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own projects" on public.career_projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own skills" on public.career_skills for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own certifications" on public.career_certifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own achievements" on public.career_achievements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own documents" on public.career_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own links" on public.career_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can manage their experience skills" on public.career_experience_skills for all 
using (exists (select 1 from public.career_experience e where e.id = experience_id and e.user_id = auth.uid()))
with check (exists (select 1 from public.career_experience e where e.id = experience_id and e.user_id = auth.uid()));

create policy "Users can manage their project skills" on public.career_project_skills for all 
using (exists (select 1 from public.career_projects p where p.id = project_id and p.user_id = auth.uid()))
with check (exists (select 1 from public.career_projects p where p.id = project_id and p.user_id = auth.uid()));

-- Indexes
create index idx_career_personal_profiles_user_id on public.career_personal_profiles(user_id);
create index idx_career_education_user_id on public.career_education(user_id);
create index idx_career_experience_user_id on public.career_experience(user_id);
create index idx_career_projects_user_id on public.career_projects(user_id);
create index idx_career_skills_user_id on public.career_skills(user_id);
create index idx_career_certifications_user_id on public.career_certifications(user_id);
create index idx_career_achievements_user_id on public.career_achievements(user_id);
create index idx_career_documents_user_id on public.career_documents(user_id);
create index idx_career_links_user_id on public.career_links(user_id);

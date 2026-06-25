-- Run this script to fix profile privacy by creating a view and dropping the insecure RLS policy.

-- 1. Create a secure view for public profiles that only exposes safe fields
create or replace view public.public_profiles as
select 
  id, 
  full_name, 
  headline, 
  summary, 
  public_slug, 
  portfolio_public, 
  target_roles, 
  github_url, 
  linkedin_url, 
  portfolio_url, 
  city, 
  created_at, 
  updated_at
from public.profiles
where portfolio_public = true;

-- 2. Grant access to the view for authenticated and anonymous users
grant select on public.public_profiles to anon, authenticated;

-- 3. Drop the insecure RLS policy from the main profiles table
drop policy if exists "profiles public portfolio read" on public.profiles;

-- 4. Recreate public child views with only safe fields
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

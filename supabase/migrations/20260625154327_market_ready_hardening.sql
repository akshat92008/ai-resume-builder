-- Market ready hardening migration
-- Fix orders insert policy
drop policy if exists "orders owner insert" on public.orders;
create policy "orders owner insert" on public.orders for insert with check (auth.uid() = user_id);

-- Ensure proof_links has updated_at
alter table public.proof_links add column if not exists updated_at timestamptz default now();

-- Ensure trigger exists for proof_links updated_at
drop trigger if exists proof_links_updated_at on public.proof_links;
create trigger proof_links_updated_at before update on public.proof_links for each row execute procedure public.set_updated_at();

-- Recreate public_profiles view with only safe fields
drop view if exists public.public_profiles cascade;

create view public.public_profiles as
  select id, full_name, headline, summary, public_slug, portfolio_public, target_roles, github_url, linkedin_url, portfolio_url, city, created_at, updated_at
  from public.profiles
  where portfolio_public = true;

grant select on public.public_profiles to anon, authenticated;

-- Recreate public child views with only safe fields
create view public.public_education as
  select id, user_id, institution, degree, field, start_year, end_year, score, achievements, created_at, updated_at
  from public.education
  where user_id in (select id from public.public_profiles);

create view public.public_skills as
  select id, user_id, name, category, proficiency, proof_links, created_at, updated_at
  from public.skills
  where user_id in (select id from public.public_profiles);

create view public.public_projects as
  select id, user_id, title, short_description, problem_solved, tech_stack, features, impact, github_url, live_url, case_study_url, screenshots_url, status, tags, created_at, updated_at
  from public.projects
  where user_id in (select id from public.public_profiles);

create view public.public_experiences as
  select id, user_id, company, role, start_date, end_date, description, responsibilities, achievements, created_at, updated_at
  from public.experiences
  where user_id in (select id from public.public_profiles);

create view public.public_certificates as
  select id, user_id, title, issuer, issue_date, credential_url, created_at, updated_at
  from public.certificates
  where user_id in (select id from public.public_profiles);

create view public.public_achievements as
  select id, user_id, title, description, date, proof_url, category, created_at, updated_at
  from public.achievements
  where user_id in (select id from public.public_profiles);

create view public.public_proof_links as
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

-- Ensure broad anon read policies on private base tables are removed/absent
revoke select on public.profiles from anon;
revoke select on public.education from anon;
revoke select on public.skills from anon;
revoke select on public.projects from anon;
revoke select on public.experiences from anon;
revoke select on public.certificates from anon;
revoke select on public.achievements from anon;
revoke select on public.proof_links from anon;

alter table public.jobs add column if not exists style text;

drop policy if exists "profiles public portfolio read" on public.profiles;
drop policy if exists "education public read" on public.education;
drop policy if exists "skills public read" on public.skills;
drop policy if exists "projects public read" on public.projects;
drop policy if exists "experiences public read" on public.experiences;
drop policy if exists "certificates public read" on public.certificates;
drop policy if exists "achievements public read" on public.achievements;
drop policy if exists "proof links public read" on public.proof_links;

create or replace view public.public_profiles as
  select id, full_name, headline, summary, public_slug, portfolio_public, target_roles, github_url, linkedin_url, portfolio_url, city, created_at, updated_at
  from public.profiles
  where portfolio_public = true;

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
  select id, user_id, title, url, type, notes, created_at
  from public.proof_links
  where user_id in (select id from public.public_profiles);

grant select on public.public_profiles to anon, authenticated;
grant select on public.public_education to anon, authenticated;
grant select on public.public_skills to anon, authenticated;
grant select on public.public_projects to anon, authenticated;
grant select on public.public_experiences to anon, authenticated;
grant select on public.public_certificates to anon, authenticated;
grant select on public.public_achievements to anon, authenticated;
grant select on public.public_proof_links to anon, authenticated;

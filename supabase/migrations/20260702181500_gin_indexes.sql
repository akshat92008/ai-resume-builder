-- Add extension if not exists
create extension if not exists btree_gin;

-- Add GIN indexes to career_skills for full-text and array search performance
-- (career_skills table does not exist, skills are in career_profiles jsonb)
-- create index if not exists idx_career_skills_programming_gin on public.career_skills using gin (programming);
-- create index if not exists idx_career_skills_frameworks_gin on public.career_skills using gin (frameworks);
-- create index if not exists idx_career_skills_tools_gin on public.career_skills using gin (tools);
-- create index if not exists idx_career_skills_databases_gin on public.career_skills using gin (databases);

-- Enable Supabase Realtime for the required tables for Chrome Extension sync
alter publication supabase_realtime add table public.career_profiles;
-- (career_resumes does not exist, the table is called resumes or resume_documents)
-- alter publication supabase_realtime add table public.career_resumes;

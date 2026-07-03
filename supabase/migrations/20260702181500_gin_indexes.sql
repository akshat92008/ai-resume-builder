-- Add extension if not exists
create extension if not exists btree_gin;

-- Add GIN indexes to career_skills for full-text and array search performance
create index if not exists idx_career_skills_programming_gin on public.career_skills using gin (programming);
create index if not exists idx_career_skills_frameworks_gin on public.career_skills using gin (frameworks);
create index if not exists idx_career_skills_tools_gin on public.career_skills using gin (tools);
create index if not exists idx_career_skills_databases_gin on public.career_skills using gin (databases);

-- Enable Supabase Realtime for the required tables for Chrome Extension sync
alter publication supabase_realtime add table public.career_profiles;
alter publication supabase_realtime add table public.career_resumes;

-- Add tailoring_json to resumes
alter table public.resumes
  add column if not exists tailoring_json jsonb default '{}'::jsonb;

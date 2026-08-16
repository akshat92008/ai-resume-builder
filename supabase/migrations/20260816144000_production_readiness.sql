-- CareerOS production-readiness persistence and attribution hardening.
alter table public.resumes add column if not exists differentiation_json jsonb not null default '{}'::jsonb;
alter table public.job_applications add column if not exists career_resume_id uuid references public.resumes(id) on delete set null, add column if not exists resume_version integer;
create index if not exists idx_job_applications_user_resume_status on public.job_applications(user_id, career_resume_id, status);

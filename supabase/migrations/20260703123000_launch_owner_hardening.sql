-- Launch hardening: ownership must be present and hot owner queries need narrow indexes.

delete from public.resumes where user_id is null;
alter table public.resumes
  alter column user_id set not null;

delete from public.job_applications where user_id is null;
alter table public.job_applications
  alter column user_id set not null;

delete from public.job_descriptions where user_id is null;
alter table public.job_descriptions
  alter column user_id set not null;

delete from public.application_packs where user_id is null;
alter table public.application_packs
  alter column user_id set not null;

create index if not exists idx_resumes_user_updated_at
  on public.resumes(user_id, updated_at desc);

create index if not exists idx_job_applications_user_updated_at
  on public.job_applications(user_id, updated_at desc);

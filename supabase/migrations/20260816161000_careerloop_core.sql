-- CareerLoop core: outcome attribution for the closed-loop conversion engine.
alter table public.job_applications
  add column if not exists source text,
  add column if not exists fit_score integer,
  add column if not exists fit_recommendation text;

do $$ begin
  alter table public.job_applications add constraint job_applications_source_check
    check (source is null or source in ('company_site','linkedin','indeed','glassdoor','other'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.job_applications add constraint job_applications_fit_score_check
    check (fit_score is null or (fit_score >= 0 and fit_score <= 100));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.job_applications add constraint job_applications_fit_recommendation_check
    check (fit_recommendation is null or fit_recommendation in ('apply','consider','skip'));
exception when duplicate_object then null; end $$;

create index if not exists idx_job_applications_user_source_status
  on public.job_applications(user_id, source, status);
create index if not exists idx_job_applications_user_fit_status
  on public.job_applications(user_id, fit_score, status);
create index if not exists idx_job_applications_user_resume_version
  on public.job_applications(user_id, career_resume_id, resume_version);

-- Cover composite tenant foreign keys so deletes/joins remain efficient.
create index if not exists idx_application_packs_tenant_job_description
  on public.application_packs(user_id, job_description_id);
create index if not exists idx_application_packs_tenant_resume
  on public.application_packs(user_id, resume_id);
create index if not exists idx_job_applications_tenant_job_description
  on public.job_applications(user_id, job_description_id);
create index if not exists idx_job_applications_tenant_legacy_resume
  on public.job_applications(user_id, resume_id);
create index if not exists idx_job_applications_tenant_application_pack
  on public.job_applications(user_id, application_pack_id);

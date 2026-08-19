-- Enforce same-tenant ownership for cross-entity references.
-- Composite foreign keys make relationship integrity independent of application/RLS bugs.

create unique index if not exists uq_resumes_user_id_id
  on public.resumes(user_id, id);
create unique index if not exists uq_job_descriptions_user_id_id
  on public.job_descriptions(user_id, id);
create unique index if not exists uq_application_packs_user_id_id
  on public.application_packs(user_id, id);
create unique index if not exists uq_resume_documents_user_id_id
  on public.resume_documents(user_id, id);

-- Validate current data before installing constraints. Fail the migration instead
-- of silently rewriting or deleting tenant-inconsistent rows.
do $$
begin
  if exists (
    select 1 from public.job_applications ja
    join public.resumes r on r.id = ja.career_resume_id
    where ja.career_resume_id is not null and ja.user_id is distinct from r.user_id
  ) then
    raise exception 'tenant integrity violation: job_applications.career_resume_id';
  end if;

  if exists (
    select 1 from public.job_applications ja
    join public.job_descriptions jd on jd.id = ja.job_description_id
    where ja.job_description_id is not null and ja.user_id is distinct from jd.user_id
  ) then
    raise exception 'tenant integrity violation: job_applications.job_description_id';
  end if;

  if exists (
    select 1 from public.job_applications ja
    join public.application_packs ap on ap.id = ja.application_pack_id
    where ja.application_pack_id is not null and ja.user_id is distinct from ap.user_id
  ) then
    raise exception 'tenant integrity violation: job_applications.application_pack_id';
  end if;

  if exists (
    select 1 from public.application_packs ap
    join public.job_descriptions jd on jd.id = ap.job_description_id
    where ap.job_description_id is not null and ap.user_id is distinct from jd.user_id
  ) then
    raise exception 'tenant integrity violation: application_packs.job_description_id';
  end if;

  if exists (
    select 1 from public.application_packs ap
    join public.resume_documents rd on rd.id = ap.resume_id
    where ap.resume_id is not null and ap.user_id is distinct from rd.user_id
  ) then
    raise exception 'tenant integrity violation: application_packs.resume_id';
  end if;
end $$;

alter table public.job_applications
  drop constraint if exists job_applications_career_resume_id_fkey,
  drop constraint if exists job_applications_job_description_id_fkey,
  drop constraint if exists job_applications_application_pack_id_fkey;

alter table public.job_applications
  add constraint job_applications_tenant_career_resume_fkey
    foreign key (user_id, career_resume_id)
    references public.resumes(user_id, id) on delete set null,
  add constraint job_applications_tenant_job_description_fkey
    foreign key (user_id, job_description_id)
    references public.job_descriptions(user_id, id) on delete set null,
  add constraint job_applications_tenant_application_pack_fkey
    foreign key (user_id, application_pack_id)
    references public.application_packs(user_id, id) on delete set null;

alter table public.application_packs
  drop constraint if exists application_packs_job_description_id_fkey,
  drop constraint if exists application_packs_resume_id_fkey;

alter table public.application_packs
  add constraint application_packs_tenant_job_description_fkey
    foreign key (user_id, job_description_id)
    references public.job_descriptions(user_id, id) on delete cascade,
  add constraint application_packs_tenant_resume_fkey
    foreign key (user_id, resume_id)
    references public.resume_documents(user_id, id) on delete set null;

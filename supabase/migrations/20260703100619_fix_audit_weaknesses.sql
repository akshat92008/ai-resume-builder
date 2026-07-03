-- 1. Add GIN Indexes for heavily queried JSONB columns to resolve scalability bottlenecks
create index if not exists idx_profiles_personal_gin on public.profiles using gin (personal_json);
create index if not exists idx_profiles_education_gin on public.profiles using gin (education_json);
create index if not exists idx_profiles_experience_gin on public.profiles using gin (experience_json);
create index if not exists idx_profiles_skills_gin on public.profiles using gin (skills_json);
create index if not exists idx_profiles_projects_gin on public.profiles using gin (projects_json);

create index if not exists idx_resumes_content_gin on public.resumes using gin (content_json);
create index if not exists idx_resumes_audit_gin on public.resumes using gin (audit_json);

-- 2. Fix Slug Generation Collision Bug
-- Update the handle_new_user function to use a more robust random string instead of a small slice of ID.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, public_slug, referral_code)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    trim(trailing '-' from lower(regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

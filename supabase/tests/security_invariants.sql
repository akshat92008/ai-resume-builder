begin;

select plan(14);

select ok(
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'profiles'), false),
  'profiles has RLS enabled'
);
select ok(
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'resumes'), false),
  'resumes has RLS enabled'
);
select ok(
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'resume_messages'), false),
  'resume_messages has RLS enabled'
);
select ok(
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'resume_versions'), false),
  'resume_versions has RLS enabled'
);
select ok(
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'job_applications'), false),
  'job_applications has RLS enabled'
);
select ok(
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'job_descriptions'), false),
  'job_descriptions has RLS enabled'
);
select ok(
  coalesce((select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'application_packs'), false),
  'application_packs has RLS enabled'
);

select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'), 'profiles has at least one RLS policy');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'resumes'), 'resumes has at least one RLS policy');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'resume_messages'), 'resume_messages has at least one RLS policy');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'resume_versions'), 'resume_versions has at least one RLS policy');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'job_applications'), 'job_applications has at least one RLS policy');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'job_descriptions'), 'job_descriptions has at least one RLS policy');
select ok(exists(select 1 from pg_policies where schemaname = 'public' and tablename = 'application_packs'), 'application_packs has at least one RLS policy');

select * from finish();
rollback;

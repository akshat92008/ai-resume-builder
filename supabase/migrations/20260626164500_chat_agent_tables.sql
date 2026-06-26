-- CareerPath AI: Chat-first agent tables
-- Adds resume_messages and resume_versions for the unified agent workspace.

-- ---------------------------------------------------------------------------
-- Resume Messages
-- ---------------------------------------------------------------------------

create table if not exists public.resume_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  intent text,
  created_at timestamptz default now()
);

alter table public.resume_messages enable row level security;

create policy "messages owner manage" on public.resume_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_resume_messages_lookup
  on public.resume_messages(user_id, resume_id, created_at);

-- ---------------------------------------------------------------------------
-- Resume Versions
-- ---------------------------------------------------------------------------

create table if not exists public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  version_name text,
  resume_json jsonb not null,
  reason text,
  created_at timestamptz default now()
);

alter table public.resume_versions enable row level security;

create policy "versions owner manage" on public.resume_versions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_resume_versions_lookup
  on public.resume_versions(user_id, resume_id, created_at);

-- ---------------------------------------------------------------------------
-- Better index on resumes for user workspace queries
-- ---------------------------------------------------------------------------

create index if not exists idx_resumes_user_updated
  on public.resumes(user_id, updated_at desc);

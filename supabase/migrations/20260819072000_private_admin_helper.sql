-- Keep the SECURITY DEFINER helper required to avoid recursive profile RLS,
-- but move it out of the exposed public API schema.

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "profiles admin manage" on public.profiles;
create policy "profiles admin manage"
  on public.profiles
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

drop policy if exists "usage events admin manage" on public.usage_events;
create policy "usage events admin manage"
  on public.usage_events
  for all
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

revoke all on function public.is_admin() from public, anon, authenticated;
drop function if exists public.is_admin();

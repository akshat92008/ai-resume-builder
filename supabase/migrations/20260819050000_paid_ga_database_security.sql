-- Paid GA database security tightening.
-- Keep trigger search paths fixed and remove unnecessary public access to
-- SECURITY DEFINER helper functions.

alter function public.set_updated_at() set search_path = public, pg_temp;

-- Admin policies should only be evaluated for authenticated users.
drop policy if exists "profiles admin manage" on public.profiles;
create policy "profiles admin manage"
  on public.profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "usage events admin manage" on public.usage_events;
create policy "usage events admin manage"
  on public.usage_events
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- Not referenced by application/RLS code; keep backend-only rather than
-- exposing a SECURITY DEFINER RPC to browser clients.
revoke execute on function public.is_public_profile(uuid) from public, anon, authenticated;
grant execute on function public.is_public_profile(uuid) to service_role;

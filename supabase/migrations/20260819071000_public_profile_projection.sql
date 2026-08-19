-- Replace the SECURITY DEFINER public_profiles view with a dedicated projection
-- containing only fields that are explicitly safe for public portfolio display.
-- This avoids granting anonymous readers access to private columns in profiles.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.public_profile_cards (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text,
  headline text,
  summary text,
  public_slug text,
  portfolio_public boolean not null default true,
  target_roles text[],
  github_url text,
  linkedin_url text,
  portfolio_url text,
  city text,
  created_at timestamptz,
  updated_at timestamptz
);

alter table public.public_profile_cards enable row level security;

revoke all on public.public_profile_cards from public, anon, authenticated;
grant select on public.public_profile_cards to anon, authenticated;

drop policy if exists "Public portfolio cards are readable" on public.public_profile_cards;
create policy "Public portfolio cards are readable"
  on public.public_profile_cards
  for select
  to anon, authenticated
  using (portfolio_public = true);

create index if not exists idx_public_profile_cards_slug
  on public.public_profile_cards(public_slug)
  where public_slug is not null and portfolio_public = true;

create or replace function private.sync_public_profile_card()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.public_profile_cards where id = old.id;
    return old;
  end if;

  if coalesce(new.portfolio_public, false) is false then
    delete from public.public_profile_cards where id = new.id;
    return new;
  end if;

  insert into public.public_profile_cards (
    id, full_name, headline, summary, public_slug, portfolio_public,
    target_roles, github_url, linkedin_url, portfolio_url, city,
    created_at, updated_at
  ) values (
    new.id, new.full_name, new.headline, new.summary, new.public_slug, true,
    new.target_roles, new.github_url, new.linkedin_url, new.portfolio_url, new.city,
    new.created_at, new.updated_at
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    headline = excluded.headline,
    summary = excluded.summary,
    public_slug = excluded.public_slug,
    portfolio_public = true,
    target_roles = excluded.target_roles,
    github_url = excluded.github_url,
    linkedin_url = excluded.linkedin_url,
    portfolio_url = excluded.portfolio_url,
    city = excluded.city,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  return new;
end;
$$;

revoke all on function private.sync_public_profile_card() from public, anon, authenticated;

drop trigger if exists sync_public_profile_card_trigger on public.profiles;
create trigger sync_public_profile_card_trigger
after insert or update of full_name, headline, summary, public_slug, portfolio_public,
  target_roles, github_url, linkedin_url, portfolio_url, city, created_at, updated_at
or delete on public.profiles
for each row execute function private.sync_public_profile_card();

insert into public.public_profile_cards (
  id, full_name, headline, summary, public_slug, portfolio_public,
  target_roles, github_url, linkedin_url, portfolio_url, city,
  created_at, updated_at
)
select
  id, full_name, headline, summary, public_slug, true,
  target_roles, github_url, linkedin_url, portfolio_url, city,
  created_at, updated_at
from public.profiles
where portfolio_public = true
on conflict (id) do update set
  full_name = excluded.full_name,
  headline = excluded.headline,
  summary = excluded.summary,
  public_slug = excluded.public_slug,
  portfolio_public = true,
  target_roles = excluded.target_roles,
  github_url = excluded.github_url,
  linkedin_url = excluded.linkedin_url,
  portfolio_url = excluded.portfolio_url,
  city = excluded.city,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

-- Remove any card that should no longer be public before swapping the view.
delete from public.public_profile_cards c
where not exists (
  select 1 from public.profiles p
  where p.id = c.id and p.portfolio_public = true
);

drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = true)
as
select
  id,
  full_name,
  headline,
  summary,
  public_slug,
  portfolio_public,
  target_roles,
  github_url,
  linkedin_url,
  portfolio_url,
  city,
  created_at,
  updated_at
from public.public_profile_cards
where portfolio_public = true;

revoke all on public.public_profiles from public;
grant select on public.public_profiles to anon, authenticated;

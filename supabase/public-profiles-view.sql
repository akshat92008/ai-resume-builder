-- Run this script to fix profile privacy by creating a view and dropping the insecure RLS policy.

-- 1. Create a secure view for public profiles that only exposes safe fields
create or replace view public.public_profiles as
select 
  id, 
  full_name, 
  city, 
  linkedin_url, 
  github_url, 
  portfolio_url, 
  headline, 
  summary, 
  public_slug, 
  portfolio_public
from public.profiles
where portfolio_public = true;

-- 2. Grant access to the view for authenticated and anonymous users
grant select on public.public_profiles to anon, authenticated;

-- 3. Drop the insecure RLS policy from the main profiles table
drop policy if exists "profiles public portfolio read" on public.profiles;

-- Run this script to fix profile privacy by creating a view and dropping the insecure RLS policy.

-- 1. Create a secure view for public profiles that only exposes safe fields
create or replace view public.public_profiles as
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
from public.profiles
where portfolio_public = true;

-- 2. Grant access to the view for authenticated and anonymous users
grant select on public.public_profiles to anon, authenticated;

-- 3. Drop the insecure RLS policy from the main profiles table
drop policy if exists "profiles public portfolio read" on public.profiles;

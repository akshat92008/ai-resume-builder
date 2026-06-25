-- Migration: protect_profile_privileged_fields

-- 1. Create function to protect privileged profile fields
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If the user is updating their own profile and they are not an admin
  IF auth.uid() = OLD.id AND OLD.role != 'admin' THEN
    -- Force privileged fields to retain their old values
    NEW.role = OLD.role;
    NEW.plan = OLD.plan;
    NEW.plan_status = OLD.plan_status;
    NEW.pro_until = OLD.pro_until;
    NEW.referral_code = OLD.referral_code;
    NEW.referred_by = OLD.referred_by;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Revoke execute permissions from public roles to ensure safety
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_fields() FROM anon;
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_fields() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profile_privileged_fields() TO service_role;

-- 2. Create the trigger on public.profiles
DROP TRIGGER IF EXISTS protect_profile_privileged_fields_trigger ON public.profiles;
CREATE TRIGGER protect_profile_privileged_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- 3. Fix duplicate public slug generation in handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, public_slug, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    TRIM(TRAILING '-' FROM LOWER(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)), '[^a-zA-Z0-9]+', '-', 'g'))) || '-' || SUBSTR(REPLACE(NEW.id::text, '-', ''), 1, 6),
    UPPER(SUBSTR(REPLACE(NEW.id::text, '-', ''), 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- 4. Ensure orders user_id is not null
ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL;

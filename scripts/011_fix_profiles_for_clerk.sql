-- IMPORTANT: This migration fixes the profiles table to work with Clerk
-- It removes the foreign key constraint to auth.users since we're using Clerk

-- 1. Drop the foreign key constraint to auth.users (if it exists)
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 2. Ensure id column has a default UUID generator
ALTER TABLE public.profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Ensure the clerk_id column exists and has proper constraints
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS clerk_id text UNIQUE;

-- 4. Create index for clerk_id if it doesn't exist
CREATE INDEX IF NOT EXISTS profiles_clerk_id_idx 
ON public.profiles(clerk_id);

-- 5. Ensure token generation works
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 6. Update the token generation trigger to work properly
CREATE OR REPLACE FUNCTION set_profile_token()
RETURNS trigger AS $$
BEGIN
  IF new.token IS NULL THEN
    new.token = encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- 7. Ensure trigger exists for token generation
DROP TRIGGER IF EXISTS set_profile_token_trigger ON public.profiles;
CREATE TRIGGER set_profile_token_trigger
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION set_profile_token();

-- 8. Update RLS policies to be more permissive for Clerk-based auth
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_clerk" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_clerk" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_clerk" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_clerk" ON public.profiles;

-- Create new permissive policies (authentication is handled by Clerk at app level)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_all" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "profiles_update_all" ON public.profiles
  FOR UPDATE USING (true);

CREATE POLICY "profiles_delete_all" ON public.profiles
  FOR DELETE USING (true);

-- 9. Grant necessary permissions
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO authenticated;

-- Verify the table structure
-- After running this, profiles table should:
-- - Have no FK to auth.users
-- - Have clerk_id column for Clerk user IDs
-- - Auto-generate UUIDs for id column
-- - Auto-generate tokens on insert
-- - Allow operations from the application

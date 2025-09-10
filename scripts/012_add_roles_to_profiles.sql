-- Add role-based access control to profiles table
-- This migration adds a 'role' column with proper constraints and indexes

-- 1. Add role column with enum-like constraints
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- 2. Create index for role lookups
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- 3. Create function to prevent super admin deletion
CREATE OR REPLACE FUNCTION prevent_super_admin_deletion()
RETURNS trigger AS $$
BEGIN
  -- Prevent deletion of super admin users
  IF OLD.role = 'super_admin' THEN
    RAISE EXCEPTION 'Super admin users cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to prevent super admin deletion
DROP TRIGGER IF EXISTS prevent_super_admin_deletion_trigger ON public.profiles;
CREATE TRIGGER prevent_super_admin_deletion_trigger
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_super_admin_deletion();

-- 5. Create function to prevent super admin role change
CREATE OR REPLACE FUNCTION protect_super_admin_role()
RETURNS trigger AS $$
BEGIN
  -- Prevent changing super admin role to something else
  -- Only allow super admins to change their own non-critical fields
  IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
    RAISE EXCEPTION 'Super admin role cannot be changed';
  END IF;
  
  -- Prevent regular users from escalating to super admin
  IF OLD.role != 'super_admin' AND NEW.role = 'super_admin' THEN
    RAISE EXCEPTION 'Cannot escalate to super admin role';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to protect super admin role
DROP TRIGGER IF EXISTS protect_super_admin_role_trigger ON public.profiles;
CREATE TRIGGER protect_super_admin_role_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION protect_super_admin_role();

-- 7. Update the profile creation function to handle roles
CREATE OR REPLACE FUNCTION public.create_profile_for_clerk_user(
  clerk_user_id text,
  user_email text,
  user_username text default null,
  user_gender text default null,
  user_age integer default null,
  user_role text default 'user'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
begin
  -- Generate a new UUID for the profile
  profile_id := gen_random_uuid();
  
  -- Validate role
  IF user_role NOT IN ('user', 'admin', 'super_admin') THEN
    user_role := 'user';
  END IF;
  
  insert into public.profiles (
    id,
    clerk_id,
    username,
    email,
    gender,
    age,
    points,
    role,
    token
  )
  values (
    profile_id,
    clerk_user_id,
    coalesce(user_username, 'user_' || substr(clerk_user_id, 1, 8)),
    user_email,
    user_gender,
    user_age,
    1000,
    user_role,
    encode(gen_random_bytes(32), 'hex')
  )
  on conflict (clerk_id) do nothing;

  return profile_id;
end;
$$;

-- 8. Grant necessary permissions for role-based queries
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.profiles TO authenticated;

-- Note: After running this migration, you should manually set the super admin user:
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'your-super-admin-email@domain.com';

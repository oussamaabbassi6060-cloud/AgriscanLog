-- Fix the scans table to work with Clerk authentication
-- Remove the foreign key constraint to auth.users since we're using Clerk

-- 1. Drop the foreign key constraint
ALTER TABLE public.scans 
DROP CONSTRAINT IF EXISTS scans_user_id_fkey;

-- 2. Add a foreign key constraint to profiles instead
-- (since profiles table is where we store the mapping between clerk_id and our internal UUID)
ALTER TABLE public.scans 
ADD CONSTRAINT scans_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Verify the table structure
-- The scans table should now reference profiles(id) instead of auth.users(id)
-- This allows us to use the UUID from the profiles table as the user_id

COMMENT ON CONSTRAINT scans_user_id_fkey ON public.scans IS 
'References profiles table which maps Clerk users to internal UUIDs';

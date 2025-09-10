-- Fix RLS policies for teams tables to work with Clerk authentication
-- Since we're using Clerk for auth, we handle authorization in the API layer
-- and make RLS policies permissive

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;

-- Create permissive policies for teams table
CREATE POLICY "teams_select_policy" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "teams_insert_policy" ON public.teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "teams_update_policy" ON public.teams
  FOR UPDATE USING (true);

CREATE POLICY "teams_delete_policy" ON public.teams
  FOR DELETE USING (true);

-- Create policies for team_members table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
    DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
    DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
    DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
    
    -- Create permissive policies
    CREATE POLICY "team_members_select_policy" ON public.team_members
      FOR SELECT USING (true);
    
    CREATE POLICY "team_members_insert_policy" ON public.team_members
      FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "team_members_update_policy" ON public.team_members
      FOR UPDATE USING (true);
    
    CREATE POLICY "team_members_delete_policy" ON public.team_members
      FOR DELETE USING (true);
  END IF;
END $$;

-- Create policies for team_api_keys table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_api_keys') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "team_api_keys_select_policy" ON public.team_api_keys;
    DROP POLICY IF EXISTS "team_api_keys_insert_policy" ON public.team_api_keys;
    DROP POLICY IF EXISTS "team_api_keys_update_policy" ON public.team_api_keys;
    DROP POLICY IF EXISTS "team_api_keys_delete_policy" ON public.team_api_keys;
    
    -- Create permissive policies
    CREATE POLICY "team_api_keys_select_policy" ON public.team_api_keys
      FOR SELECT USING (true);
    
    CREATE POLICY "team_api_keys_insert_policy" ON public.team_api_keys
      FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "team_api_keys_update_policy" ON public.team_api_keys
      FOR UPDATE USING (true);
    
    CREATE POLICY "team_api_keys_delete_policy" ON public.team_api_keys
      FOR DELETE USING (true);
  END IF;
END $$;

-- Create policies for team_invitations table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_invitations') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "team_invitations_select_policy" ON public.team_invitations;
    DROP POLICY IF EXISTS "team_invitations_insert_policy" ON public.team_invitations;
    DROP POLICY IF EXISTS "team_invitations_update_policy" ON public.team_invitations;
    DROP POLICY IF EXISTS "team_invitations_delete_policy" ON public.team_invitations;
    
    -- Create permissive policies
    CREATE POLICY "team_invitations_select_policy" ON public.team_invitations
      FOR SELECT USING (true);
    
    CREATE POLICY "team_invitations_insert_policy" ON public.team_invitations
      FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "team_invitations_update_policy" ON public.team_invitations
      FOR UPDATE USING (true);
    
    CREATE POLICY "team_invitations_delete_policy" ON public.team_invitations
      FOR DELETE USING (true);
  END IF;
END $$;

-- Create policies for team_activities table if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_activities') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "team_activities_select_policy" ON public.team_activities;
    DROP POLICY IF EXISTS "team_activities_insert_policy" ON public.team_activities;
    DROP POLICY IF EXISTS "team_activities_update_policy" ON public.team_activities;
    DROP POLICY IF EXISTS "team_activities_delete_policy" ON public.team_activities;
    
    -- Create permissive policies
    CREATE POLICY "team_activities_select_policy" ON public.team_activities
      FOR SELECT USING (true);
    
    CREATE POLICY "team_activities_insert_policy" ON public.team_activities
      FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "team_activities_update_policy" ON public.team_activities
      FOR UPDATE USING (true);
    
    CREATE POLICY "team_activities_delete_policy" ON public.team_activities
      FOR DELETE USING (true);
  END IF;
END $$;

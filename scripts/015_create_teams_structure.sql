-- Create comprehensive team management structure
-- This migration creates tables for teams, team members, team API keys, and invitations

-- 1. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}'
);

-- 2. Create team_members table with roles
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{}',
  UNIQUE(team_id, user_id)
);

-- 3. Create team_api_keys table for shared API keys
CREATE TABLE IF NOT EXISTS public.team_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  api_key text NOT NULL UNIQUE,
  api_provider text NOT NULL, -- e.g., 'openai', 'anthropic', 'google'
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_used_at timestamp with time zone,
  last_used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  usage_count integer DEFAULT 0,
  usage_limit integer, -- NULL means unlimited
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'
);

-- 4. Create team_invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email text,
  invitation_code text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
  accepted_at timestamp with time zone,
  accepted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_used boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'
);

-- 5. Create team_activities table for audit logging
CREATE TABLE IF NOT EXISTS public.team_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text, -- 'member', 'api_key', 'settings', etc.
  entity_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Add team_id to profiles for default team association
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_api_keys_team_id ON public.team_api_keys(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_code ON public.team_invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_team_activities_team_id ON public.team_activities(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_default_team ON public.profiles(default_team_id);

-- 8. Create function to automatically create owner membership when team is created
CREATE OR REPLACE FUNCTION create_team_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NEW.created_by);
  
  -- Log the activity
  INSERT INTO public.team_activities (team_id, user_id, action, entity_type, details)
  VALUES (NEW.id, NEW.created_by, 'team_created', 'team', 
    jsonb_build_object('team_name', NEW.name));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_team_owner_trigger
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION create_team_owner_membership();

-- 9. Create function to log team member changes
CREATE OR REPLACE FUNCTION log_team_member_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.team_activities (team_id, user_id, action, entity_type, entity_id, details)
    VALUES (NEW.team_id, NEW.invited_by, 'member_added', 'member', NEW.user_id,
      jsonb_build_object('role', NEW.role));
  ELSIF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    INSERT INTO public.team_activities (team_id, user_id, action, entity_type, entity_id, details)
    VALUES (NEW.team_id, NEW.invited_by, 'member_role_changed', 'member', NEW.user_id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.team_activities (team_id, user_id, action, entity_type, entity_id, details)
    VALUES (OLD.team_id, OLD.invited_by, 'member_removed', 'member', OLD.user_id,
      jsonb_build_object('role', OLD.role));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_member_activity_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION log_team_member_activity();

-- 10. Create function to check team member permissions
CREATE OR REPLACE FUNCTION check_team_permission(
  p_user_id uuid,
  p_team_id uuid,
  p_permission text
)
RETURNS boolean AS $$
DECLARE
  user_role text;
  user_permissions jsonb;
BEGIN
  -- Get user's role and permissions in the team
  SELECT role, permissions INTO user_role, user_permissions
  FROM public.team_members
  WHERE user_id = p_user_id AND team_id = p_team_id AND is_active = true;
  
  -- If user is not a member, check if they're a super admin
  IF user_role IS NULL THEN
    SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
    RETURN user_role = 'super_admin';
  END IF;
  
  -- Owners have all permissions
  IF user_role = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Admins have most permissions
  IF user_role = 'admin' THEN
    RETURN p_permission != 'delete_team' AND p_permission != 'transfer_ownership';
  END IF;
  
  -- Check specific permissions for members and viewers
  IF user_permissions ? p_permission THEN
    RETURN (user_permissions->p_permission)::boolean;
  END IF;
  
  -- Default permissions based on role
  CASE user_role
    WHEN 'member' THEN
      RETURN p_permission IN ('view_team', 'use_api_keys', 'view_members');
    WHEN 'viewer' THEN
      RETURN p_permission = 'view_team';
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 11. Create view for team member details
CREATE OR REPLACE VIEW public.team_member_details AS
SELECT 
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.role,
  tm.joined_at,
  tm.is_active,
  p.username,
  p.email,
  p.role as global_role,
  t.name as team_name,
  inviter.username as invited_by_username
FROM public.team_members tm
JOIN public.profiles p ON tm.user_id = p.id
JOIN public.teams t ON tm.team_id = t.id
LEFT JOIN public.profiles inviter ON tm.invited_by = inviter.id;

-- 12. Enable RLS on all team tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_activities ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for teams table
-- Since we're using Clerk auth, we'll make these policies permissive
-- and handle authorization in the API layer
CREATE POLICY "teams_select_policy" ON public.teams
  FOR SELECT USING (true);

CREATE POLICY "teams_insert_policy" ON public.teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "teams_update_policy" ON public.teams
  FOR UPDATE USING (true);

CREATE POLICY "teams_delete_policy" ON public.teams
  FOR DELETE USING (true);

-- 14. Grant necessary permissions
GRANT SELECT ON public.teams TO anon;
GRANT ALL ON public.teams TO authenticated;
GRANT SELECT ON public.team_members TO anon;
GRANT ALL ON public.team_members TO authenticated;
GRANT SELECT ON public.team_api_keys TO anon;
GRANT ALL ON public.team_api_keys TO authenticated;
GRANT SELECT ON public.team_invitations TO anon;
GRANT ALL ON public.team_invitations TO authenticated;
GRANT SELECT ON public.team_activities TO anon;
GRANT ALL ON public.team_activities TO authenticated;
GRANT SELECT ON public.team_member_details TO anon;
GRANT SELECT ON public.team_member_details TO authenticated;

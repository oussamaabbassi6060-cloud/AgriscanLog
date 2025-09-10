-- Temporarily disable RLS on team tables for testing
-- WARNING: Only use this for development/testing!

ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_activities DISABLE ROW LEVEL SECURITY;

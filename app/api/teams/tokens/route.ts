import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// Helper function to partially mask token
function maskToken(token: string): string {
  if (!token || token.length <= 8) return '***';
  return token.substring(0, 6) + '...' + token.substring(token.length - 4);
}

// GET /api/teams/tokens - Get team member AgriScan tokens
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const showFull = searchParams.get('showFull') === 'true';

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has permission to view team tokens
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: profile.id,
        p_team_id: teamId,
        p_permission: 'view_members'
      });

    if (!permission && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get team members with their tokens from profiles
    const { data: teamMembers, error } = await supabase
      .from('team_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        is_active,
        profile:profiles!team_members_user_id_fkey(
          id,
          username,
          email,
          token,
          points,
          created_at,
          role:role
        )
      `)
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching team member tokens:', error);
      return NextResponse.json({ error: 'Failed to fetch team member tokens' }, { status: 500 });
    }

    // Process tokens - all team members can view full tokens for sharing
    // This allows teams to share their AgriScan API tokens with each other
    const isTeamMember = teamMembers?.some(m => m.user_id === profile.id);
    const canViewFullTokens = profile.role === 'super_admin' || isTeamMember;

    // Filter out super admin members unless the current user is a super admin
    const filteredMembers = profile.role === 'super_admin' 
      ? teamMembers 
      : teamMembers?.filter(member => member.profile?.role !== 'super_admin');

    const processedMembers = filteredMembers?.map(member => ({
      id: member.id,
      user_id: member.user_id,
      team_role: member.role,
      joined_at: member.joined_at,
      username: member.profile?.username || 'Unknown',
      email: member.profile?.email || 'N/A',
      user_role: member.profile?.role || 'user',
      points: member.profile?.points || 0,
      token: {
        value: canViewFullTokens && showFull ? member.profile?.token : maskToken(member.profile?.token || ''),
        masked: !(canViewFullTokens && showFull),
        exists: !!member.profile?.token
      }
    })) || [];

    return NextResponse.json({ 
      tokens: processedMembers,
      canViewFull: canViewFullTokens 
    });
  } catch (error) {
    console.error('Error in GET /api/teams/tokens:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

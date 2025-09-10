import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/teams/members - Get team members
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

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

    // Check if user has permission to view team members
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: profile.id,
        p_team_id: teamId,
        p_permission: 'view_members'
      });

    if (!permission && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get team members with details
    const { data: members, error } = await supabase
      .from('team_member_details')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error in GET /api/teams/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teams/members - Add a member to a team
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, userEmail, role = 'member' } = await request.json();

    if (!teamId || !userEmail) {
      return NextResponse.json({ error: 'Team ID and user email are required' }, { status: 400 });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user's profile
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has permission to add members
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: currentProfile.id,
        p_team_id: teamId,
        p_permission: 'add_members'
      });

    if (!permission && currentProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Find the user to add by email
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('id, username, email')
      .eq('email', userEmail)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', targetProfile.id)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
    }

    // Add the member
    const { data: newMember, error: insertError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: targetProfile.id,
        role,
        invited_by: currentProfile.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding team member:', insertError);
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
    }

    return NextResponse.json({ 
      member: {
        ...newMember,
        username: targetProfile.username,
        email: targetProfile.email
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teams/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/teams/members - Update member role or permissions
export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId, role, permissions, is_active } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    if (role && !['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user's profile
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the member to update
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, user_id, role')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent demoting team owner
    if (member.role === 'owner' && role && role !== 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 });
    }

    // Check if user has permission to manage members
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: currentProfile.id,
        p_team_id: member.team_id,
        p_permission: 'manage_members'
      });

    if (!permission && currentProfile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the member
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: updatedMember, error: updateError } = await supabase
      .from('team_members')
      .update(updateData)
      .eq('id', memberId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team member:', updateError);
      return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
    }

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    console.error('Error in PATCH /api/teams/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teams/members - Remove a member from a team
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user's profile
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (currentProfileError || !currentProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the member to remove
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('team_id, user_id, role')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Prevent removing team owner
    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove team owner' }, { status: 400 });
    }

    // Check if user has permission to remove members or is removing themselves
    const isSelfRemoval = member.user_id === currentProfile.id;
    
    if (!isSelfRemoval) {
      const { data: permission } = await supabase
        .rpc('check_team_permission', {
          p_user_id: currentProfile.id,
          p_team_id: member.team_id,
          p_permission: 'remove_members'
        });

      if (!permission && currentProfile.role !== 'super_admin') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Remove the member
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (deleteError) {
      console.error('Error removing team member:', deleteError);
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teams/members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

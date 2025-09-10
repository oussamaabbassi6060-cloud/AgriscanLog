import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/teams - Get user's teams or all teams for super admin
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    const supabase = await createClient();
    
    // Get user's profile to check role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // If a specific teamId is requested, return that team's details
    if (teamId) {
      if (profile.role === 'super_admin') {
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select(`
            *,
            created_by_profile:profiles!teams_created_by_fkey(username, email)
          `)
          .eq('id', teamId)
          .single();
        if (teamError || !team) {
          return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }
        return NextResponse.json({ team });
      } else {
        // Check membership and return details view row
        const { data: teamDetail, error: detailError } = await supabase
          .from('team_member_details')
          .select('*')
          .eq('team_id', teamId)
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .single();
        if (detailError || !teamDetail) {
          return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
        }
        return NextResponse.json({ team: teamDetail });
      }
    }

    let query;
    
    // Super admins see all teams
    if (profile.role === 'super_admin') {
      query = supabase
        .from('teams')
        .select(`
          *,
          created_by_profile:profiles!teams_created_by_fkey(username, email),
          team_members(count)
        `)
        .order('created_at', { ascending: false });
    } else {
      // Regular users see only their teams
      query = supabase
        .from('team_member_details')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true);
    }

    const { data: teams, error } = await query;

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error in GET /api/teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teams - Create a new team (Super Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, adminEmail } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get user's profile and verify they're a super admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only super admins can create teams
    if (profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can create teams' }, { status: 403 });
    }

    // Create the team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        description,
        created_by: profile.id
      })
      .select()
      .single();

    if (teamError) {
      if (teamError.code === '23505') { // Unique constraint violation
        return NextResponse.json({ error: 'Team name already exists' }, { status: 400 });
      }
      console.error('Error creating team:', teamError);
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 });
    }

    // If admin email is provided, assign them as team admin
    if (adminEmail) {
      // Find the admin user by email
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('email', adminEmail)
        .single();

      if (adminProfile && !adminError) {
        // Add the admin to the team with admin role
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: team.id,
            user_id: adminProfile.id,
            role: 'admin',
            invited_by: profile.id
          });

        if (memberError) {
          console.error('Error adding team admin:', memberError);
          // Don't fail the whole request, team is already created
        } else {
          // Return team with admin info
          return NextResponse.json({ 
            team: {
              ...team,
              admin: {
                id: adminProfile.id,
                username: adminProfile.username,
                email: adminEmail
              }
            }
          }, { status: 201 });
        }
      }
    }

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/teams - Update a team
export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, name, description, settings, is_active } = await request.json();

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

    // Check if user has permission to update this team
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: profile.id,
        p_team_id: teamId,
        p_permission: 'manage_team'
      });

    if (!permission && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Update the team
    const updateData: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (settings !== undefined) updateData.settings = settings;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: team, error: updateError } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating team:', updateError);
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
    }

    return NextResponse.json({ team });
  } catch (error) {
    console.error('Error in PATCH /api/teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teams - Delete a team
export async function DELETE(request: NextRequest) {
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

    // Check if user has permission to delete this team
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: profile.id,
        p_team_id: teamId,
        p_permission: 'delete_team'
      });

    if (!permission && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Delete the team (cascades to related tables)
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (deleteError) {
      console.error('Error deleting team:', deleteError);
      return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

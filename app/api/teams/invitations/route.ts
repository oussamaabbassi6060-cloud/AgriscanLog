import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// GET /api/teams/invitations - Get team invitations
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const invitationCode = searchParams.get('code');

    const supabase = await createClient();
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // If invitation code is provided, get specific invitation
    if (invitationCode) {
      const { data: invitation, error } = await supabase
        .from('team_invitations')
        .select(`
          *,
          team:teams(id, name, description),
          inviter:profiles!team_invitations_invited_by_fkey(username, email)
        `)
        .eq('invitation_code', invitationCode)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !invitation) {
        return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
      }

      return NextResponse.json({ invitation });
    }

    // If teamId is provided, get invitations for that team
    if (teamId) {
      // Check if user has permission to view invitations
      const { data: permission } = await supabase
        .rpc('check_team_permission', {
          p_user_id: profile.id,
          p_team_id: teamId,
          p_permission: 'view_invitations'
        });

      if (!permission && profile.role !== 'super_admin') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const { data: invitations, error } = await supabase
        .from('team_invitations')
        .select(`
          *,
          inviter:profiles!team_invitations_invited_by_fkey(username, email),
          accepter:profiles!team_invitations_accepted_by_fkey(username, email)
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
      }

      return NextResponse.json({ invitations });
    }

    // Get invitations for user's email
    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        team:teams(id, name, description),
        inviter:profiles!team_invitations_invited_by_fkey(username, email)
      `)
      .eq('email', profile.email)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('Error in GET /api/teams/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/teams/invitations - Create a new invitation
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, email, role = 'member', sendEmail = true } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, username, email, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has permission to send invitations
    const { data: permission } = await supabase
      .rpc('check_team_permission', {
        p_user_id: profile.id,
        p_team_id: teamId,
        p_permission: 'send_invitations'
      });

    if (!permission && profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('name, description')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is already a member (if email is provided)
    if (email) {
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', existingUser.id)
          .single();

        if (existingMember) {
          return NextResponse.json({ error: 'User is already a team member' }, { status: 400 });
        }
      }

      // Check for existing pending invitation
      const { data: existingInvitation } = await supabase
        .from('team_invitations')
        .select('id')
        .eq('team_id', teamId)
        .eq('email', email)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingInvitation) {
        return NextResponse.json({ error: 'An invitation has already been sent to this email' }, { status: 400 });
      }
    }

    // Create the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email,
        role,
        invited_by: profile.id
      })
      .select()
      .single();

    if (invitationError) {
      console.error('Error creating invitation:', invitationError);
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    // Send email invitation if requested and email is provided
    if (sendEmail && email) {
      try {
        const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teams/join?code=${invitation.invitation_code}`;
        
        await resend.emails.send({
          from: 'AgriScan <noreply@agriscan.com>',
          to: email,
          subject: `You've been invited to join ${team.name} on AgriScan`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Team Invitation</h2>
              <p>Hi there,</p>
              <p>${profile.username} has invited you to join <strong>${team.name}</strong> on AgriScan.</p>
              ${team.description ? `<p>Team Description: ${team.description}</p>` : ''}
              <p>Your role will be: <strong>${role}</strong></p>
              <p>Click the link below to accept the invitation:</p>
              <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Accept Invitation
              </a>
              <p>Or copy this link: ${invitationUrl}</p>
              <p>This invitation will expire in 7 days.</p>
              <p>Best regards,<br>The AgriScan Team</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error('Error sending invitation email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ 
      invitation: {
        ...invitation,
        invitation_url: `${process.env.NEXT_PUBLIC_APP_URL}/teams/join?code=${invitation.invitation_code}`
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/teams/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/teams/invitations - Accept an invitation
export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invitationCode } = await request.json();

    if (!invitationCode) {
      return NextResponse.json({ error: 'Invitation code is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('invitation_code', invitationCode)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invalid invitation code' }, { status: 404 });
    }

    // Check if invitation is already used
    if (invitation.is_used) {
      return NextResponse.json({ error: 'This invitation has already been used' }, { status: 400 });
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    // Check if invitation is for specific email
    if (invitation.email && invitation.email !== profile.email) {
      return NextResponse.json({ error: 'This invitation is for a different email address' }, { status: 403 });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', invitation.team_id)
      .eq('user_id', profile.id)
      .single();

    if (existingMember) {
      // Mark invitation as used anyway
      await supabase
        .from('team_invitations')
        .update({
          is_used: true,
          accepted_at: new Date().toISOString(),
          accepted_by: profile.id
        })
        .eq('id', invitation.id);

      return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 });
    }

    // Start a transaction-like operation
    // Add user to team
    const { data: newMember, error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: profile.id,
        role: invitation.role,
        invited_by: invitation.invited_by
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error adding team member:', memberError);
      return NextResponse.json({ error: 'Failed to add you to the team' }, { status: 500 });
    }

    // Mark invitation as used
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({
        is_used: true,
        accepted_at: new Date().toISOString(),
        accepted_by: profile.id
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      // Don't fail the request as user is already added to team
    }

    // Get team details for response
    const { data: team } = await supabase
      .from('teams')
      .select('name, description')
      .eq('id', invitation.team_id)
      .single();

    return NextResponse.json({ 
      success: true,
      team: {
        id: invitation.team_id,
        name: team?.name,
        description: team?.description
      },
      member: newMember
    });
  } catch (error) {
    console.error('Error in PUT /api/teams/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/teams/invitations - Cancel an invitation
export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get('invitationId');

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Get current user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('clerk_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('team_invitations')
      .select('team_id, invited_by')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if user has permission to cancel invitations
    const isInviter = invitation.invited_by === profile.id;
    
    if (!isInviter) {
      const { data: permission } = await supabase
        .rpc('check_team_permission', {
          p_user_id: profile.id,
          p_team_id: invitation.team_id,
          p_permission: 'manage_invitations'
        });

      if (!permission && profile.role !== 'super_admin') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      console.error('Error deleting invitation:', deleteError);
      return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/teams/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

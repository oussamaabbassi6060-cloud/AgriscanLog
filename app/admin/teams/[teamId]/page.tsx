'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TeamAdminDashboard } from '@/components/team-admin-dashboard';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@clerk/nextjs';

interface TeamMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export default function TeamManagementPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const teamId = params.teamId as string;
  
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer' | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      checkUserAccess();
    }
  }, [teamId, isLoaded, user]);

  const checkUserAccess = async () => {
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const userId = user.id;
      
      const supabase = createClient();
      
      // Get user's profile to check if they're a super admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('clerk_id', userId)
        .single();

      if (profileError || !profile) {
        setError('User profile not found');
        setLoading(false);
        return;
      }

      // Check if user is super admin
      if (profile.role === 'super_admin') {
        setIsSuperAdmin(true);
        setHasAccess(true);
        setUserRole('owner'); // Super admins have owner-level access
        setLoading(false);
        return;
      }

      // Check if user is a member of this team
      const { data: membership, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .single();

      if (memberError || !membership) {
        setError('You do not have access to this team');
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setUserRole(membership.role);
      setHasAccess(true);
    } catch (err) {
      console.error('Error checking access:', err);
      setError('Failed to verify access permissions');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading team information...</p>
        </div>
      </div>
    );
  }

  if (error || !hasAccess) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'You do not have permission to access this team.'}
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push('/dashboard')}
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {isSuperAdmin && (
        <div className="mb-6 flex items-center justify-end">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-yellow-500" />
            <span>Super Admin Access</span>
          </div>
        </div>
      )}

      <TeamAdminDashboard 
        teamId={teamId} 
        userRole={userRole || 'viewer'} 
      />
    </div>
  );
}

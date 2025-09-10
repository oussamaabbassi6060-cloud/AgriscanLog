'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { TeamAdminDashboard } from '@/components/team-admin-dashboard';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TeamAdminTeamPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const teamId = params.teamId as string;
  const defaultTab = searchParams.get('tab') as 'api-keys' | 'members' | 'activity' | null;
  
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer' | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      checkUserAccess();
    } else if (isLoaded && !user) {
      router.push('/sign-in');
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
      const supabase = createClient();
      
      // Get user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('clerk_id', user.id)
        .single();

      if (profileError || !profile) {
        setError('User profile not found');
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
        setError('You are not a member of this team');
        setHasAccess(false);
        setLoading(false);
        return;
      }

      // Only admins and owners can access team admin dashboard
      if (membership.role !== 'admin' && membership.role !== 'owner') {
        setError('You need to be a team admin to access this page');
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
          onClick={() => router.push('/team-admin')}
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Team Admin Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button
          onClick={() => router.push('/team-admin')}
          variant="outline"
          size="sm"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Team Admin Dashboard
        </Button>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4 text-primary" />
          <span>Team Admin Access</span>
        </div>
      </div>

      <TeamAdminDashboard 
        teamId={teamId} 
        userRole={userRole || 'viewer'}
        defaultTab={defaultTab || 'api-keys'}
      />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserTeamsDashboard } from '@/components/user-teams-dashboard';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@clerk/nextjs';

export default function TeamPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const teamId = params.teamId as string;
  
  const [loading, setLoading] = useState(true);
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
      
      // Get user's profile
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
          onClick={() => router.push('/teams')}
          className="mt-4"
          variant="outline"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <UserTeamsDashboard teamId={teamId} />
    </div>
  );
}

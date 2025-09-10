'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Users, AlertCircle } from 'lucide-react';

interface TeamInvitation {
  id: string;
  team_id: string;
  role: string;
  team: {
    id: string;
    name: string;
    description?: string;
  };
  inviter: {
    username: string;
    email: string;
  };
}

function JoinTeamContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const invitationCode = searchParams.get('code');
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<TeamInvitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isLoaded && user && invitationCode) {
      fetchInvitation();
    } else if (isLoaded && !user) {
      // Redirect to login if not authenticated
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`);
    } else if (isLoaded && !invitationCode) {
      setError('No invitation code provided');
      setLoading(false);
    }
  }, [isLoaded, user, invitationCode]);

  const fetchInvitation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/teams/invitations?code=${invitationCode}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch invitation');
      }
      
      const data = await response.json();
      setInvitation(data.invitation);
    } catch (err: any) {
      setError(err.message || 'Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!invitation || !invitationCode) return;
    
    try {
      setAccepting(true);
      const response = await fetch('/api/teams/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationCode })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept invitation');
      }
      
      const data = await response.json();
      setSuccess(true);
      
      // Redirect to team dashboard after 2 seconds
      setTimeout(() => {
        router.push(`/admin/teams/${data.team.id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const declineInvitation = () => {
    router.push('/dashboard');
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Invalid Invitation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full mt-4"
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Invitation Accepted!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              You have successfully joined the team. Redirecting to team dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Invitation Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The invitation could not be found or may have expired.
            </p>
            <Button 
              onClick={() => router.push('/dashboard')} 
              className="w-full mt-4"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">Team Invitation</CardTitle>
          <CardDescription className="text-center">
            You've been invited to join a team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Team:</span>
              <span className="font-medium">{invitation.team.name}</span>
            </div>
            {invitation.team.description && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Description:</span>
                <span className="text-sm">{invitation.team.description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Your Role:</span>
              <span className="font-medium capitalize">{invitation.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invited By:</span>
              <span className="text-sm">{invitation.inviter.username}</span>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              By accepting this invitation, you'll gain access to the team's shared API keys and resources.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              onClick={acceptInvitation} 
              className="flex-1"
              disabled={accepting}
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <Button 
              onClick={declineInvitation} 
              variant="outline"
              className="flex-1"
              disabled={accepting}
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <JoinTeamContent />
    </Suspense>
  );
}

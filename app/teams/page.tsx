'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Building2, 
  Users, 
  Key, 
  AlertCircle,
  ArrowRight,
  Shield
} from 'lucide-react';

interface Team {
  id: string;
  team_id: string;
  team_name: string;
  role: string;
  joined_at: string;
  is_active: boolean;
}

export default function UserTeamsDashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchUserTeams();
    } else if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user]);

  const fetchUserTeams = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_id', user.id)
        .single();

      if (profileError || !profile) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      // Get user's teams
      const { data: userTeams, error: teamsError } = await supabase
        .from('team_member_details')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_active', true);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        setError('Failed to load your teams');
        setLoading(false);
        return;
      }

      if (!userTeams || userTeams.length === 0) {
        setError('You are not a member of any team');
      } else {
        setTeams(userTeams);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const navigateToTeam = (teamId: string) => {
    router.push(`/teams/${teamId}`);
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your teams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button
          onClick={() => router.push('/dashboard')}
          className="mt-4"
          variant="outline"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8 text-primary" />
          My Teams
        </h1>
        <p className="text-muted-foreground mt-2">
          Access shared API tokens from your teams
        </p>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <Card 
            key={team.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigateToTeam(team.team_id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {team.team_name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Joined {new Date(team.joined_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge 
                  variant={team.role === 'admin' ? 'destructive' : 'secondary'}
                >
                  {team.role === 'admin' ? 'Team Admin' : 'Member'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Your Role:
                  </span>
                  <span className="font-medium">
                    {team.role === 'admin' ? 'Team Admin' : 'Team Member'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={team.is_active ? 'default' : 'secondary'}>
                    {team.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <Button 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToTeam(team.team_id);
                  }}
                >
                  <Key className="h-4 w-4 mr-2" />
                  View Shared Tokens
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <Card className="max-w-lg mx-auto">
          <CardContent className="text-center py-12">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
            <p className="text-muted-foreground mb-6">
              You're not a member of any team. Contact your team administrator to be added to a team.
            </p>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

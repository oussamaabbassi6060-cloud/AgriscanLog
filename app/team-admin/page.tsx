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
  Shield, 
  Settings,
  AlertCircle,
  Plus
} from 'lucide-react';

interface Team {
  id: string;
  team_id: string;
  team_name: string;
  role: string;
  joined_at: string;
  is_active: boolean;
}

export default function TeamAdminDashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isTeamAdmin, setIsTeamAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      checkAdminAccess();
    } else if (isLoaded && !user) {
      router.push('/sign-in');
    }
  }, [isLoaded, user]);

  const checkAdminAccess = async () => {
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

      // Get teams where user is an admin or owner
      const { data: userTeams, error: teamsError } = await supabase
        .from('team_member_details')
        .select('*')
        .eq('user_id', profile.id)
        .in('role', ['owner', 'admin'])
        .eq('is_active', true);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        setError('Failed to load your teams');
        setLoading(false);
        return;
      }

      if (!userTeams || userTeams.length === 0) {
        setError('You are not an admin of any team');
        setIsTeamAdmin(false);
      } else {
        setTeams(userTeams);
        setIsTeamAdmin(true);
      }
    } catch (err) {
      console.error('Error checking admin access:', err);
      setError('Failed to verify admin access');
    } finally {
      setLoading(false);
    }
  };

  const navigateToTeam = (teamId: string) => {
    router.push(`/team-admin/teams/${teamId}`);
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

  if (error || !isTeamAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'You need to be a team admin to access this page.'}
          </AlertDescription>
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
          <Shield className="h-8 w-8 text-primary" />
          Team Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your teams, members, and shared API keys
        </p>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <Card key={team.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateToTeam(team.team_id)}>
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
                <Badge variant={team.role === 'owner' ? 'destructive' : 'default'}>
                  {team.role}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToTeam(team.team_id);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Team
                </Button>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/team-admin/teams/${team.team_id}?tab=members`);
                    }}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Members
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/team-admin/teams/${team.team_id}?tab=api-keys`);
                    }}
                  >
                    <Key className="h-4 w-4 mr-1" />
                    API Keys
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
            <p className="text-muted-foreground mb-4">
              You are not an admin of any team. Contact your super admin to be assigned to a team.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {teams.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teams.length}</div>
              <p className="text-xs text-muted-foreground">
                Teams you manage
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Role</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Team Admin</div>
              <p className="text-xs text-muted-foreground">
                Manage members and API keys
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Select a team to manage
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => router.push('/dashboard')}
              >
                Back to Main Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

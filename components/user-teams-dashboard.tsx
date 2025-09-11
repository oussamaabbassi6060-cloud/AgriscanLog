'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Key, 
  Shield, 
  Activity,
  Copy,
  Eye,
  EyeOff,
  Clock,
  AlertCircle,
  Building2
} from 'lucide-react';
import { toast } from 'sonner';

interface MemberToken {
  id: string;
  user_id: string;
  team_role: 'admin' | 'member';
  joined_at: string;
  username: string;
  email: string;
  user_role: string;
  points: number;
  token: {
    value: string;
    masked: boolean;
    exists: boolean;
  };
}

interface Team {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  is_active: boolean;
}

interface UserTeamsDashboardProps {
  teamId: string;
}

export function UserTeamsDashboard({ teamId }: UserTeamsDashboardProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [memberTokens, setMemberTokens] = useState<MemberToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchTeamData();
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      
      // Fetch team details
      const teamRes = await fetch(`/api/teams?teamId=${teamId}`);
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        setTeam(teamData.team);
      }
      
      // Fetch member tokens
      const tokensRes = await fetch(`/api/teams/tokens?teamId=${teamId}`);
      if (tokensRes.ok) {
        const tokensData = await tokensRes.json();
        setMemberTokens(tokensData.tokens || []);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleToken = async (userId: string) => {
    if (!showTokens[userId]) {
      // Fetch full token
      try {
        const response = await fetch(`/api/teams/tokens?teamId=${teamId}&showFull=true`);
        if (response.ok) {
          const data = await response.json();
          setMemberTokens(data.tokens);
          setShowTokens({ ...showTokens, [userId]: true });
        }
      } catch (error) {
        toast.error('Failed to fetch full tokens');
      }
    } else {
      setShowTokens({ ...showTokens, [userId]: false });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Token copied to clipboard');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'member': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading team data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Building2 className="h-6 w-6" />
                {team?.name}
              </CardTitle>
              <CardDescription>
                {team?.description || 'Access shared AgriScan API tokens from your team'}
              </CardDescription>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Key className="h-4 w-4" />
                  {memberTokens.filter(m => m.token.exists).length} available tokens
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {memberTokens.length} team members
                </span>
              </div>
            </div>
            <Badge variant={team?.is_active ? 'default' : 'secondary'}>
              {team?.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Shared Tokens */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shared Team Tokens</CardTitle>
              <CardDescription className="mt-1">
                AgriScan API tokens shared by your team members
              </CardDescription>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchTeamData}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {memberTokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No team members with tokens yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {memberTokens.map((member) => (
                <Card key={member.id} className="overflow-hidden">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{member.username}</h4>
                            <div className="flex gap-2 mt-1">
                              <Badge variant={getRoleBadgeColor(member.team_role)}>
                                {member.team_role === 'admin' ? 'Team Admin' : 'Member'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Joined: {new Date(member.joined_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {member.points} credits
                          </span>
                        </div>
                        
                        {member.token.exists ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="text-xs text-muted-foreground mb-1">AgriScan Token</div>
                              <div className="flex items-center gap-2">
                                <code className="px-3 py-2 bg-muted rounded text-sm font-mono flex-1">
                                  {showTokens[member.user_id] && !member.token.masked 
                                    ? member.token.value 
                                    : member.token.masked ? member.token.value : '••••••••••••'}
                                </code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleToggleToken(member.user_id)}
                                  title="Toggle token visibility"
                                >
                                  {showTokens[member.user_id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                {showTokens[member.user_id] && !member.token.masked && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(member.token.value)}
                                    title="Copy token to clipboard"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Alert className="py-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              This member doesn't have an AgriScan token yet
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

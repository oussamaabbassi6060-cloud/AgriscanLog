'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Users, 
  Key, 
  Settings, 
  UserPlus, 
  KeyRound, 
  Shield, 
  Activity,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Building2
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  username: string;
  email: string;
  role: 'admin' | 'member';
  joined_at: string;
  is_active: boolean;
  global_role?: string;
}

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
  settings?: any;
}

interface TeamAdminDashboardProps {
  teamId: string;
  userRole: 'admin' | 'member';
  isSuperAdmin?: boolean;
  defaultTab?: 'api-keys' | 'members' | 'activity';
}

export function TeamAdminDashboard({ teamId, userRole, isSuperAdmin = false, defaultTab = 'api-keys' }: TeamAdminDashboardProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [memberTokens, setMemberTokens] = useState<MemberToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [canViewFullTokens, setCanViewFullTokens] = useState(false);
  
  // Dialog states
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  // Form states
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member'>('member');
  const [showTokens, setShowTokens] = useState<{ [key: string]: boolean }>({});

  const canManageMembers = userRole === 'admin' || isSuperAdmin;
  const canManageApiKeys = userRole === 'admin' || isSuperAdmin;
  const canEditTeam = userRole === 'admin' || isSuperAdmin;
  // Only team members can view tokens within their team
  const canViewTokens = userRole === 'admin' || userRole === 'member';

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
      
      // Fetch team members
      const membersRes = await fetch(`/api/teams/members?teamId=${teamId}`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        // Filter out super admin members unless current user is super admin
        const filteredMembers = (membersData.members || []).filter(
          (member: TeamMember) => isSuperAdmin || member.global_role !== 'super_admin'
        );
        setMembers(filteredMembers);
      }
      
      // Fetch member tokens
      const tokensRes = await fetch(`/api/teams/tokens?teamId=${teamId}`);
      if (tokensRes.ok) {
        const tokensData = await tokensRes.json();
        // Filter out super admin tokens unless current user is super admin
        const filteredTokens = (tokensData.tokens || []).filter(
          (token: MemberToken) => isSuperAdmin || token.user_role !== 'super_admin'
        );
        setMemberTokens(filteredTokens);
        setCanViewFullTokens(tokensData.canViewFull);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    try {
      const response = await fetch('/api/teams/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          userEmail: newMemberEmail,
          role: newMemberRole
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Member added successfully');
        setAddMemberOpen(false);
        setNewMemberEmail('');
        setNewMemberRole('member');
        fetchTeamData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add member');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch('/api/teams/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          role: newRole
        })
      });

      if (response.ok) {
        toast.success('Member role updated');
        fetchTeamData();
        setEditMemberOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update member role');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      toast.error('Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const response = await fetch(`/api/teams/members?memberId=${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Member removed');
        fetchTeamData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleToggleToken = async (userId: string) => {
    // All team members can view tokens within their team
    if (!canViewTokens) {
      toast.error('You do not have permission to view tokens');
      return;
    }
    
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
                {team?.description || 'Team members share AgriScan API tokens for collaborative plant disease detection'}
              </CardDescription>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {members.length} members
                </span>
                <span className="flex items-center gap-1">
                  <Key className="h-4 w-4" />
                  {memberTokens.filter(m => m.token.exists).length} member tokens
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  Your role: <Badge variant="outline" className="ml-1">{userRole}</Badge>
                </span>
              </div>
            </div>
            <Badge variant={team?.is_active ? 'default' : 'secondary'}>
              {team?.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Shared API Keys ({memberTokens.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Members</CardTitle>
                {canManageMembers && (
                  <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                          Enter the email address of the user you want to add to the team.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            placeholder="user@example.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="role">Role</Label>
                          <Select value={newMemberRole} onValueChange={(v: any) => setNewMemberRole(v)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddMemberOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddMember}>Add Member</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Status</TableHead>
                    {canManageMembers && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{member.username}</div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeColor(member.role)}>
                          {member.role}
                        </Badge>
                        {member.global_role === 'super_admin' && (
                          <Badge variant="outline" className="ml-2">
                            <Shield className="h-3 w-3 mr-1" />
                            Super Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(member.joined_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {member.is_active ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      {canManageMembers && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedMember(member);
                                setEditMemberOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Member Tokens Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Member AgriScan Tokens</CardTitle>
                  <CardDescription className="mt-1">
                    Access tokens from all team members for AgriScan plant disease detection.
                    {canViewTokens && (
                      <span className="block mt-1 text-green-600 dark:text-green-400">
                        ✓ All team members can view and use shared tokens
                      </span>
                    )}
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
                  <p className="text-sm mt-2">Add members to the team to access their AgriScan tokens</p>
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
                                <p className="text-sm text-muted-foreground">{member.email}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant={getRoleBadgeColor(member.team_role)}>
                                  {member.team_role}
                                </Badge>
                                {member.user_role === 'admin' && (
                                  <Badge variant="secondary">Admin</Badge>
                                )}
                                {member.user_role === 'super_admin' && (
                                  <Badge variant="destructive">Super Admin</Badge>
                                )}
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
                                  <Label className="text-xs text-muted-foreground">AgriScan Token</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <code className="px-3 py-2 bg-muted rounded text-sm font-mono flex-1">
                                      {canViewTokens && showTokens[member.user_id] && !member.token.masked 
                                        ? member.token.value 
                                        : member.token.masked ? member.token.value : '••••••••••••'}
                                    </code>
                                    {canViewTokens && (
                                      <>
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
                                      </>
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
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Activity tracking will be available in the next update.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Member Dialog */}
      <Dialog open={editMemberOpen} onOpenChange={setEditMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedMember?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-role">Role</Label>
              <Select 
                value={selectedMember?.role} 
                onValueChange={(v) => selectedMember && handleUpdateMemberRole(selectedMember.id, v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to mask API key
function maskApiKey(key: string): string {
  if (!key || key.length <= 8) return '***';
  return key.substring(0, 4) + '...' + key.substring(key.length - 4);
}

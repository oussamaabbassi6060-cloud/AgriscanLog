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
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  is_active: boolean;
  global_role?: string;
}

interface TeamApiKey {
  id: string;
  name: string;
  api_key: string;
  api_provider: string;
  created_at: string;
  last_used_at?: string;
  usage_count: number;
  usage_limit?: number;
  expires_at?: string;
  is_active: boolean;
  is_decrypted?: boolean;
  creator?: {
    username: string;
    email: string;
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
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  defaultTab?: 'api-keys' | 'members' | 'activity';
}

export function TeamAdminDashboard({ teamId, userRole, defaultTab = 'api-keys' }: TeamAdminDashboardProps) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [apiKeys, setApiKeys] = useState<TeamApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Dialog states
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addApiKeyOpen, setAddApiKeyOpen] = useState(false);
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  
  // Form states
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newApiProvider, setNewApiProvider] = useState('');
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});

  const canManageMembers = userRole === 'owner' || userRole === 'admin';
  const canManageApiKeys = userRole === 'owner' || userRole === 'admin';
  const canEditTeam = userRole === 'owner' || userRole === 'admin';

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
        setMembers(membersData.members);
      }
      
      // Fetch API keys
      const apiKeysRes = await fetch(`/api/teams/api-keys?teamId=${teamId}`);
      if (apiKeysRes.ok) {
        const apiKeysData = await apiKeysRes.json();
        setApiKeys(apiKeysData.apiKeys);
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

  const handleAddApiKey = async () => {
    try {
      const response = await fetch('/api/teams/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          name: newApiKeyName,
          apiKey: newApiKey,
          apiProvider: newApiProvider
        })
      });

      if (response.ok) {
        toast.success('API key added successfully');
        setAddApiKeyOpen(false);
        setNewApiKeyName('');
        setNewApiKey('');
        setNewApiProvider('');
        fetchTeamData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add API key');
      }
    } catch (error) {
      console.error('Error adding API key:', error);
      toast.error('Failed to add API key');
    }
  };

  const handleToggleApiKey = async (apiKeyId: string) => {
    if (showApiKeys[apiKeyId]) {
      setShowApiKeys({ ...showApiKeys, [apiKeyId]: false });
    } else {
      try {
        const response = await fetch(`/api/teams/api-keys?teamId=${teamId}&decrypt=true`);
        if (response.ok) {
          const data = await response.json();
          const decryptedKey = data.apiKeys.find((k: TeamApiKey) => k.id === apiKeyId);
          if (decryptedKey && decryptedKey.is_decrypted) {
            setApiKeys(apiKeys.map(k => 
              k.id === apiKeyId ? { ...k, api_key: decryptedKey.api_key, is_decrypted: true } : k
            ));
            setShowApiKeys({ ...showApiKeys, [apiKeyId]: true });
          }
        }
      } catch (error) {
        console.error('Error decrypting API key:', error);
        toast.error('Failed to decrypt API key');
      }
    }
  };

  const handleDeleteApiKey = async (apiKeyId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    
    try {
      const response = await fetch(`/api/teams/api-keys?apiKeyId=${apiKeyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('API key deleted');
        fetchTeamData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete API key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'destructive';
      case 'admin': return 'default';
      case 'member': return 'secondary';
      case 'viewer': return 'outline';
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
                {team?.description || 'Share API keys and collaborate with your team'}
              </CardDescription>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {members.length} members
                </span>
                <span className="flex items-center gap-1">
                  <Key className="h-4 w-4" />
                  {apiKeys.length} API keys
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
            Shared API Keys ({apiKeys.length})
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
                              <SelectItem value="viewer">Viewer</SelectItem>
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
                            {member.role !== 'owner' && (
                              <>
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
                              </>
                            )}
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

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>API Keys</CardTitle>
                {canManageApiKeys && (
                  <Dialog open={addApiKeyOpen} onOpenChange={setAddApiKeyOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <KeyRound className="h-4 w-4 mr-2" />
                        Add API Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add API Key</DialogTitle>
                        <DialogDescription>
                          Add a new API key for your team to use.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="key-name">Name</Label>
                          <Input
                            id="key-name"
                            value={newApiKeyName}
                            onChange={(e) => setNewApiKeyName(e.target.value)}
                            placeholder="My API Key"
                          />
                        </div>
                        <div>
                          <Label htmlFor="provider">Provider</Label>
                          <Select value={newApiProvider} onValueChange={setNewApiProvider}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="openai">OpenAI</SelectItem>
                              <SelectItem value="anthropic">Anthropic</SelectItem>
                              <SelectItem value="google">Google</SelectItem>
                              <SelectItem value="huggingface">Hugging Face</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="api-key">API Key</Label>
                          <Input
                            id="api-key"
                            type="password"
                            value={newApiKey}
                            onChange={(e) => setNewApiKey(e.target.value)}
                            placeholder="sk-..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddApiKeyOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddApiKey}>Add API Key</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No API keys added yet
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((apiKey) => (
                    <Card key={apiKey.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{apiKey.name}</h4>
                              <Badge variant="outline">{apiKey.api_provider}</Badge>
                              {!apiKey.is_active && (
                                <Badge variant="destructive">Inactive</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Created: {new Date(apiKey.created_at).toLocaleDateString()}</span>
                              {apiKey.last_used_at && (
                                <span>Last used: {new Date(apiKey.last_used_at).toLocaleDateString()}</span>
                              )}
                              {apiKey.usage_limit && (
                                <span>Usage: {apiKey.usage_count}/{apiKey.usage_limit}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="px-2 py-1 bg-muted rounded text-sm">
                                {showApiKeys[apiKey.id] && apiKey.is_decrypted ? apiKey.api_key : maskApiKey(apiKey.api_key)}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleApiKey(apiKey.id)}
                              >
                                {showApiKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              {showApiKeys[apiKey.id] && apiKey.is_decrypted && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(apiKey.api_key)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {canManageApiKeys && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteApiKey(apiKey.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
                  <SelectItem value="viewer">Viewer</SelectItem>
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

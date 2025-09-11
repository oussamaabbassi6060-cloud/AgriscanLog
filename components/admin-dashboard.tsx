"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import {
  Users,
  Shield,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Server,
  Activity,
  Crown,
  UserCheck,
  UserX,
  Building2,
  UserPlus,
  Settings,
} from "lucide-react"
import { UserRole } from "@/lib/admin-middleware"

interface AdminStats {
  totalUsers: number
  totalScans: number
  recentUsers: number
  recentScans: number
  healthyScans: number
  diseaseScans: number
  roleStats: Record<string, number>
  topDiseases: Array<{ disease: string; count: number }>
  userGrowthData: Array<{ month: string; users: number }>
}

interface User {
  id: string
  clerk_id: string
  username: string
  email: string
  role: UserRole
  points: number
  created_at: string
  updated_at: string
}

interface DatabaseStats {
  tables: {
    profiles: {
      count: number
      roleDistribution: Record<string, number>
      monthlyGrowth: Record<string, number>
    }
    scans: {
      count: number
      healthyCount: number
      diseaseCount: number
      topDiseases: Array<[string, number]>
      monthlyGrowth: Record<string, number>
    }
    payments: {
      count: number
      totalRevenue: number
      monthlyGrowth: Record<string, number>
    }
  }
  size: {
    profiles: number
    scans: number
    payments: number
    totalRecords: number
  }
  health: {
    activeUsers: number
    adminUsers: number
    superAdminUsers: number
    scanSuccessRate: number
    avgScansPerUser: number
  }
  lastUpdated: string
}

interface Team {
  id: string
  name: string
  description?: string
  created_at: string
  is_active: boolean
  created_by_profile?: {
    username: string
    email: string
  }
  team_members?: Array<{
    aggregate: {
      count: number
    }
  }>
}

interface AdminDashboardProps {
  userRole: UserRole
}

const roleColors = {
  user: "#22c55e",
  admin: "#f59e0b", 
  super_admin: "#ef4444"
}

const roleLabels = {
  user: "Member",
  admin: "Team Admin",
  super_admin: "Super Admin"
}

export function AdminDashboard({ userRole }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(false)
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [dbLoading, setDbLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamDescription, setNewTeamDescription] = useState("")
  const [newTeamAdminEmail, setNewTeamAdminEmail] = useState("")
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)

  const { toast } = useToast()

  // Fetch admin statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        console.error('Failed to fetch admin stats')
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch users
  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(roleFilter && roleFilter !== 'all' && { role: roleFilter })
      })
      
      const response = await fetch(`/api/admin/users?${params}`)
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setTotalPages(data.pagination.pages)
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setUsersLoading(false)
    }
  }

  // Fetch database stats (super admin only)
  const fetchDatabaseStats = async () => {
    if (userRole !== 'super_admin') return
    
    setDbLoading(true)
    try {
      const response = await fetch('/api/admin/database')
      if (response.ok) {
        const data = await response.json()
        setDatabaseStats(data.database)
      } else {
        console.error('Failed to fetch database stats')
      }
    } catch (error) {
      console.error('Error fetching database stats:', error)
    } finally {
      setDbLoading(false)
    }
  }

  // Fetch teams (super admin only)
  const fetchTeams = async () => {
    if (userRole !== 'super_admin') return
    
    setTeamsLoading(true)
    try {
      const response = await fetch('/api/teams')
      if (response.ok) {
        const data = await response.json()
        setTeams(data.teams || [])
      } else {
        console.error('Failed to fetch teams')
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setTeamsLoading(false)
    }
  }

  // Create new team
  const handleCreateTeam = async () => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTeamName,
          description: newTeamDescription,
          adminEmail: newTeamAdminEmail
        })
      })
      
      if (response.ok) {
        toast({
          title: "Team Created",
          description: "New team has been created successfully",
        })
        setCreateTeamDialogOpen(false)
        setNewTeamName('')
        setNewTeamDescription('')
        setNewTeamAdminEmail('')
        fetchTeams()
      } else {
        const data = await response.json()
        toast({
          title: "Creation Failed",
          description: data.error || 'Failed to create team',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Creation Failed",
        description: "An error occurred while creating the team",
        variant: "destructive",
      })
    }
  }

  // Delete team
  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return
    
    try {
      const response = await fetch(`/api/teams?teamId=${teamId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast({
          title: "Team Deleted",
          description: "Team has been deleted successfully",
        })
        fetchTeams()
      } else {
        const data = await response.json()
        toast({
          title: "Delete Failed",
          description: data.error || 'Failed to delete team',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "An error occurred while deleting the team",
        variant: "destructive",
      })
    }
  }

  // Update user role
  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingRole(userId)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Role Updated",
          description: data.message,
        })
        fetchUsers() // Refresh users list
        fetchStats() // Refresh stats
      } else {
        toast({
          title: "Update Failed",
          description: data.error || 'Failed to update user role',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "An error occurred while updating the user role",
        variant: "destructive",
      })
    } finally {
      setUpdatingRole(null)
    }
  }

  // Delete user
  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    setDeleting(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToDelete.id })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "User Deleted",
          description: data.message,
        })
        setDeleteDialogOpen(false)
        setUserToDelete(null)
        fetchUsers() // Refresh users list
        fetchStats() // Refresh stats
      } else {
        toast({
          title: "Delete Failed",
          description: data.error || 'Failed to delete user',
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Delete Failed",
        description: "An error occurred while deleting the user",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchUsers()
    if (userRole === 'super_admin') {
      fetchDatabaseStats()
      fetchTeams()
    }
  }, [userRole])

  // Re-fetch teams when activeTab changes to Team Management
  useEffect(() => {
    if (activeTab === 'teams' && userRole === 'super_admin') {
      fetchTeams()
    }
  }, [activeTab, userRole])

  useEffect(() => {
    fetchUsers()
  }, [search, roleFilter, page])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <span className="ml-3 text-lg">Loading admin dashboard...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Admin Header */}
      <div className="glass-strong rounded-xl p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              {userRole === 'super_admin' ? (
                <Crown className="w-10 h-10 text-yellow-500" />
              ) : (
                <Shield className="w-10 h-10 text-primary" />
              )}
              {userRole === 'super_admin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}
            </h2>
            <p className="text-muted-foreground text-lg">
              {userRole === 'super_admin' 
                ? 'Complete system administration and database management'
                : 'User management and system statistics'
              }
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={fetchStats} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Stats
            </Button>
            {userRole === 'super_admin' && (
              <Button onClick={fetchDatabaseStats} variant="outline" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Refresh DB Stats
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">Total Users</CardTitle>
              <Users className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalUsers}</div>
              <p className="text-sm text-muted-foreground">
                +{stats.recentUsers} in last 30 days
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">Total Scans</CardTitle>
              <Activity className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalScans}</div>
              <p className="text-sm text-muted-foreground">
                +{stats.recentScans} in last 30 days
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">Healthy Plants</CardTitle>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.healthyScans}</div>
              <p className="text-sm text-muted-foreground">
                {Math.round((stats.healthyScans / stats.totalScans) * 100)}% success rate
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-medium">Disease Detected</CardTitle>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.diseaseScans}</div>
              <p className="text-sm text-muted-foreground">
                {Math.round((stats.diseaseScans / stats.totalScans) * 100)}% of scans
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {stats && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* User Role Distribution */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-xl">User Roles Distribution</CardTitle>
              <CardDescription>Breakdown of user privileges</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(stats.roleStats).map(([role, count]) => ({
                      name: roleLabels[role as UserRole] || role,
                      value: count,
                      color: roleColors[role as UserRole] || "#8884d8"
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(stats.roleStats).map(([role], index) => (
                      <Cell key={`cell-${index}`} fill={roleColors[role as UserRole] || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Growth Trend */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-xl">User Growth Trend</CardTitle>
              <CardDescription>New user registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Management Section */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Users className="w-6 h-6" />
                User Management
              </CardTitle>
              <CardDescription>View and manage all system users</CardDescription>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Team Admins</SelectItem>
                  <SelectItem value="super_admin">Super Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading users...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {users.filter(user => userRole === 'super_admin' || user.role !== 'super_admin').map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 glass-subtle rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      {user.role === 'super_admin' ? (
                        <Crown className="w-5 h-5 text-yellow-600" />
                      ) : user.role === 'admin' ? (
                        <Shield className="w-5 h-5 text-primary" />
                      ) : (
                        <UserCheck className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{user.username}</h3>
                      <p className="text-sm text-muted-foreground">
                        {userRole === 'super_admin' ? user.email : '••••@••••.•••'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {/* Only show role badge for admins and super admins, not for regular users */}
                      {(user.role === 'admin' || user.role === 'super_admin') && (
                        <Badge 
                          variant={user.role === 'super_admin' ? 'destructive' : 'default'}
                          className="mb-1"
                        >
                          {roleLabels[user.role]}
                        </Badge>
                      )}
                      {userRole === 'super_admin' && (
                        <p className="text-sm text-muted-foreground">{user.points} credits</p>
                      )}
                    </div>
                    {/* Only super admins can delete users */}
                    {userRole === 'super_admin' && user.role !== 'super_admin' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setUserToDelete(user)
                          setDeleteDialogOpen(true)
                        }}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="px-4 py-2 text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Management Section (Super Admin Only) */}
      {userRole === 'super_admin' && (
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="w-6 h-6" />
                  Team Management
                </CardTitle>
                <CardDescription>Create and manage teams across the platform</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={fetchTeams} 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={teamsLoading}
                >
                  <RefreshCw className={`w-4 h-4 ${teamsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Create Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Team</DialogTitle>
                    <DialogDescription>
                      Create a new team and assign an admin to manage it. Teams are used to share API keys among members.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium">Team Name *</label>
                      <Input
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Enter team name"
                        className="mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Input
                        value={newTeamDescription}
                        onChange={(e) => setNewTeamDescription(e.target.value)}
                        placeholder="Enter team description"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Team Admin Email (Optional)</label>
                      <Input
                        type="email"
                        value={newTeamAdminEmail}
                        onChange={(e) => setNewTeamAdminEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Assign an existing user as the team admin. They will be able to manage members and API keys.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setCreateTeamDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateTeam}
                      disabled={!newTeamName.trim()}
                    >
                      Create Team
                    </Button>
                  </div>
                </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {teamsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2">Loading teams...</span>
              </div>
            ) : teams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No teams created yet. Click "Create Team" to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {teams.map((team) => (
                  <Card key={team.id} className="glass-subtle">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {team.description || 'No description'}
                          </CardDescription>
                        </div>
                        <Badge variant={team.is_active ? 'default' : 'secondary'}>
                          {team.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Created by:</span>
                          <span className="font-medium">
                            {team.created_by_profile?.username || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Members:</span>
                          <span className="font-medium">
                            {team.team_members?.[0]?.count || 0}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium">
                            {new Date(team.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            // Navigate to team dashboard
                            window.location.href = `/admin/teams/${team.id}`
                          }}
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTeam(team.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Database Overview (Super Admin Only) */}
      {userRole === 'super_admin' && databaseStats && (
        <Card className="glass border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2 text-slate-800">
              <Database className="w-5 h-5 text-blue-600" />
              Database Overview
            </CardTitle>
            <CardDescription className="text-slate-600">
              System health and database statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dbLoading ? (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-slate-700">Loading database stats...</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Key Metrics Cards */}
                <div className="bg-white/70 p-3 rounded-lg border border-slate-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {databaseStats.tables.profiles.count.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600">Users</div>
                </div>
                
                <div className="bg-white/70 p-3 rounded-lg border border-slate-200">
                  <div className="text-2xl font-bold text-green-600">
                    {databaseStats.tables.scans.count.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-600">Scans</div>
                </div>
                
                <div className="bg-white/70 p-3 rounded-lg border border-slate-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {databaseStats.health.scanSuccessRate}%
                  </div>
                  <div className="text-xs text-slate-600">Success Rate</div>
                </div>
                
                <div className="bg-white/70 p-3 rounded-lg border border-slate-200">
                  <div className="text-2xl font-bold text-orange-600">
                    ${databaseStats.tables.payments.totalRevenue.toFixed(0)}
                  </div>
                  <div className="text-xs text-slate-600">Revenue</div>
                </div>
              </div>
            )}
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Last updated: {new Date(databaseStats.lastUpdated).toLocaleString()}
              </div>
              <div className="text-xs text-slate-500">
                Total Records: {databaseStats.size.totalRecords.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone and will also delete all their scans and data.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <UserX className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold">{userToDelete.username}</h3>
                  <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
                  <Badge variant={userToDelete.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                    {roleLabels[userToDelete.role]}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={deleting}
              className="flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete User
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

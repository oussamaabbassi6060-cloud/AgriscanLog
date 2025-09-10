import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withAdminAuth } from "@/lib/admin-middleware"

async function handleStats(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (usersError) {
      console.error('Error fetching users count:', usersError)
    }

    // Get total scans count
    const { count: totalScans, error: scansError } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })

    if (scansError) {
      console.error('Error fetching scans count:', scansError)
    }

    // Get users by role
    const { data: usersByRole, error: roleError } = await supabase
      .from('profiles')
      .select('role')

    if (roleError) {
      console.error('Error fetching users by role:', roleError)
    }

    const roleStats = usersByRole?.reduce((acc: Record<string, number>, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    }, {}) || {}

    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: recentUsers, error: recentUsersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (recentUsersError) {
      console.error('Error fetching recent users:', recentUsersError)
    }

    // Get recent scans (last 30 days)
    const { count: recentScans, error: recentScansError } = await supabase
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (recentScansError) {
      console.error('Error fetching recent scans:', recentScansError)
    }

    // Get scan results distribution
    const { data: scanResults, error: scanResultsError } = await supabase
      .from('scans')
      .select('result, disease')

    if (scanResultsError) {
      console.error('Error fetching scan results:', scanResultsError)
    }

    const healthyScans = scanResults?.filter(scan => 
      scan.result === 'Healthy' || scan.disease === 'healthy'
    ).length || 0

    const diseaseScans = (scanResults?.length || 0) - healthyScans

    // Get top diseases
    const diseaseCount: Record<string, number> = {}
    scanResults?.forEach(scan => {
      if (scan.disease && scan.disease !== 'healthy') {
        diseaseCount[scan.disease] = (diseaseCount[scan.disease] || 0) + 1
      }
    })

    const topDiseases = Object.entries(diseaseCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([disease, count]) => ({ disease, count }))

    // Get user growth over last 12 months
    const userGrowthData = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString())

      userGrowthData.push({
        month: startOfMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        users: count || 0
      })
    }

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalScans: totalScans || 0,
        recentUsers: recentUsers || 0,
        recentScans: recentScans || 0,
        healthyScans,
        diseaseScans,
        roleStats,
        topDiseases,
        userGrowthData
      }
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handleStats)

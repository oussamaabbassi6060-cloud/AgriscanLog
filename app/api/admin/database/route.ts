import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withSuperAdminAuth } from "@/lib/admin-middleware"

async function handleDatabaseStats(req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get detailed database statistics
    const promises = [
      // Profiles table stats
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('role, created_at'),
      
      // Scans table stats
      supabase.from('scans').select('*', { count: 'exact', head: true }),
      supabase.from('scans').select('disease, result, created_at'),
      
      // Check if payments table exists and get stats
      supabase.from('payments').select('*', { count: 'exact', head: true }).then(
        result => result,
        () => ({ count: 0, error: null }) // Handle table not existing
      ),
      supabase.from('payments').select('amount, created_at').then(
        result => result,
        () => ({ data: [], error: null }) // Handle table not existing
      ),
    ]

    const [
      { count: totalProfiles },
      { data: profilesData },
      { count: totalScans },
      { data: scansData },
      { count: totalPayments },
      { data: paymentsData }
    ] = await Promise.all(promises)

    // Process profiles data
    const roleDistribution = profilesData?.reduce((acc: Record<string, number>, profile) => {
      acc[profile.role] = (acc[profile.role] || 0) + 1
      return acc
    }, {}) || {}

    // Process scans data
    const healthyScansCount = scansData?.filter(scan => 
      scan.result === 'Healthy' || scan.disease === 'healthy'
    ).length || 0

    const diseaseScansCount = (scansData?.length || 0) - healthyScansCount

    // Top diseases
    const diseaseCount: Record<string, number> = {}
    scansData?.forEach(scan => {
      if (scan.disease && scan.disease !== 'healthy') {
        diseaseCount[scan.disease] = (diseaseCount[scan.disease] || 0) + 1
      }
    })

    const topDiseases = Object.entries(diseaseCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)

    // Monthly growth data
    const getMonthlyData = (data: any[], dateField: string) => {
      const monthlyCount: Record<string, number> = {}
      data?.forEach(item => {
        if (item[dateField]) {
          const month = new Date(item[dateField]).toISOString().slice(0, 7) // YYYY-MM
          monthlyCount[month] = (monthlyCount[month] || 0) + 1
        }
      })
      return monthlyCount
    }

    const monthlyUsers = getMonthlyData(profilesData || [], 'created_at')
    const monthlyScans = getMonthlyData(scansData || [], 'created_at')

    // Payment statistics
    const totalRevenue = paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
    const monthlyPayments = getMonthlyData(paymentsData || [], 'created_at')

    // Database size estimation (approximate)
    const dbSizeEstimate = {
      profiles: totalProfiles || 0,
      scans: totalScans || 0,
      payments: totalPayments || 0,
      totalRecords: (totalProfiles || 0) + (totalScans || 0) + (totalPayments || 0)
    }

    // System health indicators
    const systemHealth = {
      activeUsers: roleDistribution.user || 0,
      adminUsers: roleDistribution.admin || 0,
      superAdminUsers: roleDistribution.super_admin || 0,
      scanSuccessRate: scansData?.length ? 
        Math.round((healthyScansCount / scansData.length) * 100) : 0,
      avgScansPerUser: totalProfiles ? 
        Math.round((totalScans || 0) / totalProfiles * 100) / 100 : 0
    }

    return NextResponse.json({
      database: {
        tables: {
          profiles: {
            count: totalProfiles || 0,
            roleDistribution,
            monthlyGrowth: monthlyUsers
          },
          scans: {
            count: totalScans || 0,
            healthyCount: healthyScansCount,
            diseaseCount: diseaseScansCount,
            topDiseases,
            monthlyGrowth: monthlyScans
          },
          payments: {
            count: totalPayments || 0,
            totalRevenue,
            monthlyGrowth: monthlyPayments
          }
        },
        size: dbSizeEstimate,
        health: systemHealth,
        lastUpdated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Database stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch database statistics' },
      { status: 500 }
    )
  }
}

async function handleDatabaseMaintenance(req: NextRequest) {
  try {
    const { action } = await req.json()
    const supabase = await createClient()

    switch (action) {
      case 'vacuum':
        // Note: VACUUM cannot be run in a transaction in PostgreSQL
        // This would need to be done at the database level, not through Supabase
        return NextResponse.json({
          message: 'Database vacuum would need to be performed at the PostgreSQL level',
          action: 'vacuum'
        })

      case 'analyze':
        // Update table statistics
        return NextResponse.json({
          message: 'Database analysis would need to be performed at the PostgreSQL level',
          action: 'analyze'
        })

      case 'cleanup_old_data':
        // Clean up old data (e.g., scans older than 2 years)
        const twoYearsAgo = new Date()
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

        const { count: oldScansCount } = await supabase
          .from('scans')
          .select('*', { count: 'exact', head: true })
          .lt('created_at', twoYearsAgo.toISOString())

        return NextResponse.json({
          message: `Found ${oldScansCount || 0} scans older than 2 years`,
          action: 'cleanup_old_data',
          details: {
            oldScansFound: oldScansCount || 0,
            cutoffDate: twoYearsAgo.toISOString()
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid maintenance action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Database maintenance error:', error)
    return NextResponse.json(
      { error: 'Database maintenance operation failed' },
      { status: 500 }
    )
  }
}

export const GET = withSuperAdminAuth(handleDatabaseStats)
export const POST = withSuperAdminAuth(handleDatabaseMaintenance)

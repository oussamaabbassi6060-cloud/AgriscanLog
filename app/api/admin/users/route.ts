import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withAdminAuth, getAdminUserFromRequest } from "@/lib/admin-middleware"

async function handleGetUsers(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const search = url.searchParams.get('search') || ''
    const role = url.searchParams.get('role') || ''

    const supabase = await createClient()
    
    let query = supabase
      .from('profiles')
      .select('id, clerk_id, username, email, role, points, created_at, updated_at')
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply role filter
    if (role && ['user', 'admin', 'super_admin'].includes(role)) {
      query = query.eq('role', role)
    }

    // Apply pagination
    const from = (page - 1) * limit
    query = query.range(from, from + limit - 1)

    const { data: users, error: usersError } = await query

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (search) {
      countQuery = countQuery.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
    }

    if (role && ['user', 'admin', 'super_admin'].includes(role)) {
      countQuery = countQuery.eq('role', role)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error('Error fetching users count:', countError)
    }

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

async function handleDeleteUser(req: NextRequest) {
  try {
    const { userId: targetUserId } = await req.json()
    
    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const currentUser = getAdminUserFromRequest(req)
    
    // Prevent self-deletion
    if (currentUser?.id === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the target user first to check their role
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('id, role, email, username')
      .eq('id', targetUserId)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Only super admins can delete other admins or super admins
    if (targetUser.role !== 'user' && currentUser?.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can delete admin users' },
        { status: 403 }
      )
    }

    // The database trigger will prevent super admin deletion, but let's add a client-side check too
    if (targetUser.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin users cannot be deleted' },
        { status: 403 }
      )
    }

    // Delete the user (this will cascade delete their scans and payments)
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', targetUserId)

    if (deleteError) {
      console.error('Error deleting user:', deleteError)
      
      // Check if it's the super admin protection trigger
      if (deleteError.message?.includes('Super admin users cannot be deleted')) {
        return NextResponse.json(
          { error: 'Super admin users cannot be deleted' },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `User ${targetUser.username} (${targetUser.email}) has been deleted successfully`
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handleGetUsers)
export const DELETE = withAdminAuth(handleDeleteUser)

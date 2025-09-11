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

    const currentUser = getAdminUserFromRequest(req)
    const isSuperAdmin = currentUser?.role === 'super_admin'

    const supabase = await createClient()
    
    // If not super admin, only select limited fields
    let query = supabase
      .from('profiles')
      .select(isSuperAdmin 
        ? 'id, clerk_id, username, email, role, points, created_at, updated_at'
        : 'id, username, role, created_at')
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // Apply role filter (exclude regular users from filter)
    if (role && ['admin', 'super_admin'].includes(role)) {
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

    if (role && ['admin', 'super_admin'].includes(role)) {
      countQuery = countQuery.eq('role', role)
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) {
      console.error('Error fetching users count:', countError)
    }

    // Mask sensitive data for non-super admins
    const sanitizedUsers = (users || []).map(user => {
      if (!isSuperAdmin) {
        return {
          ...user,
          email: undefined,
          points: undefined,
          clerk_id: undefined
        }
      }
      return user
    })

    return NextResponse.json({
      users: sanitizedUsers,
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

async function handleUpdateUser(req: NextRequest) {
  try {
    const { userId: targetUserId, role: newRole } = await req.json()
    
    if (!targetUserId || !newRole) {
      return NextResponse.json(
        { error: 'User ID and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!['user', 'admin', 'super_admin'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be user, admin, or super_admin' },
        { status: 400 }
      )
    }

    const currentUser = getAdminUserFromRequest(req)
    
    // Prevent self role change
    if (currentUser?.id === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the target user first to check their current role
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

    // Role update permission checks
    if (currentUser?.role === 'super_admin') {
      // Super admin can only set roles to 'admin' or 'user', not 'super_admin'
      if (newRole === 'super_admin') {
        return NextResponse.json(
          { error: 'Cannot promote users to super admin role' },
          { status: 403 }
        )
      }
      // Super admin can change any user's role to admin or user
    } else if (currentUser?.role === 'admin') {
      // Admin can only set role to 'user'
      if (newRole !== 'user') {
        return NextResponse.json(
          { error: 'Admins can only set role to user' },
          { status: 403 }
        )
      }
      // Admin cannot change other admin's roles
      if (targetUser.role === 'admin' || targetUser.role === 'super_admin') {
        return NextResponse.json(
          { error: 'You cannot change the role of admin or super admin users' },
          { status: 403 }
        )
      }
    } else {
      // Regular users shouldn't have access to this endpoint at all
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Prevent changing super admin's role
    if (targetUser.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin role cannot be changed' },
        { status: 403 }
      )
    }

    // Update the user's role
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .select('id, username, email, role')
      .single()

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `User ${updatedUser.username} role updated to ${newRole}`,
      user: updatedUser
    })

  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export const GET = withAdminAuth(handleGetUsers)
export const DELETE = withAdminAuth(handleDeleteUser)
export const PUT = withAdminAuth(handleUpdateUser)

import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export type UserRole = 'user' | 'admin' | 'super_admin'

export interface AdminUser {
  id: string
  clerk_id: string
  username: string
  email: string
  role: UserRole
  points: number
  created_at: string
}

/**
 * Get the current user's role from the database
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('clerk_id', userId)
      .single()

    if (error || !data) return null
    return data.role as UserRole
  } catch (error) {
    console.error('Error fetching user role:', error)
    return null
  }
}

/**
 * Get the current user's full admin profile
 */
export async function getCurrentAdminUser(): Promise<AdminUser | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, clerk_id, username, email, role, points, created_at')
      .eq('clerk_id', userId)
      .single()

    if (error || !data) return null
    return data as AdminUser
  } catch (error) {
    console.error('Error fetching admin user:', error)
    return null
  }
}

/**
 * Check if the current user has admin privileges (admin or super_admin)
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole()
  return role === 'admin' || role === 'super_admin'
}

/**
 * Check if the current user is a super admin
 */
export async function isSuperAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole()
  return role === 'super_admin'
}

/**
 * Middleware function to protect admin routes
 * Returns true if user can access, false otherwise
 */
export async function requireAdmin(): Promise<{ allowed: boolean; user?: AdminUser; error?: string }> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { allowed: false, error: 'Authentication required' }
    }

    const user = await getCurrentAdminUser()
    if (!user) {
      return { allowed: false, error: 'User profile not found' }
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return { allowed: false, error: 'Admin privileges required' }
    }

    return { allowed: true, user }
  } catch (error) {
    console.error('Admin middleware error:', error)
    return { allowed: false, error: 'Internal server error' }
  }
}

/**
 * Middleware function to protect super admin routes
 */
export async function requireSuperAdmin(): Promise<{ allowed: boolean; user?: AdminUser; error?: string }> {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return { allowed: false, error: 'Authentication required' }
    }

    const user = await getCurrentAdminUser()
    if (!user) {
      return { allowed: false, error: 'User profile not found' }
    }

    if (user.role !== 'super_admin') {
      return { allowed: false, error: 'Super admin privileges required' }
    }

    return { allowed: true, user }
  } catch (error) {
    console.error('Super admin middleware error:', error)
    return { allowed: false, error: 'Internal server error' }
  }
}

/**
 * HOC for API routes that require admin access
 */
export function withAdminAuth<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const { allowed, user, error } = await requireAdmin()
    
    if (!allowed) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: error === 'Authentication required' ? 401 : 403 }
      )
    }

    // Add user info to request headers for handler to use
    req.headers.set('x-admin-user', JSON.stringify(user))
    return handler(req, ...args)
  }
}

/**
 * HOC for API routes that require super admin access
 */
export function withSuperAdminAuth<T extends any[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    const { allowed, user, error } = await requireSuperAdmin()
    
    if (!allowed) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: error === 'Authentication required' ? 401 : 403 }
      )
    }

    // Add user info to request headers for handler to use
    req.headers.set('x-admin-user', JSON.stringify(user))
    return handler(req, ...args)
  }
}

/**
 * Utility to get admin user from request headers (when using withAdminAuth)
 */
export function getAdminUserFromRequest(req: NextRequest): AdminUser | null {
  try {
    const userHeader = req.headers.get('x-admin-user')
    return userHeader ? JSON.parse(userHeader) : null
  } catch {
    return null
  }
}

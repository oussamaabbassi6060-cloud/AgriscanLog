# Super Admin Setup Guide

This guide explains how to set up and use the super admin functionality in your AgriScan application.

## Overview

The super admin system provides:

- **Protected Super Admin Users**: Cannot be deleted from the database
- **Admin Dashboard**: Complete user management and system statistics
- **Database Analytics**: Deep insights into database health and statistics (super admin only)
- **User Management**: Ability to view, search, filter, and delete users
- **Role-Based Access**: Different privilege levels (user, admin, super_admin)

## Database Setup

### 1. Run the Database Migration

First, apply the role-based migration to your Supabase database:

```sql
-- Run this in your Supabase SQL editor
-- File: scripts/012_add_roles_to_profiles.sql
```

Execute the SQL migration script `012_add_roles_to_profiles.sql` which will:
- Add a `role` column to the profiles table
- Create database triggers to protect super admin users
- Set up proper indexes and constraints

### 2. Create Your Super Admin User

After running the migration, manually set up your super admin user:

```sql
-- Replace 'your-email@domain.com' with your actual email
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'your-email@domain.com';
```

**Important**: The super admin user must already exist in your profiles table. Make sure to:
1. Sign up normally through your application first
2. Then promote the user to super admin using the SQL above

## User Roles

### User (`user`)
- Default role for all new users
- Access to personal dashboard, scans, and analytics
- Cannot access admin features

### Admin (`admin`) 
- Can view admin dashboard
- Can manage regular users (view, delete)
- Cannot delete other admins or super admins
- Cannot access database management features

### Super Admin (`super_admin`)
- Full system access
- Can manage all users including admins
- Access to database analytics and statistics
- Cannot be deleted (protected by database triggers)
- Can view detailed system health metrics

## Features by Role

### Admin Dashboard Features

#### For Admins:
- ✅ View system statistics (users, scans, health metrics)
- ✅ User management (view all users)
- ✅ Delete regular users
- ✅ Search and filter users
- ✅ View charts and analytics
- ❌ Database management
- ❌ Delete admin users
- ❌ Revenue statistics

#### For Super Admins:
- ✅ All admin features +
- ✅ Database overview and statistics
- ✅ Delete admin users (but not other super admins)
- ✅ System health monitoring
- ✅ Revenue and payment statistics
- ✅ Database maintenance information
- ✅ Complete system analytics

## Security Features

### Database-Level Protection
1. **Deletion Prevention**: Super admin users cannot be deleted (database trigger)
2. **Role Protection**: Super admin role cannot be changed or removed
3. **Escalation Prevention**: Regular users cannot be promoted to super admin via API

### Application-Level Protection
1. **Route Protection**: Admin routes require proper authentication
2. **Self-Deletion Prevention**: Users cannot delete their own accounts
3. **Permission Checks**: Role verification on all admin operations

## API Endpoints

### Admin Routes (`/api/admin/`)
- `GET /api/admin/stats` - Get system statistics (admin+)
- `GET /api/admin/users` - List all users with pagination (admin+)
- `DELETE /api/admin/users` - Delete a user (admin+)
- `GET /api/admin/database` - Database statistics (super admin only)
- `POST /api/admin/database` - Database maintenance (super admin only)

### Authentication
All admin routes use the `withAdminAuth` or `withSuperAdminAuth` middleware for protection.

## Usage Guide

### Accessing the Admin Dashboard

1. **Log in** as an admin or super admin user
2. **Navigate** to your dashboard
3. **Click** on the "Admin" or "Super Admin" tab
4. **Explore** the available features based on your role

### Managing Users

1. **View Users**: All users are displayed with their roles and information
2. **Search Users**: Use the search box to find specific users
3. **Filter by Role**: Use the dropdown to filter by user role
4. **Delete Users**: Click the delete button (restrictions apply based on your role)

### Database Management (Super Admin Only)

1. **View Statistics**: See detailed database health metrics
2. **Monitor Growth**: Track user and scan growth over time
3. **Revenue Tracking**: Monitor payment and revenue statistics
4. **System Health**: Check success rates and user activity

## Testing the Setup

### 1. Verify Database Changes
```sql
-- Check if role column exists
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- Check current roles
SELECT role, COUNT(*) 
FROM profiles 
GROUP BY role;
```

### 2. Test Super Admin Protection
Try to delete the super admin user - it should fail:
```sql
-- This should fail with an error
DELETE FROM profiles WHERE role = 'super_admin';
```

### 3. Test Role Changes
Try to change the super admin role - it should fail:
```sql
-- This should fail with an error
UPDATE profiles SET role = 'user' WHERE role = 'super_admin';
```

## Troubleshooting

### Common Issues

1. **Admin tab not showing**
   - Check if user role is properly set in the database
   - Verify the dashboard component is receiving the role data

2. **API routes returning 401/403**
   - Ensure user is logged in via Clerk
   - Verify role is correctly set in profiles table
   - Check middleware is working

3. **Database triggers not working**
   - Make sure the migration ran successfully
   - Check if triggers exist: `SELECT * FROM information_schema.triggers WHERE event_object_table = 'profiles';`

4. **Super admin can be deleted**
   - Check if the prevention trigger is active
   - Verify the role is exactly 'super_admin' (case sensitive)

### Logs and Debugging

Enable detailed logging by checking:
- Browser console for client-side errors
- Server logs for API route errors
- Supabase logs for database errors

## Security Considerations

1. **Super Admin Account Security**
   - Use strong authentication (2FA recommended)
   - Limit super admin accounts to minimum necessary
   - Regular security audits of admin activities

2. **Database Access**
   - Super admin dashboard shows sensitive data
   - Ensure proper network security
   - Consider additional access controls for production

3. **Audit Trail**
   - Consider adding audit logging for admin actions
   - Monitor admin user activities
   - Regular review of user role changes

## Maintenance

### Regular Tasks
1. **Monitor system health** via super admin dashboard
2. **Review user roles** periodically
3. **Check database performance** metrics
4. **Update admin users** as needed

### Backup Considerations
- Always backup database before role changes
- Test role modifications in staging first
- Keep record of all super admin users

---

## Support

If you encounter any issues with the super admin functionality:

1. Check this guide first
2. Review database migration status
3. Verify role assignments
4. Check API route accessibility
5. Test with different user roles

The system is designed to be secure by default - super admin users are protected at the database level and cannot be deleted through normal operations.

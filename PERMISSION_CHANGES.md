# Permission System Changes Summary

## Overview
The application now has a simplified 3-tier permission system:

1. **Super Admin** (System-wide role)
   - Can create and manage teams
   - Can view all user information and tokens
   - Can access all administrative functions
   - Cannot be deleted from the system

2. **Team Admin** (Team-level role)
   - Can add/remove team members
   - Can manage team settings
   - Can view tokens of team members within their team
   - Cannot create new teams (only super admin can)

3. **Team Member** (Team-level role)
   - Can view shared tokens within their team
   - Can use team resources
   - Cannot manage team settings or members

## Key Changes Made

### 1. Team Roles Simplified
- **Removed roles**: `owner` and `viewer` from teams
- **Kept roles**: `admin` and `member` for team management
- **System role**: Only `super_admin` has system-wide privileges

### 2. Team Creation Restricted
- Only `super_admin` can create new teams
- Team admins can only manage existing teams they're assigned to

### 3. Token Sharing Within Teams
- All team members (admin and member) can view each other's AgriScan tokens
- Tokens are only visible within the team context
- Non-team members cannot access tokens

### 4. User Management Changes
- Removed the ability to assign `user` or `admin` roles
- Only `super_admin` role assignment is managed at system level
- Team roles are managed separately within each team

### 5. Information Protection
- Non-super admins cannot see:
  - Email addresses of users outside their team
  - Credit/points information of other users
  - Full tokens of users outside their team
- Sensitive information is masked with bullets (••••)

### 6. Fixed Team Member Count
- Team cards now correctly display member counts from database
- Fixed the query to properly aggregate team member data

## Files Modified

1. **components/team-admin-dashboard.tsx**
   - Removed `owner` and `viewer` roles
   - Updated permission checks
   - Added `isSuperAdmin` prop
   - Protected token visibility

2. **app/admin/teams/[teamId]/page.tsx**
   - Updated role handling for super admin
   - Pass `isSuperAdmin` prop to dashboard

3. **app/api/teams/route.ts**
   - Restricted team creation to super_admin only

4. **app/api/teams/tokens/route.ts**
   - Allow all team members to view tokens within their team

5. **components/admin-dashboard.tsx**
   - Removed user/admin role assignment UI
   - Protected sensitive user information display
   - Fixed team member count display

6. **app/api/admin/users/route.ts**
   - Protected sensitive user data from non-super admins
   - Limited field selection based on user role

7. **app/team-admin/page.tsx**
   - Removed `owner` role references
   - Updated to only show teams where user is admin

## Testing Checklist

- [ ] Super admin can create teams
- [ ] Team admin cannot create teams
- [ ] Team members can view shared tokens
- [ ] Non-team members cannot see team tokens
- [ ] User Management doesn't show role assignment options
- [ ] Sensitive information is hidden from non-super admins
- [ ] Team member counts display correctly
- [ ] All role badges show correct colors

## Database Migration Notes

If you have existing data with `owner` or `viewer` roles, run these SQL migrations:

```sql
-- Update owner roles to admin
UPDATE team_members 
SET role = 'admin' 
WHERE role = 'owner';

-- Update viewer roles to member
UPDATE team_members 
SET role = 'member' 
WHERE role = 'viewer';
```

# Team Management System Guide

## Overview
The team management system allows organizations to create teams for sharing API keys securely among members. This enables collaborative use of third-party services while maintaining control and oversight.

## Role Hierarchy

### 1. Super Admin
- **Who**: System administrators (designated by role in database)
- **Capabilities**:
  - Create new teams
  - Assign team admins when creating teams
  - View and manage all teams across the platform
  - Delete teams if necessary
  - Override any team-level permissions
  - Access global system statistics

### 2. Team Admin
- **Who**: Users assigned by Super Admin to manage specific teams
- **Capabilities**:
  - Add/remove team members
  - Manage shared API keys (add, update, delete)
  - Send team invitations
  - Change member roles (except owner role)
  - View team activity logs
  - Access team dashboard

### 3. Team Member
- **Who**: Regular users added to teams
- **Capabilities**:
  - View and use shared API keys
  - View other team members
  - Access team resources
  - Leave the team

### 4. Team Viewer
- **Who**: Users with read-only access
- **Capabilities**:
  - View team information
  - Cannot use API keys or make changes

## Primary Use Case: API Key Sharing

### Why Teams?
Teams are designed to solve the problem of sharing expensive API keys (like OpenAI, Anthropic, etc.) among multiple users while maintaining:
- **Security**: Keys are encrypted and access-controlled
- **Accountability**: Usage tracking per user
- **Cost Control**: Usage limits and monitoring
- **Flexibility**: Easy to add/remove access

### How It Works

1. **Team Creation** (Super Admin)
   ```
   Dashboard → Team Management → Create Team
   - Enter team name
   - Add description
   - Assign team admin (optional)
   ```

2. **Adding API Keys** (Team Admin)
   ```
   Team Dashboard → API Keys Tab → Add API Key
   - Name the key (e.g., "OpenAI Production")
   - Select provider
   - Enter the actual API key
   - Set usage limits (optional)
   ```

3. **Adding Members** (Team Admin)
   ```
   Team Dashboard → Members Tab → Add Member
   - Enter user email
   - Select role (admin/member/viewer)
   - Send invitation
   ```

4. **Using Shared Keys** (Team Members)
   - Access team dashboard
   - View available API keys
   - Click eye icon to reveal key when needed
   - Copy key for use in applications

## Security Features

### Encryption
- All API keys are encrypted using AES-256 encryption
- Keys are only decrypted when explicitly requested
- Encryption key should be stored in environment variables

### Access Control
- Role-based permissions at team level
- API endpoints verify permissions
- Audit logging for all actions

### Usage Tracking
- Track who uses which API key
- Monitor usage frequency
- Set and enforce usage limits
- Automatic deactivation when limits reached

## Database Structure

### Core Tables
- `teams` - Team information
- `team_members` - Team membership and roles
- `team_api_keys` - Encrypted shared API keys
- `team_invitations` - Pending invitations
- `team_activities` - Audit log

## Setup Instructions

### 1. Database Migration
Run the migration scripts in Supabase SQL Editor:
```sql
-- Run scripts in order:
-- 015_create_teams_structure.sql
-- 016_fix_teams_rls_policies.sql
```

### 2. Environment Variables
Add to `.env.local`:
```env
ENCRYPTION_KEY=your-32-character-encryption-key-here
RESEND_API_KEY=your-resend-api-key-for-invitations
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. Assign Super Admin
In Supabase SQL Editor:
```sql
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE email = 'admin@yourdomain.com';
```

## Common Workflows

### For Super Admins
1. Create teams for different departments/projects
2. Assign trusted users as team admins
3. Monitor team usage and costs
4. Remove inactive teams

### For Team Admins
1. Add API keys as they're purchased
2. Invite team members who need access
3. Monitor usage to prevent abuse
4. Rotate keys periodically for security
5. Remove members who no longer need access

### For Team Members
1. Accept team invitation
2. Access team dashboard
3. Use shared API keys for authorized purposes
4. Report any issues to team admin

## Best Practices

### API Key Management
- Use descriptive names for keys
- Set appropriate usage limits
- Rotate keys periodically
- Remove unused keys
- Monitor usage patterns

### Team Organization
- Create teams by project or department
- Keep team sizes manageable
- Regularly review membership
- Document key purposes

### Security
- Never share keys outside the platform
- Use strong encryption keys
- Enable audit logging
- Review activity logs regularly
- Remove inactive members promptly

## Troubleshooting

### "Row-level security policy" Error
Run the RLS fix script or disable RLS:
```sql
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
-- Repeat for other team tables
```

### Team Creation Fails
Verify:
- User is super admin
- Team name is unique
- Database tables exist

### API Key Decryption Fails
Check:
- ENCRYPTION_KEY environment variable
- Key was encrypted with same key
- No corruption in database

## Future Enhancements
- Billing integration for cost allocation
- Advanced usage analytics
- Key rotation automation
- Slack/email notifications
- API key request workflow
- Budget alerts per team

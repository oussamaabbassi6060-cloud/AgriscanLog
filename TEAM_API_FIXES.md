# Team Management & AgriScan API Key Fixes

## Summary of Changes

### 1. 🔑 **AgriScan API Key Clarification**
Teams now properly share **AgriScan API keys** for plant disease detection, not OpenAI or other services.

#### UI Updates in Team Admin Dashboard:
- Changed "API Keys" to "AgriScan API Keys"
- Updated dialog title to "Add AgriScan API Key"
- Changed description to clarify these are for plant disease detection
- Updated API provider options to:
  - AgriScan API (standard)
  - AgriScan Premium
  - AgriScan Enterprise
- Changed placeholder from `sk-...` to `agri_...` for API keys

### 2. 🔓 **Simplified Team Permissions**

#### Team Creation:
- **Before:** Only super admins could create teams
- **After:** Both admins and super admins can create teams
- This allows for more flexible team management

#### API Key Management:
- **Removed:** Restriction preventing super admins from adding API keys
- **Now:** All team members with appropriate permissions can share their AgriScan API keys
- Teams can freely share API keys among members for collaborative plant scanning

### 3. 🗑️ **Fixed Team Deletion Issues**

#### Problem:
Foreign key constraint errors when deleting teams due to related records in `team_activities` table.

#### Solution:
Implemented proper cascade deletion that removes records in this order:
1. Team activities
2. Team API keys
3. Team members
4. Team invitations
5. Finally, the team itself

This ensures no orphaned records and prevents constraint violations.

### 4. 📝 **User Role Permissions Summary**

| User Type | Can Create Teams | Can Manage Teams | Can Share API Keys |
|-----------|------------------|------------------|-------------------|
| Super Admin | ✅ Yes | ✅ All teams | ✅ Yes |
| Admin | ✅ Yes | ✅ Own teams | ✅ Yes |
| User | ❌ No | ✅ Member teams | ✅ Yes (in their teams) |

### 5. 🎯 **Purpose Clarification**

The team feature is designed for:
- **Sharing AgriScan API keys** between team members
- **Collaborative plant disease detection** using shared API access
- **Resource pooling** where team members can use each other's API quotas
- **Simple team management** without excessive security restrictions

## Files Modified

1. **`/components/team-admin-dashboard.tsx`**
   - Updated UI labels to specify AgriScan API keys
   - Changed provider options to AgriScan tiers
   - Updated placeholder text and descriptions

2. **`/app/api/teams/api-keys/route.ts`**
   - Removed super admin restriction on adding API keys
   - Simplified permission checks

3. **`/app/api/teams/route.ts`**
   - Allowed admins to create teams (not just super admins)
   - Fixed team deletion with proper cascade handling
   - Added proper cleanup of related records

## Testing Checklist

- [ ] Create a team as an admin user
- [ ] Add an AgriScan API key to the team
- [ ] Share the API key with team members
- [ ] Verify team members can view/use shared API keys
- [ ] Delete a team and verify no constraint errors
- [ ] Confirm UI shows "AgriScan API" instead of "OpenAI"

## Benefits

1. **Clearer Purpose:** Users understand teams are for sharing AgriScan services
2. **Better Flexibility:** Admins can manage their own teams
3. **Simplified Permissions:** Removed unnecessary restrictions
4. **Reliable Deletion:** No more database constraint errors
5. **Collaborative Focus:** Teams can effectively share plant scanning resources

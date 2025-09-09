# Clerk Migration Guide

This guide explains how to complete the migration from Supabase authentication to Clerk for email verification and user management.

## What Has Been Changed

### 1. Dependencies Added
- `@clerk/nextjs` - Clerk authentication for Next.js
- `svix` - Webhook verification for Clerk webhooks

### 2. Files Modified
- `app/layout.tsx` - Added ClerkProvider wrapper
- `components/login-form.tsx` - Updated to use Clerk sign-in
- `components/registration-form.tsx` - Updated to use Clerk sign-up
- `middleware.ts` - Replaced Supabase middleware with Clerk middleware
- `lib/auth.ts` - Now re-exports Clerk authentication functions

### 3. Files Added
- `lib/clerk-auth.ts` - Clerk-based authentication utilities
- `components/clerk-email-verification.tsx` - Clerk email verification component
- `app/api/webhooks/clerk/route.ts` - Webhook handler for profile creation
- `scripts/009_add_clerk_id_to_profiles.sql` - Database migration script
- `.env.example` - Environment variables example

## Setup Instructions

### Step 1: Create Clerk Application
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Choose "Email" as the authentication method
4. Copy your publishable key and secret key

### Step 2: Configure Environment Variables
Create a `.env.local` file with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_webhook_secret

# Supabase (still needed for database)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Update Database Schema
Run the migration script to add Clerk support to your database:

```sql
-- Execute the contents of scripts/009_add_clerk_id_to_profiles.sql
-- This adds the clerk_id column and necessary functions
```

### Step 4: Configure Clerk Webhooks
1. In your Clerk Dashboard, go to "Webhooks"
2. Add a new webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to the `user.created` event
4. Copy the webhook secret to your environment variables

### Step 5: Update Clerk Settings
In your Clerk Dashboard:
1. Go to "User & Authentication" → "Email, Phone, Username"
2. Enable "Email address" as required
3. Enable "Username" as optional
4. Go to "User & Authentication" → "Restrictions"
5. Enable email verification if desired

## Key Differences from Supabase

### Authentication Flow
- **Registration**: Users enter details → Clerk sends verification email → User enters code → Profile created automatically
- **Login**: Standard email/password → Immediate access (if email verified)

### Profile Management
- User profiles are still stored in your Supabase database
- A `clerk_id` column links Clerk users to your profiles
- Profiles are created automatically via webhook when users sign up

### Email Verification
- Handled entirely by Clerk
- Users receive a 6-digit code via email
- No need to handle email templates or SMTP configuration

## Testing the Integration

### 1. Registration Flow
1. Start your development server: `npm run dev`
2. Go to your application's registration page
3. Fill out the registration form
4. You should receive a verification email with a 6-digit code
5. Enter the code to complete registration
6. A profile should be created automatically in your database

### 2. Login Flow
1. Try logging in with the registered email and password
2. You should be redirected to the main application
3. Your profile data should be loaded correctly

### 3. Database Verification
Check your Supabase database to ensure:
- A new profile was created with a `clerk_id`
- The profile has the correct user data (username, email, gender, age)
- A unique token was generated for the user

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Ensure your webhook URL is publicly accessible
   - Check that you've subscribed to the `user.created` event
   - Verify the webhook secret matches your environment variable

2. **Profile not created after registration**
   - Check your webhook logs in the Clerk Dashboard
   - Verify your database connection and permissions
   - Check the server logs for any errors

3. **Login issues**
   - Ensure the user has verified their email address
   - Check that the Clerk session is being set correctly
   - Verify your environment variables are correct

### Debug Tips
- Use the browser's developer tools to check for console errors
- Check the Clerk Dashboard for webhook delivery status
- Use `console.log` statements in your webhook handler to debug profile creation

## Migration Benefits

### Advantages of Clerk
- **Better UX**: Modern, responsive authentication components
- **Less maintenance**: No need to manage email templates or SMTP
- **Security**: Industry-standard security practices built-in
- **Scalability**: Handles rate limiting and spam prevention automatically
- **Features**: Built-in support for social logins, MFA, and more

### What Stays the Same
- Your existing database schema (with additions)
- User data storage in Supabase
- Your application's core functionality
- User credits and points system

## Next Steps

After successful migration, consider:
1. Removing unused Supabase authentication code
2. Adding social login providers in Clerk
3. Implementing additional security features like 2FA
4. Customizing Clerk's appearance to match your brand

## Support

If you encounter issues during migration:
1. Check the Clerk documentation: https://clerk.com/docs
2. Review the webhook logs in Clerk Dashboard
3. Check your server and browser console for errors
4. Ensure all environment variables are correctly set

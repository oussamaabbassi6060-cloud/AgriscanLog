# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

AgriScan is an AI-powered crop analysis platform built with Next.js, TypeScript, and a hybrid Clerk + Supabase authentication system. The application allows users to upload crop images for health analysis using a points-based system.

## Architecture

### Frontend Stack
- **Framework**: Next.js 14 with App Router
- **UI Components**: Custom components built on Radix UI primitives
- **Styling**: TailwindCSS with custom glass morphism effects
- **Forms**: React Hook Form with Zod validation
- **Maps**: Leaflet for geolocation-based scan results
- **Charts**: Recharts for dashboard analytics

### Backend & Services
- **Authentication**: Clerk for user management and email verification
- **Database**: Supabase PostgreSQL for data persistence
- **API Routes**: Next.js API routes for validation and profile management
- **File Handling**: Client-side file upload with size limits

### Database Schema
The application uses three main tables:
- `profiles`: User data with Clerk ID mapping, points system, and API tokens
- `scans`: Crop analysis results with geolocation data
- `payments`: Points purchase transactions

### Authentication Flow
1. **Registration**: Clerk handles email verification → Profile creation via webhook/API
2. **Login**: Clerk authentication → Profile lookup via `clerk_id`
3. **Session**: Clerk middleware protects routes (`/dashboard`, `/profile`, `/scan`)

## Development Commands

### Core Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Database Migrations
SQL scripts in `/scripts/` directory handle schema changes:
```bash
# Apply migrations in order (001-011)
# Run via Supabase SQL editor or CLI
```

## Key Components Architecture

### Main Application Flow
- `app/page.tsx`: Central state management with step-based flow
- `components/registration-form.tsx`: Clerk-based user registration
- `components/login-form.tsx`: Clerk authentication
- `components/agriscan-testing.tsx`: Core scanning functionality
- `components/dashboard.tsx`: User analytics and scan history
- `components/map-view.tsx`: Geolocation visualization

### Authentication System
The app uses a hybrid approach:
- **Clerk**: Email verification, session management, user metadata
- **Supabase**: Profile storage, business logic, points system
- **Integration**: `lib/clerk-auth.ts` bridges Clerk users to Supabase profiles

### Points System
- Users start with 1000 points
- Each scan costs 5 points
- Points can be purchased through `components/payment-form.tsx`
- Balance tracked in Supabase `profiles.points`

## Configuration Files

### Environment Variables Required
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Next.js Configuration
- TypeScript and ESLint errors ignored during builds (development convenience)
- Images unoptimized for broader hosting compatibility
- No custom webpack modifications

## Testing Approach

### Running Tests
Currently no automated test suite. Manual testing workflow:

1. **Registration Flow**: Test email verification with Clerk
2. **Authentication**: Verify profile creation and points allocation
3. **Scanning**: Upload images, verify point deduction and results storage
4. **Geolocation**: Test with/without location permissions
5. **Payment Flow**: Test points purchase simulation

### Key Test Scenarios
- User registration with email verification
- Login with existing accounts
- Image upload validation (size limits, file types)
- Points system (deduction, insufficient points handling)
- Geolocation fallback behavior
- Dashboard data visualization

## API Structure

### Custom API Routes
- `POST /api/check-username`: Username availability validation
- `POST /api/check-email`: Email availability check
- Missing: Profile management endpoints, scan result storage, webhook handlers

### Third-party Integrations
- **Clerk API**: User management, email verification
- **Supabase API**: Database operations via client/server SDKs
- **Leaflet/OpenStreetMap**: Map tiles and geolocation services

## Database Considerations

### Row Level Security
Current setup uses permissive policies for Clerk integration. Production deployment should implement proper RLS policies based on Clerk user IDs.

### Key Relationships
- `profiles.clerk_id` → Clerk user ID (unique identifier)
- `scans.user_id` → `profiles.id` (UUID foreign key)
- `payments.user_id` → `profiles.id` (UUID foreign key)

## Migration Notes

The codebase includes a detailed migration from Supabase Auth to Clerk (see `CLERK_MIGRATION_GUIDE.md`). Key considerations:
- Database schema changed to support Clerk IDs
- Authentication middleware completely replaced
- Profile creation now handled via Clerk webhooks
- Email verification delegated to Clerk service

## Development Patterns

### State Management
- Local component state with useState
- Prop drilling for shared data (points, user data)
- No global state management library

### Error Handling
- Try-catch blocks in API routes
- User-friendly error messages in forms
- Fallback behaviors for geolocation and API failures

### File Organization
- Components in `/components/` (flat structure)
- API routes in `/app/api/`
- Database scripts in `/scripts/`
- Utilities in `/lib/`

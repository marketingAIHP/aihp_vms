# AIHP VMS Production Runbook

This repository contains three deployable applications:

- `apps/api`: NestJS backend with Prisma
- `apps/web`: Next.js web app
- `apps/mobile`: Expo Android app

This guide is written so deployment can be run without needing Prisma internals.

## 1. Backend Deployment

The backend is a standard Node.js service.

### Install

```powershell
npm install
```

### Required environment variables

Copy from `apps/api/.env.example` into the deployment platform:

```env
PORT=3000
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://your-web-domain.com,https://your-mobile-web-preview-domain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=replace-with-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
SUPABASE_STORAGE_BUCKET=visitor-photos
```

### Build

```powershell
npm --workspace apps/api run build
```

### Prisma generate

```powershell
npm --workspace apps/api run prisma:generate
```

### Prisma migration deploy

```powershell
npm --workspace apps/api run prisma:migrate:deploy
```

### Run

```powershell
npm --workspace apps/api run start:prod
```

### Health check

```powershell
curl http://localhost:3000/health
```

Expected response is a healthy JSON payload from the Nest app.

## 2. Web Deployment

The web app is a Next.js App Router application intended for Vercel deployment.

### Required environment variables

Copy from `apps/web/.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
NEXT_PUBLIC_APP_URL=https://your-web-domain.com
NEXT_PUBLIC_WEB_BASE_URL=https://your-web-domain.com
ENABLE_DEMO_AUTH=false
```

### Install

```powershell
npm install
```

### Lint

```powershell
npm --workspace apps/web run lint
```

### Typecheck

```powershell
npm --workspace apps/web run typecheck
```

### Build

```powershell
npm --workspace apps/web run build
```

### Deploy to Vercel

```powershell
npx vercel --prod
```

Do not enable demo auth in production.

## 3. Android APK Build

The mobile app is Expo-based and currently targets Android.

### Required environment variables

Copy from `apps/mobile/.env.example`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=replace-with-anon-key
EXPO_PUBLIC_WEB_BASE_URL=https://your-web-domain.com
```

### Install

```powershell
npm install
```

### Typecheck

```powershell
npm --workspace apps/mobile run typecheck
```

### Start in Expo Go

```powershell
npm --workspace apps/mobile run start
```

### Build APK with EAS

```powershell
cd C:\AIHP_visitor_management\apps\mobile
eas build --platform android --profile production
```

Run EAS commands from `apps/mobile`, not the monorepo root. For a Google Play Store AAB:

```powershell
eas build --platform android --profile store
```

## 4. Supabase Setup

For Web/Android Realtime and Android background push delivery, complete
`PUSH_NOTIFICATIONS_SETUP.md` before creating the final APK.

The Supabase project already exists. Before production release, verify:

- Auth is enabled for the intended sign-in flow
- The `profiles`, `master_data`, `visits`, `notifications`, and `audit_logs` tables exist
- RLS is enabled on those tables
- Storage buckets exist and match the app configuration
- `SUPABASE_SERVICE_ROLE_KEY` is only used server-side

Run the repository SQL bundle once:

- File: [supabase/production_release.sql](C:/AIHP_visitor_management/supabase/production_release.sql)
- Where to run it: Supabase Dashboard -> SQL Editor -> New Query -> paste or upload the file contents -> Run

## 5. Environment Variables

Minimum production variables by app:

### API

- `PORT`
- `DATABASE_URL`
- `CORS_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET`

### Web

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_WEB_BASE_URL`
- `ENABLE_DEMO_AUTH=false`

### Mobile

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_KEY`
- `EXPO_PUBLIC_WEB_BASE_URL`

## 6. Database Migration

Current repository status:

- Prisma is configured in `apps/api`
- The web and mobile apps are already reading from Supabase-backed data
- Prisma is mapped to the existing Supabase schema; Supabase remains the source of truth

Release guidance:

- Apply the reviewed hardening scripts in `supabase/production_release.sql` and `supabase/final_security_hardening.sql`
- Run `npm --workspace apps/api run prisma:generate`
- Run `npm --workspace apps/api run prisma:migrate:deploy`

If Prisma deployment fails because the production database schema does not match `apps/api/prisma/schema.prisma`, stop the release and align the Prisma schema before pushing backend writes through Prisma in production.

## 7. Rollback

### Web

- Roll back to the previous Vercel deployment from the Vercel dashboard

### Backend

- Re-deploy the previously successful container/build artifact
- Restore the previous environment variables if they changed

### Database

- Restore from the latest Supabase backup or point-in-time recovery window if a database-level incident occurred

## 8. Backup

Before running the SQL bundle or new migrations:

- Export the latest production environment variables securely
- Confirm Supabase automated backups are enabled
- Take a manual database backup or snapshot if your plan supports it
- Preserve the previous successful Vercel deployment
- Preserve the previous backend artifact/image

## 9. Troubleshooting

### `prisma generate` fails

Cause:

- The environment cannot download Prisma engines

Fix:

- Re-run in CI or a machine with outbound access to `https://binaries.prisma.sh`

### Web login works locally but should not use demo accounts in production

Fix:

- Verify `ENABLE_DEMO_AUTH=false`
- Verify `NODE_ENV=production`

### Check-in photo uploads fail

Fix:

- Verify the configured Supabase bucket exists
- Verify `SUPABASE_SERVICE_ROLE_KEY` is valid in the web app environment

### API requests fail from the web app

Fix:

- Verify `CORS_ORIGIN` includes the exact production web domain

### Site data or dashboard counts do not match

Fix:

- Confirm all apps point to the same Supabase project
- Confirm no environment points at a local or stale database

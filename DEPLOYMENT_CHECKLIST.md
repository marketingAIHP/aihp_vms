# AIHP VMS Deployment Checklist

## STEP 1

### Git

Commands:

```powershell
git status
git pull
npm install
```

Verify:

- Working tree is clean enough for release
- Dependencies install successfully

## STEP 2

### Supabase

Everything to verify:

- Correct production project selected
- Auth enabled and production users exist
- `profiles` table exists
- `master_data` table exists
- `visits` table exists
- `notifications` table exists
- `audit_logs` table exists
- RLS enabled on production tables
- Storage bucket exists for visitor uploads
- Service role key is available only to server runtimes

Commands:

- Run [supabase/production_release.sql](C:/AIHP_visitor_management/supabase/production_release.sql) in the Supabase SQL Editor

## STEP 3

### Backend

Commands:

```powershell
npm --workspace apps/api run lint
npm --workspace apps/api run typecheck
npm --workspace apps/api run build
npm --workspace apps/api run start:prod
curl http://localhost:3000/health
```

Verify:

- Build succeeds
- Health endpoint responds
- Environment variables are present
- CORS includes the production web domain

## STEP 4

### Database

Commands:

```powershell
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate:deploy
```

Verify:

- Prisma client generates successfully
- Migrations deploy successfully
- Production database remains reachable

## STEP 5

### Prisma

Commands:

```powershell
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate:deploy
```

Verify:

- `apps/api/prisma/schema.prisma` matches the intended production model
- No migration drift is reported
- No emergency SQL is required beyond `supabase/production_release.sql`

## STEP 6

### Vercel

Commands:

```powershell
npm --workspace apps/web run lint
npm --workspace apps/web run typecheck
npm --workspace apps/web run build
npx vercel --prod
```

Verify:

- Production env vars are set
- `ENABLE_DEMO_AUTH=false`
- Admin login works
- Site Manager login works
- Dashboard loads
- Reports load
- Reception flow loads

## STEP 7

### Expo APK

Commands:

```powershell
npm --workspace apps/mobile run typecheck
npm --workspace apps/mobile run start
cd apps/mobile
eas build --platform android --profile production
# Use profile store instead when an AAB is required for Google Play.
```

Verify:

- Expo app opens
- Login works
- Dashboard works
- Camera opens
- QR flow works
- Notifications work

## STEP 8

### Production Testing

Complete end-to-end checklist:

- Admin can sign in on web
- Site Manager can sign in on web
- Mobile can sign in against the production Supabase project
- Reception flow opens from the login entry point
- Site selection works
- Check-In form submits successfully
- Photo upload works
- Visitor record appears in PostgreSQL
- Notifications are created
- Check-Out completes successfully
- Dashboard counts update after check-in and check-out
- Reports reflect live production data
- No demo login works in production
- No mock data appears anywhere in web or mobile

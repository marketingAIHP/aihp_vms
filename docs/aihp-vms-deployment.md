# AIHP VMS Deployment Guide

## Applications

- `apps/web`: Next.js 16 admin and host portal
- `apps/api`: NestJS backend scaffold
- `apps/mobile`: Expo mobile application

## Environment Variables

### Web app

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### API app

Create `apps/api/.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Database Setup

Run the enterprise schema from:

- [aihp_vms_enterprise.sql](/C:/AIHP_visitor_management/supabase/aihp_vms_enterprise.sql)

You can also run the earlier mobile-focused schema if you still need the Expo app.

## Local Development

Install dependencies:

```bash
npm install
```

Run the web portal:

```bash
npm run dev:web
```

Run the backend:

```bash
npm run dev:api
```

Run the mobile app:

```bash
npm run dev:mobile
```

## Production Build

Web portal:

```bash
npm --workspace apps/web run build
npm --workspace apps/web run start
```

## Recommended Hosting

- Web: Vercel or another Node-compatible Next.js platform
- Backend: Render, Railway, Fly.io, AWS ECS, or Azure App Service
- Database/Auth/Storage: Supabase

## Notes

- The current web portal includes working demo-mode credentials for admin and host.
- When Supabase credentials are configured, the login flow can use Supabase Auth.
- WhatsApp, SMS, and email delivery channels are represented in the system and should be connected to your chosen providers for production rollout.


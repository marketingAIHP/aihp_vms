# AIHP VMS

Monorepo for the AIHP Visitor Management System.

## Applications

- `apps/mobile`: Staff mobile app built on React Native, Expo Router, Zustand, and TanStack Query
- `apps/web`: Visitor website built on Next.js 15, Tailwind CSS, React Hook Form, and Zod
- `apps/api`: NestJS backend with Prisma-ready PostgreSQL foundation and JWT/refresh-token scaffolding

## Target Stack

- Staff Mobile App
  - React Native
  - Expo SDK 56
  - Expo Router
  - TypeScript
  - Zustand
  - TanStack Query
  - React Hook Form
  - Zod
  - NativeWind
  - Expo Camera
  - Expo Notifications

- Visitor Website
  - Next.js 15
  - TypeScript
  - Tailwind CSS
  - React Hook Form
  - Zod

- Backend
  - NestJS
  - TypeScript
  - Prisma ORM
  - PostgreSQL
  - JWT + Refresh Token

- Platform Services
  - Supabase Storage
  - Firebase Cloud Messaging
  - Vercel for web deployment
  - Docker / Railway / Render ready backend
  - Expo EAS build ready mobile app

## Run Locally

Install dependencies:

```bash
npm install
```

Start the mobile app:

```bash
npm run dev:mobile
```

Start the backend:

```bash
npm run dev:api
```

Start the web portal:

```bash
npm run dev:web
```

Open:

```text
http://localhost:3000
```

## Quality Checks

```bash
npm run typecheck:mobile
npm run typecheck:api
npm run typecheck:web
```

## Backend Foundation

- Prisma schema:
  - [schema.prisma](/C:/AIHP_visitor_management/apps/api/prisma/schema.prisma)

- API environment example:
  - [apps/api/.env.example](/C:/AIHP_visitor_management/apps/api/.env.example)

- Prisma/Nest integration:
  - [prisma.service.ts](/C:/AIHP_visitor_management/apps/api/src/prisma/prisma.service.ts)
  - [prisma.module.ts](/C:/AIHP_visitor_management/apps/api/src/prisma/prisma.module.ts)

## Existing Supabase Assets

The repo still contains Supabase-oriented schema and bootstrap utilities while the backend transitions toward Prisma + PostgreSQL:

- [aihp_vms_enterprise.sql](/C:/AIHP_visitor_management/supabase/aihp_vms_enterprise.sql)
- [bootstrap-supabase.mjs](/C:/AIHP_visitor_management/apps/api/scripts/bootstrap-supabase.mjs)

Deployment and environment notes:

- [aihp-vms-deployment.md](/C:/AIHP_visitor_management/docs/aihp-vms-deployment.md)
- [aihp-vms-api.md](/C:/AIHP_visitor_management/docs/aihp-vms-api.md)
# aihp_vms

# Stack Alignment

This repository is being aligned to the following implementation stack:

## Staff Mobile App

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

## Visitor Website

- Next.js 15
- TypeScript
- Tailwind CSS
- React Hook Form
- Zod

## Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT
- Refresh Token

## Platform Services

- Supabase Storage
- Firebase Cloud Messaging
- Vercel for web deployment
- Docker-ready backend
- Railway / Render ready backend
- Expo EAS build ready mobile app

## What Was Added

- Mobile TanStack Query provider scaffold
- Mobile package dependencies for React Hook Form, Zod, TanStack Query, and NativeWind
- Web package alignment toward Next.js 15
- API package cleanup to remove stray web/mobile dependencies
- Prisma schema scaffold for users, buildings, visits, notifications, and audit logs
- NestJS Prisma module/service foundation
- `.env.example` for API runtime and Prisma

## Migration Notes

- The current mobile and web apps still contain Supabase-backed flows.
- The current NestJS auth module still uses mock-token behavior and should be migrated next to Prisma + JWT + refresh tokens.
- Firebase Cloud Messaging is not wired yet; Expo Notifications remains the current mobile notification layer until the FCM bridge is implemented.

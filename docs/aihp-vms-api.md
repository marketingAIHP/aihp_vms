# AIHP VMS Web API

## Authentication

- `POST /auth/admin/login`
- `POST /auth/host/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`

The current web app uses secure HTTP-only session cookies, with Supabase Auth integration available when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.

## Admin Endpoints

- `GET /api/admin/overview`
- `GET /api/admin/visitors`
- `PATCH /api/admin/visitors/:id`
- `DELETE /api/admin/visitors/:id`
- `GET /api/admin/hosts`
- `POST /api/admin/hosts`
- `PATCH /api/admin/hosts/:id`
- `DELETE /api/admin/hosts/:id`
- `GET /api/admin/reports`
- `GET /api/admin/settings`
- `PATCH /api/admin/settings`

## Host Endpoints

- `GET /api/host/overview`
- `GET /api/host/visitors`
- `POST /api/host/invitations`
- `POST /api/host/invitations/:id/cancel`
- `GET /api/host/reports`
- `GET /api/host/profile`
- `PATCH /api/host/profile`

## Visit Lifecycle Endpoints

- `POST /api/visits/:id/check-in`
- `POST /api/visits/:id/check-out`

## Response Shape Notes

- All endpoints return JSON.
- Unauthorized access returns `401` with `{ "message": "Unauthorized" }`.
- Not-found mutations return `404` with a descriptive message.
- Export workflows are client-side in the current web app, using `jspdf`, `jspdf-autotable`, and `xlsx`.


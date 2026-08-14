# Visitor Management System API Outline

## Principles

- REST-first API design
- JWT-based authentication
- Role-based authorization on every protected endpoint
- Idempotency support for scan and check-in submissions where feasible
- Audit log on all mutating actions

## Authentication

### POST /auth/login

Authenticate user with email or username and password.

Request:

```json
{
  "email": "host@example.com",
  "password": "string"
}
```

Response:

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "expiresIn": 7200,
  "user": {
    "id": "uuid",
    "name": "Host User",
    "role": "host"
  }
}
```

### POST /auth/refresh

Refresh session token.

### POST /auth/logout

Revoke session.

## Master Data

### GET /sites
### GET /buildings
### GET /floors
### GET /rooms
### GET /visitor-categories

Return master data used by forms and filters.

## Host Visit Management

### POST /visits

Create a pre-registered visit.

### POST /visits/bulk

Create multiple visitor invitations in one request.

### GET /visits

List visits with filters:

- status
- date range
- building
- host
- visitor type

### GET /visits/:visitId

Get visit detail.

### PATCH /visits/:visitId

Update visit detail, reschedule, or correct visitor information.

### POST /visits/:visitId/cancel

Cancel a visit.

### POST /visits/:visitId/extend

Extend visit schedule.

## QR Pass

### POST /visits/:visitId/qr

Generate or regenerate a QR pass.

### GET /passes/:token/validate

Validate QR token before check-in.

Response example:

```json
{
  "valid": true,
  "visitId": "uuid",
  "status": "QR_SHARED",
  "visitorName": "John Doe",
  "hostName": "Jane Host"
}
```

## Reception Operations

### POST /reception/scan

Validate QR and fetch check-in context.

### GET /reception/search

Search by mobile, visitor name, or visit ID.

### POST /reception/walk-in

Create instant walk-in visit with mandatory live photo later in the flow.

### POST /reception/check-in

Submit verified arrival.

Request:

```json
{
  "visitId": "uuid",
  "scanTime": "2026-06-16T10:00:00Z",
  "checkInTime": "2026-06-16T10:02:00Z",
  "identityVerified": true,
  "consentCaptured": true,
  "photoUploadToken": "string"
}
```

### POST /reception/check-in/:visitId/photo-url

Return short-lived signed upload URL for live captured photo.

### POST /reception/check-out

Set exit time when exit workflow is introduced or manually recorded.

## Notifications

### GET /notifications

List current user notifications.

### POST /notifications/test

Admin-only test endpoint for push or provider verification.

## Live Monitoring

### GET /dashboard/live

Return current counters and active visit lists.

### GET /dashboard/live/stream

WebSocket or SSE upgrade endpoint for real-time updates.

## Reports

### POST /reports/generate

Create report generation job.

### GET /reports/jobs

List report jobs.

### GET /reports/jobs/:jobId

Get report job status.

### GET /reports/jobs/:jobId/download

Download generated file.

## Turnstile Integration

### POST /integrations/turnstile/access-request

Trigger gate access request after reception verification.

### GET /integrations/turnstile/events

Admin-only view of integration history.

## Admin

### CRUD Endpoints

- /users
- /roles
- /permissions
- /sites
- /buildings
- /floors
- /rooms

## Audit

### GET /audit-logs

Admin-only searchable audit log access.

## Suggested Status Codes

- 200 OK
- 201 Created
- 202 Accepted for async report jobs
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict for duplicate visitor or consumed QR
- 422 Unprocessable Entity for invalid visit state

## Suggested Core Visit Statuses

- DRAFT
- INVITED
- QR_SHARED
- ARRIVED
- VERIFIED
- CHECKED_IN
- ACCESS_GRANTED
- EXITED
- CANCELLED
- DENIED
- EXPIRED

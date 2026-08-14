# Visitor Management System Delivery Plan

## 1. Recommended Deliverables

Based on the collected discovery answers, the following artifacts should be produced and maintained:

1. BRD
2. SRS
3. FRD
4. User stories
5. Database design
6. ER diagram
7. API documentation
8. Architecture diagram
9. HLD
10. LLD
11. UI and UX flow
12. Screen list
13. Security architecture
14. Development plan
15. Sprint plan
16. Test plan
17. Deployment architecture
18. CI and CD strategy
19. Production readiness checklist

The current repository documentation covers the foundational technical artifacts required to begin planning and implementation.

## 2. Suggested MVP Screen List

- Splash and session restore
- Login
- Forgot password
- Host dashboard
- Create single visitor invite
- Create bulk visitor invite
- Visit detail
- Upcoming visits list
- Active visits list
- Notification center
- Reception dashboard
- QR scanner
- Search visit
- Walk-in registration
- Visitor verification
- Live photo capture
- Check-in success
- Admin dashboard
- Users and roles management
- Buildings and rooms management
- Reports and exports
- Audit logs
- Live monitoring dashboard

## 3. Suggested User Stories

### Host

- As a host, I want to pre-register a visitor so they can enter quickly.
- As a host, I want to send a WhatsApp QR pass so the visitor can present it at reception.
- As a host, I want to register multiple visitors at once so team visits are easier to manage.
- As a host, I want to reschedule or cancel a visit so the record remains accurate.

### Receptionist

- As a receptionist, I want to scan a QR and instantly see visit details so I can process arrivals quickly.
- As a receptionist, I want to capture a mandatory live photo before submitting check-in so verification is complete.
- As a receptionist, I want to create a walk-in visit so unregistered visitors can still be handled.
- As a receptionist, I want to search by name, mobile, or visit ID when a QR is unavailable.

### Admin

- As an admin, I want to manage users, sites, and buildings so the system stays current.
- As an admin, I want to monitor active visitors and incidents in real time so operations remain visible.
- As an admin, I want reports and audit logs so compliance and operations can be reviewed.

## 4. Suggested Sprint Plan

### Sprint 0

- Finalize requirement clarifications
- Confirm turnstile vendor and hosting model
- Prepare UX flows and design system
- Set up repositories, CI, environments, and coding standards

### Sprint 1

- Authentication
- Role-based navigation
- Master data foundations
- Host visitor creation flow

### Sprint 2

- QR generation
- WhatsApp share integration
- Visit listing and detail
- Duplicate detection

### Sprint 3

- Reception scanner
- Search flow
- Walk-in registration
- Camera capture and check-in submission

### Sprint 4

- Notifications
- Live dashboard
- Audit logs
- Core reports

### Sprint 5

- Turnstile adapter integration
- Offline queue and sync hardening
- Security and retention jobs
- UAT fixes and release preparation

## 5. Test Plan Overview

### Functional

- Authentication and session handling
- Role-based access restrictions
- Host invite lifecycle
- QR generation and one-time consumption
- Reception check-in with mandatory photo
- Walk-in registration
- Notifications and reminders
- Reports and exports

### Non-Functional

- Scan response time
- Sync behavior under poor connectivity
- Concurrent user behavior for 50-100 users
- Photo upload reliability
- Push notification latency

### Security

- Unauthorized access attempts
- PII masking and unmask controls
- Audit log completeness
- Token expiration and refresh
- Signed URL expiry

## 6. CI And CD Strategy

- GitHub Actions or equivalent
- Separate environments for dev, staging, and production
- Lint, type-check, unit tests, and API tests on every PR
- Mobile preview builds for QA
- Controlled backend deployment with environment-specific secrets
- Database migrations versioned and applied through CI pipeline

## 7. Production Readiness Checklist

- Environments provisioned
- Secrets managed securely
- Backups enabled
- Retention jobs configured
- Monitoring and alerts configured
- Crash reporting enabled
- Push and WhatsApp providers tested
- Audit logs validated
- Turnstile fallback behavior tested
- UAT signoff completed

## 8. Key Decisions To Confirm Before Build Starts

1. Whether kiosk mode is needed on reception tablets
2. Whether MFA is mandatory for admin accounts
3. Whether the web dashboard is MVP or phase 2
4. Which turnstile vendor and protocol will be integrated
5. Whether walk-in visitors require the same consent and ID flow as pre-registered visitors

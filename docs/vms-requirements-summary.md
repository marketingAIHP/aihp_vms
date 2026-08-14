# Visitor Management System Requirements Summary

## Project Overview

This document consolidates the requirement responses provided for the Visitor Management System (VMS) mobile application.

## Confirmed Business Scope

- Facility type: Corporate office
- Phase 1 buildings in scope: 28
- Tenants in scope: 1
- Average daily visitors: 10
- Peak daily visitors: 15
- Expected growth: 20-25% over 1 to 3 years
- Deployment model: Multi-site capable from day one
- Visitor categories: Yes, multiple categories such as guest, vendor, interviewee, contractor, delivery, auditor

## Confirmed Roles

- Admin
- Host
- Receptionist

Notes:
- No visitor mobile app is needed in phase 1
- Users cannot hold multiple roles
- Permissions should be configurable by admin

## Role Capability Summary

### Admin

- Full system administration
- User and role management
- Building and site configuration
- Reports and monitoring access
- Notification oversight
- Device and master-data administration

### Host

- Pre-register visitors
- Register multiple visitors in one invite
- Cancel and extend visits
- Receive alerts
- Approve at pre-registration stage
- Select building, floor, and meeting room from master data

### Receptionist

- Scan visitor QR
- Search visitor by mobile, name, or visit ID
- Edit visitor details on arrival if required
- Capture live visitor photo using camera only
- Create instant walk-in visits on arrival
- Manually verify identity document

## Application Scope

- Single Android app with role-based access
- Tablet support required
- iOS planned for later phase
- Offline or poor-network tolerance required for reception and gate flows

## Authentication

- Login method: Password-based login
- Hosts use corporate credentials
- Reception and admin users created by admin manually
- Session timeout: 2 hours
- No device binding requirement in phase 1

## Invitation And Visit Management

- All listed pre-registration fields are mandatory
- Multiple visitors can be registered in one invite
- Recurring visits are allowed, but each visit must have a separate QR
- Rescheduling and cancellation are required
- Duplicate detection should occur based on mobile, email, or ID

## QR Pass Rules

- QR validation: Dynamic server-side validation
- QR security: Signed and encrypted
- QR expiry: Valid until exit
- QR usage: One-time scan
- QR usage location: Reception only
- Pass sharing channel: WhatsApp
- Pass content: Branding, instructions, map, emergency contact, and terms

## Arrival And Verification

- Receptionist can scan or search visit
- Receptionist can edit details after scan
- Live photo capture is mandatory
- Gallery upload is not allowed
- Retake and image quality checks are required
- One photo per visit is sufficient
- Required timestamps: Scan time, check-in time, exit time
- Access approval after reception verification: Automatic

## Face And ID Verification

- Face workflow: Photo capture only in phase 1
- No face recognition, liveness, or AI verification required initially
- ID proof support: Any ID type
- ID capture mandatory for every visitor
- OCR not required
- ID image storage not required
- Receptionist performs manual verification and marks verification status
- Visitor consent capture is required for photo and ID processing

## Turnstile Integration

- Integration required in phase 1
- Access granted after reception verification
- Multiple gates and buildings supported

Open item:
- Turnstile vendor is not yet known

## Notifications

- Recipients: Host and admin
- Events: All major events including invite creation, QR sent, arrival, verification, access granted or denied, emergency, overdue visitor
- Channels:
  - App push for host and admin
  - WhatsApp for visitor pass delivery
- Reminder notifications required
- Host approvals handled inside app only

## Live Monitoring

- Dashboard should show all relevant statuses
- Mobile, tablet, and future web support expected
- Real-time updates preferred
- Search and filters required
- Security actions required from dashboard, such as deny access or flag incident

## Reporting

- Required reports:
  - Daily visitors
  - Weekly visitors
  - Monthly visitors
  - Visitors by tenant
  - Visitors by purpose
  - Active visitors
  - Visitor history
  - Security logs
  - Reception logs
- Filters: All major filters including date, tenant, building, floor, host, visitor type, purpose, status
- Exports: PDF, Excel, CSV
- Report generation: On-demand and scheduled
- Report access: Admin and host

## Data Retention And Scale

- Visitor data retention: 1 year
- Photo retention: 1 month
- Audit log retention: 1 year
- Reporting workload: Not expected to be heavy
- Storage growth estimate provided: About 5,000 image or document units per year

## Technology Preferences

- Mobile: React Native + Expo
- Backend: Node.js
- Database: Supabase PostgreSQL
- Storage: Supabase Storage

## Security Preferences

- Field-level encryption required for mobile, email, ID number, and images
- Full audit trail required
- Consent capture required

## Important Open Questions

These items were not fully finalized and should be confirmed before implementation starts:

1. Kiosk mode requirement for reception tablets
2. Need for MFA, especially for admin users
3. Turnstile vendor and protocol
4. Whether live monitoring is needed for a dedicated Security Admin role in phase 1
5. Exact legal treatment for storing ID numbers and any regulatory constraints
6. Whether the future web dashboard is part of MVP or phase 2
7. Exact cloud hosting boundary if Supabase managed services are used

## Recommended Assumptions For Phase 1

- Use a single Expo Android application for admin, host, and receptionist
- Provide real-time updates via WebSocket-compatible subscriptions
- Implement limited offline support with local queueing for scan and check-in actions
- Treat turnstile integration through an adapter layer so vendor choice can change later
- Use masked PII by default, with unmask permission restricted to admin only

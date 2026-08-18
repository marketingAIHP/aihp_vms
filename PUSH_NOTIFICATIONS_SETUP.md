# Real-Time and Android Push Notification Setup

The application code is prepared for:

- Supabase Realtime updates while Web or Android is open
- Android system notifications while the standalone app is backgrounded or closed
- Authenticated push-token registration and deactivation
- Generic lock-screen content to avoid exposing visitor details

## 1. Apply the Supabase SQL

Open Supabase Dashboard > SQL Editor for project `ggzwybpjqvytzeerdldm` and run:

`supabase/realtime_push_notifications.sql`

This creates the protected `push_tokens` table and RPCs and enables Realtime for `notifications` and `visits`.

## 2. Create the Firebase Android App

1. Open Firebase Console and create or select the production Firebase project.
2. Add an Android application with package name:

   `com.aihp.visitormanagementsystem`

3. Download `google-services.json` into `apps/mobile` temporarily.
4. In Firebase Project Settings > Service Accounts, generate a private service-account JSON key.
5. Never commit the private service-account key. Store it in a password manager after uploading it to EAS.

## 3. Upload Firebase Configuration to EAS

From `apps/mobile`, upload `google-services.json` as a File environment variable:

```powershell
cd C:\AIHP_visitor_management\apps\mobile
eas env:create production --name GOOGLE_SERVICES_JSON --value .\google-services.json --type file --visibility secret --force
```

Upload the Firebase service-account key for FCM V1:

```powershell
eas credentials
```

Choose:

1. Android
2. production
3. Google Service Account
4. Manage Google Service Account Key for Push Notifications (FCM V1)
5. Upload a new service account key

The Firebase service account and `google-services.json` must belong to the same Firebase project.

## 4. Configure the Supabase Push Function

Generate a random secret and retain it temporarily:

```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$pushWebhookSecret = [Convert]::ToHexString($bytes).ToLowerInvariant()
```

Store it as a Supabase Edge Function secret:

```powershell
cd C:\AIHP_visitor_management
npx supabase secrets set PUSH_WEBHOOK_SECRET=$pushWebhookSecret --project-ref ggzwybpjqvytzeerdldm
```

Deploy the function:

```powershell
npx supabase functions deploy send-push-notification --no-verify-jwt --project-ref ggzwybpjqvytzeerdldm
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically by hosted Supabase Edge Functions. Do not attempt to set reserved `SUPABASE_` variables manually.

## 5. Create the Database Webhook

In Supabase Dashboard > Database > Webhooks, create:

- Name: `notifications-push`
- Schema: `public`
- Table: `notifications`
- Event: `INSERT`
- Method: `POST`
- URL: `https://ggzwybpjqvytzeerdldm.supabase.co/functions/v1/send-push-notification`
- Header `Content-Type`: `application/json`
- Header `x-webhook-secret`: use the value in `$pushWebhookSecret`

After saving the webhook, remove `$pushWebhookSecret` from the terminal session:

```powershell
Remove-Variable pushWebhookSecret
```

## 6. Build and Test

Build a new APK because remote push notifications do not work in Expo Go:

```powershell
cd C:\AIHP_visitor_management\apps\mobile
eas build --platform android --profile production
```

Install the APK, sign in, and allow notifications. Confirm a row appears in `public.push_tokens` for the signed-in user. Complete a visitor check-in and verify:

1. The Web and open Android screens refresh without manual reload.
2. Android receives a system notification in the background.
3. Tapping it opens the role-appropriate Notifications screen.
4. Signing out marks the device token inactive.


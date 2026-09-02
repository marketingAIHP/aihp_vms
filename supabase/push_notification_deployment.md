# Enable APK push notifications

The mobile app registers each signed-in device in `public.push_tokens`. To deliver
notifications while the app is backgrounded or closed, complete these production
steps once in the Supabase project.

1. Run [realtime_push_notifications.sql](./realtime_push_notifications.sql) in
   the Supabase SQL Editor.
2. Deploy the `send-push-notification` Edge Function and set its
   `PUSH_WEBHOOK_SECRET` environment variable to a new long random value.
3. In **Database > Webhooks**, create a webhook with these values:
   - Table: `public.notifications`
   - Events: `INSERT`
   - Method: `POST`
   - URL: `https://ggzwybpjqvytzeerdldm.supabase.co/functions/v1/send-push-notification`
   - Header: `x-webhook-secret: <the same PUSH_WEBHOOK_SECRET value>`
4. Install the latest APK/OTA, sign in, and allow notifications when Android asks.

The function sends only to push tokens for the targeted user or roles. The app
also refreshes and shows a foreground alert when a notification is inserted.

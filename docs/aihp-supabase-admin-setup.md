# AIHP VMS Supabase Setup

1. Open Supabase SQL Editor and run [supabase/aihp_mobile_production.sql](/C:/AIHP_visitor_management/supabase/aihp_mobile_production.sql).
2. Add your Expo env values in `apps/mobile/.env`:
   - `EXPO_PUBLIC_SUPABASE_URL=...`
   - `EXPO_PUBLIC_SUPABASE_KEY=...`
3. Seed master data with:
   - `npm --workspace apps/api run bootstrap:supabase`
4. Deploy the admin staff-creation function:
   - `supabase functions deploy admin-create-user`
   - In Supabase project secrets, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY`

## Create the first admin

1. Go to Supabase Dashboard -> Authentication -> Users -> Add user.
2. Create the admin email and password.
3. Run this SQL with that user's UUID:

```sql
update public.profiles
set
  role = 'admin',
  full_name = 'Your Admin Name',
  company_name = 'AIHP',
  is_active = true
where id = 'PASTE_ADMIN_USER_ID_HERE';
```

Only users marked `role = 'admin'` in `public.profiles` will be treated as admins by the app.

## Create host and receptionist accounts

After the function is deployed, create them from the mobile admin dashboard using the `Create User` flow.

Admin creation stays manual in Supabase. Host and receptionist creation moves through the protected admin function.

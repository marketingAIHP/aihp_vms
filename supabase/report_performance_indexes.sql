-- Report and dashboard query performance indexes.
-- Run once in the Supabase SQL Editor for the production project.

create index if not exists visits_checked_in_at_desc_idx
  on public.visits (checked_in_at desc)
  where checked_in_at is not null;

create index if not exists visits_building_checked_in_at_desc_idx
  on public.visits (building, checked_in_at desc)
  where checked_in_at is not null;

create index if not exists visits_host_user_checked_in_at_desc_idx
  on public.visits (host_user_id, checked_in_at desc)
  where checked_in_at is not null;

create index if not exists visits_checked_out_at_idx
  on public.visits (checked_in_at desc)
  where exited_at is not null;

-- Used by the mobile app's initial recent-visits load.
create index if not exists visits_scheduled_at_desc_idx
  on public.visits (scheduled_at desc);

-- Avoid scanning the profiles table whenever a web route resolves the signed-in user.
create index if not exists profiles_email_idx
  on public.profiles (email)
  where email is not null;

-- Used by compact dashboard count queries.
create index if not exists visits_checked_in_active_idx
  on public.visits (checked_in_at)
  where status = 'CHECKED_IN' and exited_at is null;

create index if not exists visits_exited_at_idx
  on public.visits (exited_at)
  where exited_at is not null;
